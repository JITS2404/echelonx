import { describe, it, expect } from 'vitest';
import { SimulationOrchestrator } from '@/engine';
import { 
  developedEconomyNodes, 
  developedEconomyEdges, 
  availablePolicies,
  predefinedShocks 
} from '@/engine/economyModels';

describe('Simulation Engine', () => {
  it('should initialize orchestrator', () => {
    const orchestrator = new SimulationOrchestrator(
      developedEconomyNodes,
      developedEconomyEdges,
      availablePolicies
    );
    expect(orchestrator).toBeDefined();
  });

  it('should run financial crisis scenario', () => {
    const orchestrator = new SimulationOrchestrator(
      developedEconomyNodes,
      developedEconomyEdges,
      availablePolicies
    );

    const result = orchestrator.runScenario(
      predefinedShocks.financial_crisis,
      [],
      24
    );

    expect(result.states).toHaveLength(24);
    expect(result.finalStability).toBeGreaterThanOrEqual(0);
    expect(result.finalStability).toBeLessThanOrEqual(100);
    expect(result.regime.regime).toBeDefined();
  });

  it('should apply policy interventions', () => {
    const orchestrator = new SimulationOrchestrator(
      developedEconomyNodes,
      developedEconomyEdges,
      availablePolicies
    );

    const withoutPolicy = orchestrator.runScenario(
      predefinedShocks.financial_crisis,
      [],
      24
    );

    const withPolicy = orchestrator.runScenario(
      predefinedShocks.financial_crisis,
      [availablePolicies[1]], // Rate cut 150bp
      24
    );

    expect(withPolicy.finalStability).toBeGreaterThan(withoutPolicy.finalStability);
  });

  it('should run Monte Carlo analysis', () => {
    const orchestrator = new SimulationOrchestrator(
      developedEconomyNodes,
      developedEconomyEdges,
      availablePolicies
    );

    const mcResult = orchestrator.runMonteCarloAnalysis(
      predefinedShocks.supply_shock,
      [],
      24,
      100 // Reduced for test speed
    );

    expect(mcResult.mean).toHaveLength(24);
    expect(mcResult.confidence_interval[0]).toHaveLength(24);
    expect(mcResult.confidence_interval[1]).toHaveLength(24);
    expect(mcResult.collapse_probability).toBeGreaterThanOrEqual(0);
    expect(mcResult.collapse_probability).toBeLessThanOrEqual(1);
  });

  it('should optimize policies under constraints', () => {
    const orchestrator = new SimulationOrchestrator(
      developedEconomyNodes,
      developedEconomyEdges,
      availablePolicies
    );

    const optimized = orchestrator.optimizePolicies(
      predefinedShocks.debt_crisis,
      {
        maxBudget: 500,
        maxInflation: 0.05,
        maxDebt: 0.10
      }
    );

    expect(optimized.policy_mix).toBeDefined();
    expect(optimized.delta_gdp).toBeDefined();
    expect(optimized.composite_risk).toBeGreaterThanOrEqual(0);
    expect(optimized.composite_risk).toBeLessThanOrEqual(100);
  });
});
