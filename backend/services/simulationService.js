import { query } from '../config/database.js';
import calibrationService from './calibrationService.js';

export class SimulationService {
  
  async runMonteCarloSimulation(countryCode, shockType, shockMagnitude, policyMix, iterations = 1000, userId) {
    console.log(`Running Monte Carlo simulation: ${iterations} iterations`);

    const coefficients = await calibrationService.getCalibrationCoefficients(countryCode);
    const baselineData = await this.getBaselineValues(countryCode);
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const simulation = this.runSingleSimulation(
        baselineData,
        coefficients,
        shockType,
        shockMagnitude,
        policyMix
      );
      results.push(simulation);
    }

    const analysis = this.analyzeResults(results);
    await this.storeSimulationRun(countryCode, shockType, shockMagnitude, policyMix, iterations, analysis, userId);

    return analysis;
  }

  runSingleSimulation(baseline, coefficients, shockType, shockMagnitude, policyMix) {
    const state = { ...baseline };
    const volatility = {
      GDP: 0.02,
      INFLATION: 0.03,
      UNEMPLOYMENT: 0.015,
      DEBT_GDP: 0.01,
      INTEREST_RATE: 0.005
    };

    // Apply shock
    if (shockType === 'financial_crisis') {
      state.GDP *= (1 + shockMagnitude / 100);
      state.UNEMPLOYMENT *= (1 - shockMagnitude / 100);
    } else if (shockType === 'supply_shock') {
      state.INFLATION *= (1 - shockMagnitude / 100);
      state.GDP *= (1 + shockMagnitude / 200);
    } else if (shockType === 'debt_crisis') {
      state.DEBT_GDP *= (1 - shockMagnitude / 100);
      state.INTEREST_RATE *= (1 - shockMagnitude / 200);
    }

    // Apply policies
    if (policyMix) {
      policyMix.forEach(policy => {
        if (policy.type === 'rate_cut') {
          state.INTEREST_RATE *= (1 - policy.magnitude / 100);
        } else if (policy.type === 'fiscal_stimulus') {
          state.GDP *= (1 + policy.magnitude / 100);
          state.DEBT_GDP *= (1 + policy.magnitude / 200);
        }
      });
    }

    // Propagate through network (24 timesteps)
    for (let t = 0; t < 24; t++) {
      const changes = {};

      coefficients.forEach(coef => {
        const sourceValue = state[coef.from_indicator];
        const targetValue = state[coef.to_indicator];
        const noise = (Math.random() - 0.5) * 2 * volatility[coef.to_indicator];
        const change = coef.coefficient * sourceValue * 0.01 + noise;
        changes[coef.to_indicator] = (changes[coef.to_indicator] || 0) + change;
      });

      Object.keys(changes).forEach(key => {
        state[key] += changes[key];
      });
    }

    return state;
  }

  analyzeResults(results) {
    const metrics = ['GDP', 'INFLATION', 'UNEMPLOYMENT', 'DEBT_GDP'];
    const analysis = {};

    metrics.forEach(metric => {
      const values = results.map(r => r[metric]).sort((a, b) => a - b);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      analysis[metric] = {
        mean,
        variance,
        stdDev,
        ci_lower: values[Math.floor(values.length * 0.05)],
        ci_upper: values[Math.floor(values.length * 0.95)],
        worst_case: values[Math.floor(values.length * 0.01)],
        best_case: values[Math.floor(values.length * 0.99)]
      };
    });

    // Calculate collapse probability
    const collapseThreshold = results[0].GDP * 0.85;
    const collapseCount = results.filter(r => r.GDP < collapseThreshold).length;
    analysis.collapse_probability = collapseCount / results.length;

    // Calculate stability score
    const gdpDeviation = Math.abs(analysis.GDP.mean - results[0].GDP) / results[0].GDP;
    const inflationDeviation = Math.abs(analysis.INFLATION.mean - results[0].INFLATION) / results[0].INFLATION;
    analysis.stability_score = Math.max(0, 100 - (gdpDeviation * 100 + inflationDeviation * 50));

    return analysis;
  }

  async getBaselineValues(countryCode) {
    const currentYear = new Date().getFullYear() - 1;
    const indicators = ['GDP', 'INFLATION', 'UNEMPLOYMENT', 'DEBT_GDP', 'INTEREST_RATE'];
    const baseline = {};

    for (const indicator of indicators) {
      const result = await query(`
        SELECT hv.value
        FROM historical_values hv
        JOIN countries c ON hv.country_id = c.id
        JOIN macro_indicators mi ON hv.indicator_id = mi.id
        WHERE c.code = $1 AND mi.code = $2 AND hv.year = $3
      `, [countryCode, indicator, currentYear]);

      if (result.rows[0]) {
        baseline[indicator] = parseFloat(result.rows[0].value);
      }
    }

    return baseline;
  }

  async storeSimulationRun(countryCode, shockType, shockMagnitude, policyMix, iterations, analysis, userId) {
    const countryResult = await query('SELECT id FROM countries WHERE code = $1', [countryCode]);
    if (!countryResult.rows[0]) return;

    await query(`
      INSERT INTO simulation_runs 
        (country_id, shock_type, shock_magnitude, policy_mix, iterations, 
         mean_gdp_change, mean_inflation_change, mean_unemployment_change, 
         collapse_probability, stability_score, confidence_interval, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      countryResult.rows[0].id,
      shockType,
      shockMagnitude,
      JSON.stringify(policyMix),
      iterations,
      analysis.GDP.mean,
      analysis.INFLATION.mean,
      analysis.UNEMPLOYMENT.mean,
      analysis.collapse_probability,
      analysis.stability_score,
      JSON.stringify({
        gdp: [analysis.GDP.ci_lower, analysis.GDP.ci_upper],
        inflation: [analysis.INFLATION.ci_lower, analysis.INFLATION.ci_upper]
      }),
      userId,
    ]);
  }
}

export default new SimulationService();
