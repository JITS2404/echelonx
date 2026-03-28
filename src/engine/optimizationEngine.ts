import { EconomicGraph } from './economicGraph';
import { PropagationEngine } from './propagationEngine';
import { StabilityCalculator } from './stabilityCalculator';
import { Policy, Shock, OptimizationResult } from './types';

interface Constraints {
  maxBudget: number;
  maxInflation: number;
  maxDebt: number;
}

export class OptimizationEngine {
  private availablePolicies: Policy[];
  private baseGraph: EconomicGraph;
  private stabilityCalc: StabilityCalculator;

  constructor(graph: EconomicGraph, policies: Policy[]) {
    this.baseGraph = graph;
    this.availablePolicies = policies;
    this.stabilityCalc = new StabilityCalculator();
  }

  optimize(
    shock: Shock,
    constraints: Constraints,
    steps: number = 24,
    generations: number = 50,
    populationSize: number = 30
  ): OptimizationResult {
    let population = this.initializePopulation(populationSize);
    let bestSolution = population[0];
    let bestScore = -Infinity;

    for (let gen = 0; gen < generations; gen++) {
      const scored = population.map(individual => ({
        individual,
        score: this.evaluateFitness(individual, shock, constraints, steps)
      }));

      scored.sort((a, b) => b.score - a.score);

      if (scored[0].score > bestScore) {
        bestScore = scored[0].score;
        bestSolution = scored[0].individual;
      }

      // Selection and reproduction
      const survivors = scored.slice(0, Math.floor(populationSize * 0.3));
      const newPopulation = survivors.map(s => s.individual);

      while (newPopulation.length < populationSize) {
        const parent1 = survivors[Math.floor(Math.random() * survivors.length)].individual;
        const parent2 = survivors[Math.floor(Math.random() * survivors.length)].individual;
        const child = this.crossover(parent1, parent2);
        newPopulation.push(this.mutate(child));
      }

      population = newPopulation;
    }

    return this.buildResult(bestSolution, shock, steps);
  }

  private initializePopulation(size: number): Policy[][] {
    const population: Policy[][] = [];
    for (let i = 0; i < size; i++) {
      const numPolicies = Math.floor(Math.random() * 3) + 1;
      const policies: Policy[] = [];
      for (let j = 0; j < numPolicies; j++) {
        policies.push(this.availablePolicies[Math.floor(Math.random() * this.availablePolicies.length)]);
      }
      population.push(policies);
    }
    return population;
  }

  private evaluateFitness(policies: Policy[], shock: Shock, constraints: Constraints, steps: number): number {
    const graph = this.baseGraph.clone();
    const engine = new PropagationEngine(graph);

    engine.applyShock(shock);
    policies.forEach(p => engine.applyPolicy(p));

    const states = engine.simulate(steps);
    const finalState = states[states.length - 1];

    const totalCost = policies.reduce((sum, p) => sum + p.cost, 0);
    if (totalCost > constraints.maxBudget) return -1000;

    const gdpNode = graph.getNode('gdp');
    const inflationNode = graph.getNode('inflation');
    const unemploymentNode = graph.getNode('unemployment');
    const debtNode = graph.getNode('debt_ratio');

    if (!gdpNode || !inflationNode || !unemploymentNode || !debtNode) return -1000;

    const inflationIncrease = (inflationNode.current_value - inflationNode.baseline_value) / inflationNode.baseline_value;
    if (inflationIncrease > constraints.maxInflation) return -1000;

    const debtIncrease = (debtNode.current_value - debtNode.baseline_value) / debtNode.baseline_value;
    if (debtIncrease > constraints.maxDebt) return -1000;

    const gdpGain = (gdpNode.current_value - gdpNode.baseline_value) / gdpNode.baseline_value;
    const unemploymentReduction = (unemploymentNode.baseline_value - unemploymentNode.current_value) / unemploymentNode.baseline_value;
    const stabilityScore = this.stabilityCalc.calculateCompositeStability(graph);

    return gdpGain * 100 + unemploymentReduction * 80 - inflationIncrease * 50 - debtIncrease * 30 + stabilityScore * 0.5;
  }

  private crossover(parent1: Policy[], parent2: Policy[]): Policy[] {
    const cutpoint = Math.floor(Math.random() * Math.min(parent1.length, parent2.length));
    return [...parent1.slice(0, cutpoint), ...parent2.slice(cutpoint)];
  }

  private mutate(policies: Policy[]): Policy[] {
    if (Math.random() < 0.2) {
      const idx = Math.floor(Math.random() * policies.length);
      policies[idx] = this.availablePolicies[Math.floor(Math.random() * this.availablePolicies.length)];
    }
    return policies;
  }

  private buildResult(policies: Policy[], shock: Shock, steps: number): OptimizationResult {
    const graph = this.baseGraph.clone();
    const engine = new PropagationEngine(graph);

    engine.applyShock(shock);
    policies.forEach(p => engine.applyPolicy(p));
    engine.simulate(steps);

    const gdpNode = graph.getNode('gdp');
    const inflationNode = graph.getNode('inflation');
    const unemploymentNode = graph.getNode('unemployment');

    return {
      policy_mix: policies,
      delta_gdp: gdpNode ? (gdpNode.current_value - gdpNode.baseline_value) / gdpNode.baseline_value * 100 : 0,
      delta_inflation: inflationNode ? (inflationNode.current_value - inflationNode.baseline_value) / inflationNode.baseline_value * 100 : 0,
      delta_unemployment: unemploymentNode ? (unemploymentNode.current_value - unemploymentNode.baseline_value) / unemploymentNode.baseline_value * 100 : 0,
      composite_risk: this.stabilityCalc.calculateCompositeStability(graph),
      stabilization_time: this.calculateStabilizationTime(graph, engine, steps),
      tradeoff_score: 0
    };
  }

  private calculateStabilizationTime(graph: EconomicGraph, engine: PropagationEngine, maxSteps: number): number {
    for (let t = 0; t < maxSteps; t++) {
      const stability = this.stabilityCalc.calculateCompositeStability(graph);
      if (stability >= 70) return t;
    }
    return maxSteps;
  }
}
