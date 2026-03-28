import { EconomicGraph } from './economicGraph';
import { PropagationEngine } from './propagationEngine';
import { Shock, Policy, MonteCarloResult } from './types';

export class MonteCarloEngine {
  private baseGraph: EconomicGraph;

  constructor(graph: EconomicGraph) {
    this.baseGraph = graph;
  }

  runSimulations(
    shock: Shock,
    policies: Policy[],
    steps: number,
    iterations: number,
    targetNodeId: string
  ): MonteCarloResult {
    const results: number[][] = [];

    for (let i = 0; i < iterations; i++) {
      const graph = this.baseGraph.clone();
      const engine = new PropagationEngine(graph);
      
      engine.applyShock(shock);
      policies.forEach(p => engine.applyPolicy(p));

      const volatility = 0.01 + Math.random() * 0.02;
      const states = engine.simulate(steps, volatility);
      
      const trajectory = states.map(s => s.nodes.get(targetNodeId) || 0);
      results.push(trajectory);
    }

    // Calculate statistics
    const mean: number[] = [];
    const upper: number[] = [];
    const lower: number[] = [];
    const worstCase: number[] = [];

    for (let t = 0; t < steps; t++) {
      const values = results.map(r => r[t]).sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      
      mean.push(sum / iterations);
      lower.push(values[Math.floor(iterations * 0.05)]);
      upper.push(values[Math.floor(iterations * 0.95)]);
      worstCase.push(values[Math.floor(iterations * 0.01)]);
    }

    // Calculate collapse probability
    const targetNode = this.baseGraph.getNode(targetNodeId);
    const threshold = targetNode ? targetNode.collapse_threshold : 0;
    const collapseCount = results.filter(r => 
      r.some(v => v < threshold)
    ).length;

    return {
      mean,
      confidence_interval: [lower, upper],
      worst_case: worstCase,
      collapse_probability: collapseCount / iterations
    };
  }
}
