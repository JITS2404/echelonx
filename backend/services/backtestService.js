import { query } from '../config/database.js';
import calibrationService from './calibrationService.js';

export class BacktestService {
  
  async runBacktest(countryCode, shockYear, shockType, userId) {
    console.log(`Running backtest for ${countryCode} - ${shockYear} ${shockType}`);

    const preShockData = await this.getYearData(countryCode, shockYear - 1);
    const actualData = await this.getYearData(countryCode, shockYear + 3);
    const coefficients = await calibrationService.getCalibrationCoefficients(countryCode);
    const predicted = this.predictOutcome(preShockData, coefficients, shockType);
    const metrics = this.calculateErrorMetrics(predicted, actualData);
    await this.storeBacktestResults(countryCode, shockYear, shockType, predicted, actualData, metrics, userId);

    return { shockYear, shockType, predicted, actual: actualData, metrics };
  }

  async getYearData(countryCode, year) {
    const indicators = ['GDP', 'INFLATION', 'UNEMPLOYMENT', 'DEBT_GDP', 'INTEREST_RATE'];
    const data = {};

    for (const indicator of indicators) {
      const result = await query(`
        SELECT hv.value
        FROM historical_values hv
        JOIN countries c ON hv.country_id = c.id
        JOIN macro_indicators mi ON hv.indicator_id = mi.id
        WHERE c.code = $1 AND mi.code = $2 AND hv.year = $3
      `, [countryCode, indicator, year]);

      if (result.rows[0]) {
        data[indicator] = parseFloat(result.rows[0].value);
      }
    }

    return data;
  }

  predictOutcome(baselineData, coefficients, shockType) {
    const state = { ...baselineData };

    // Apply historical shock magnitude
    const shockMagnitudes = {
      'financial_crisis': -25,
      'supply_shock': 15,
      'debt_crisis': 30
    };

    const magnitude = shockMagnitudes[shockType] || -10;

    if (shockType === 'financial_crisis') {
      state.GDP *= (1 + magnitude / 100);
      state.UNEMPLOYMENT *= (1 - magnitude / 100);
    } else if (shockType === 'supply_shock') {
      state.INFLATION *= (1 - magnitude / 100);
    } else if (shockType === 'debt_crisis') {
      state.DEBT_GDP *= (1 - magnitude / 100);
    }

    // Propagate for 36 months (3 years)
    for (let t = 0; t < 36; t++) {
      const changes = {};

      coefficients.forEach(coef => {
        const sourceValue = state[coef.from_indicator];
        const change = coef.coefficient * sourceValue * 0.01;
        changes[coef.to_indicator] = (changes[coef.to_indicator] || 0) + change;
      });

      Object.keys(changes).forEach(key => {
        state[key] += changes[key];
      });
    }

    return state;
  }

  calculateErrorMetrics(predicted, actual) {
    const indicators = ['GDP', 'INFLATION', 'UNEMPLOYMENT', 'DEBT_GDP'];
    let sumSquaredError = 0;
    let sumAbsPercentError = 0;
    let sumDeviation = 0;
    let count = 0;

    indicators.forEach(indicator => {
      if (predicted[indicator] && actual[indicator]) {
        const error = predicted[indicator] - actual[indicator];
        const percentError = Math.abs(error / actual[indicator]) * 100;
        
        sumSquaredError += error * error;
        sumAbsPercentError += percentError;
        sumDeviation += error;
        count++;
      }
    });

    return {
      rmse: Math.sqrt(sumSquaredError / count),
      mape: sumAbsPercentError / count,
      mean_deviation: sumDeviation / count
    };
  }

  async storeBacktestResults(countryCode, shockYear, shockType, predicted, actual, metrics, userId) {
    const countryResult = await query('SELECT id FROM countries WHERE code = $1', [countryCode]);
    if (!countryResult.rows[0]) return;

    await query(`
      INSERT INTO backtest_results 
        (country_id, shock_year, shock_type, predicted_values, actual_values, rmse, mape, mean_deviation, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      countryResult.rows[0].id,
      shockYear,
      shockType,
      JSON.stringify(predicted),
      JSON.stringify(actual),
      metrics.rmse,
      metrics.mape,
      metrics.mean_deviation,
      userId,
    ]);
  }

  // Returns only backtest results owned by the requesting user
  async getBacktestHistory(countryCode, userId) {
    const result = await query(`
      SELECT 
        br.id,
        br.shock_year,
        br.shock_type,
        br.rmse,
        br.mape,
        br.mean_deviation,
        br.created_at
      FROM backtest_results br
      JOIN countries c ON br.country_id = c.id
      WHERE c.code = $1
        AND (br.user_id = $2 OR br.user_id IS NULL)
      ORDER BY br.shock_year DESC
    `, [countryCode, userId]);

    return result.rows;
  }
}

export default new BacktestService();
