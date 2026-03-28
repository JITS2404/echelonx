import { query } from '../config/database.js';

export class CalibrationService {
  
  async getHistoricalData(countryCode, indicatorCode, startYear, endYear) {
    const result = await query(`
      SELECT hv.year, hv.value
      FROM historical_values hv
      JOIN countries c ON hv.country_id = c.id
      JOIN macro_indicators mi ON hv.indicator_id = mi.id
      WHERE c.code = $1 AND mi.code = $2 
        AND hv.year >= $3 AND hv.year <= $4
      ORDER BY hv.year
    `, [countryCode, indicatorCode, startYear, endYear]);
    return result.rows;
  }

  calculateCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  linearRegression(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const predictions = x.map(xi => slope * xi + intercept);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - predictions[i], 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    // Calculate standard error
    const residuals = y.map((yi, i) => yi - predictions[i]);
    const variance = residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2);
    const stdError = Math.sqrt(variance / sumX2);

    return { slope, intercept, rSquared, stdError };
  }

  async generateCorrelationMatrix(countryCode, startYear, endYear) {
    const indicators = ['GDP', 'INFLATION', 'UNEMPLOYMENT', 'DEBT_GDP', 'INTEREST_RATE'];
    const data = {};

    for (const indicator of indicators) {
      const values = await this.getHistoricalData(countryCode, indicator, startYear, endYear);
      data[indicator] = values.map(v => parseFloat(v.value));
    }

    const matrix = {};
    for (const ind1 of indicators) {
      matrix[ind1] = {};
      for (const ind2 of indicators) {
        if (data[ind1].length === data[ind2].length) {
          matrix[ind1][ind2] = this.calculateCorrelation(data[ind1], data[ind2]);
        }
      }
    }

    return matrix;
  }

  async calibrateModel(countryCode, startYear, endYear, userId) {
    console.log(`Calibrating model for ${countryCode} (${startYear}-${endYear})...`);

    const indicators = ['GDP', 'INFLATION', 'UNEMPLOYMENT', 'DEBT_GDP', 'INTEREST_RATE'];
    const data = {};

    for (const indicator of indicators) {
      const values = await this.getHistoricalData(countryCode, indicator, startYear, endYear);
      data[indicator] = values.map(v => parseFloat(v.value));
    }

    const countryResult = await query('SELECT id FROM countries WHERE code = $1', [countryCode]);
    const countryId = countryResult.rows[0].id;

    const coefficients = [];

    if (data.GDP.length > 0) {
      const gdpInflation = this.linearRegression(data.INFLATION, data.GDP);
      await this.storeCoefficient(countryId, 'INFLATION', 'GDP', gdpInflation, userId);
      coefficients.push({ from: 'INFLATION', to: 'GDP', ...gdpInflation });

      const gdpInterest = this.linearRegression(data.INTEREST_RATE, data.GDP);
      await this.storeCoefficient(countryId, 'INTEREST_RATE', 'GDP', gdpInterest, userId);
      coefficients.push({ from: 'INTEREST_RATE', to: 'GDP', ...gdpInterest });

      const gdpDebt = this.linearRegression(data.DEBT_GDP, data.GDP);
      await this.storeCoefficient(countryId, 'DEBT_GDP', 'GDP', gdpDebt, userId);
      coefficients.push({ from: 'DEBT_GDP', to: 'GDP', ...gdpDebt });
    }

    if (data.UNEMPLOYMENT.length > 0 && data.GDP.length > 0) {
      const unemploymentGdp = this.linearRegression(data.GDP, data.UNEMPLOYMENT);
      await this.storeCoefficient(countryId, 'GDP', 'UNEMPLOYMENT', unemploymentGdp, userId);
      coefficients.push({ from: 'GDP', to: 'UNEMPLOYMENT', ...unemploymentGdp });
    }

    if (data.INFLATION.length > 0 && data.INTEREST_RATE.length > 0) {
      const inflationInterest = this.linearRegression(data.INTEREST_RATE, data.INFLATION);
      await this.storeCoefficient(countryId, 'INTEREST_RATE', 'INFLATION', inflationInterest, userId);
      coefficients.push({ from: 'INTEREST_RATE', to: 'INFLATION', ...inflationInterest });
    }

    console.log(`Calibration complete for ${countryCode}`);
    return coefficients;
  }

  async storeCoefficient(countryId, fromIndicator, toIndicator, regression, userId) {
    const fromResult = await query('SELECT id FROM macro_indicators WHERE code = $1', [fromIndicator]);
    const toResult = await query('SELECT id FROM macro_indicators WHERE code = $1', [toIndicator]);

    if (!fromResult.rows[0] || !toResult.rows[0]) return;

    await query(`
      INSERT INTO model_coefficients 
        (country_id, from_indicator_id, to_indicator_id, coefficient, std_error, r_squared, confidence_level, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (country_id, from_indicator_id, to_indicator_id)
      DO UPDATE SET 
        coefficient = $4, 
        std_error = $5, 
        r_squared = $6, 
        confidence_level = $7,
        user_id = $8,
        calibration_date = CURRENT_TIMESTAMP
    `, [
      countryId,
      fromResult.rows[0].id,
      toResult.rows[0].id,
      regression.slope,
      regression.stdError,
      regression.rSquared,
      regression.rSquared > 0.5 ? 0.95 : 0.80,
      userId,
    ]);
  }

  // Returns coefficients owned by this user, falling back to system coefficients (user_id IS NULL)
  async getCalibrationCoefficients(countryCode, userId) {
    const result = await query(`
      SELECT 
        mi1.code as from_indicator,
        mi2.code as to_indicator,
        mc.coefficient,
        mc.r_squared,
        mc.confidence_level
      FROM model_coefficients mc
      JOIN countries c ON mc.country_id = c.id
      JOIN macro_indicators mi1 ON mc.from_indicator_id = mi1.id
      JOIN macro_indicators mi2 ON mc.to_indicator_id = mi2.id
      WHERE c.code = $1
        AND (mc.user_id = $2 OR mc.user_id IS NULL)
    `, [countryCode, userId]);

    return result.rows;
  }
}

export default new CalibrationService();
