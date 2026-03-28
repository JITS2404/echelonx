/**
 * Demo Script - Macroeconomic Simulation Engine
 * 
 * This script demonstrates the core capabilities of the simulation engine.
 * Run this in the browser console or create a demo page.
 */

import { SimulationOrchestrator } from './engine';
import { 
  developedEconomyNodes, 
  developedEconomyEdges, 
  availablePolicies,
  predefinedShocks 
} from './engine/economyModels';

export function runDemo() {
  console.log('=== MACROECONOMIC SIMULATION ENGINE DEMO ===\n');

  // Initialize
  const orchestrator = new SimulationOrchestrator(
    developedEconomyNodes,
    developedEconomyEdges,
    availablePolicies
  );

  // DEMO 1: Baseline Financial Crisis
  console.log('1️⃣ FINANCIAL CRISIS - BASELINE (No Intervention)');
  const baseline = orchestrator.runScenario(
    predefinedShocks.financial_crisis,
    [],
    24
  );
  console.log(`   Stability Index: ${baseline.finalStability.toFixed(2)}/100`);
  console.log(`   Regime: ${baseline.regime.regime} (${(baseline.regime.confidence * 100).toFixed(1)}% confidence)`);
  console.log(`   Status: ${baseline.finalStability >= 70 ? '✅ Stable' : baseline.finalStability >= 40 ? '⚠️ Stressed' : '🚨 Collapse Risk'}\n`);

  // DEMO 2: With Rate Cut Policy
  console.log('2️⃣ FINANCIAL CRISIS - WITH RATE CUT 150bp');
  const withRateCut = orchestrator.runScenario(
    predefinedShocks.financial_crisis,
    [availablePolicies[1]], // Rate cut 150bp
    24
  );
  console.log(`   Stability Index: ${withRateCut.finalStability.toFixed(2)}/100`);
  console.log(`   Improvement: +${(withRateCut.finalStability - baseline.finalStability).toFixed(2)} points`);
  console.log(`   Regime: ${withRateCut.regime.regime}\n`);

  // DEMO 3: With Fiscal Stimulus
  console.log('3️⃣ FINANCIAL CRISIS - WITH FISCAL STIMULUS');
  const withFiscal = orchestrator.runScenario(
    predefinedShocks.financial_crisis,
    [availablePolicies[2]], // Fiscal stimulus
    24
  );
  console.log(`   Stability Index: ${withFiscal.finalStability.toFixed(2)}/100`);
  console.log(`   Improvement: +${(withFiscal.finalStability - baseline.finalStability).toFixed(2)} points`);
  console.log(`   Regime: ${withFiscal.regime.regime}\n`);

  // DEMO 4: Monte Carlo Analysis
  console.log('4️⃣ MONTE CARLO ANALYSIS (1000 iterations)');
  console.log('   Running stochastic simulations...');
  const mcResult = orchestrator.runMonteCarloAnalysis(
    predefinedShocks.supply_shock,
    [],
    24,
    1000
  );
  console.log(`   Mean GDP (final): ${mcResult.mean[23].toFixed(2)}T`);
  console.log(`   90% CI: [${mcResult.confidence_interval[0][23].toFixed(2)}, ${mcResult.confidence_interval[1][23].toFixed(2)}]`);
  console.log(`   Worst Case: ${mcResult.worst_case[23].toFixed(2)}T`);
  console.log(`   Collapse Probability: ${(mcResult.collapse_probability * 100).toFixed(1)}%\n`);

  // DEMO 5: Policy Optimization
  console.log('5️⃣ AI-OPTIMIZED POLICY MIX');
  console.log('   Running evolutionary optimization...');
  const optimized = orchestrator.optimizePolicies(
    predefinedShocks.debt_crisis,
    {
      maxBudget: 500,
      maxInflation: 0.05,
      maxDebt: 0.10
    }
  );
  console.log(`   Optimal Policies: ${optimized.policy_mix.map(p => p.name).join(', ')}`);
  console.log(`   Expected GDP Change: ${optimized.delta_gdp > 0 ? '+' : ''}${optimized.delta_gdp.toFixed(2)}%`);
  console.log(`   Expected Inflation: ${optimized.delta_inflation > 0 ? '+' : ''}${optimized.delta_inflation.toFixed(2)}%`);
  console.log(`   Expected Unemployment: ${optimized.delta_unemployment > 0 ? '+' : ''}${optimized.delta_unemployment.toFixed(2)}%`);
  console.log(`   Composite Risk: ${optimized.composite_risk.toFixed(2)}/100`);
  console.log(`   Stabilization Time: ${optimized.stabilization_time} months\n`);

  // DEMO 6: Scenario Comparison
  console.log('6️⃣ SCENARIO RANKING');
  const scenarios = [
    { name: 'Baseline', result: baseline },
    { name: 'Rate Cut 150bp', result: withRateCut },
    { name: 'Fiscal Stimulus', result: withFiscal }
  ];
  
  scenarios.sort((a, b) => b.result.finalStability - a.result.finalStability);
  
  scenarios.forEach((scenario, index) => {
    console.log(`   ${index + 1}. ${scenario.name}: ${scenario.result.finalStability.toFixed(2)}/100`);
  });

  console.log('\n=== DEMO COMPLETE ===');
  console.log('This engine provides:');
  console.log('✅ Multi-layer shock propagation');
  console.log('✅ Causal sector interdependencies');
  console.log('✅ Monte Carlo stochastic projections');
  console.log('✅ Regime state detection');
  console.log('✅ Budget-constrained optimization');
  console.log('✅ Quantified systemic risk');
  
  return {
    baseline,
    withRateCut,
    withFiscal,
    mcResult,
    optimized
  };
}

// Export for use in components
export default runDemo;
