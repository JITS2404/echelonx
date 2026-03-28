import { EconomicGraph } from './economicGraph';
import { PropagationEngine } from './propagationEngine';
import { MonteCarloEngine } from './monteCarloEngine';
import { StabilityCalculator } from './stabilityCalculator';
import { RegimeDetector } from './regimeDetector';
import { OptimizationEngine } from './optimizationEngine';
import { EconomicNode, EconomicEdge, Shock, Policy } from './types';

export class SimulationOrchestrator {
  private graph: EconomicGraph;
  private propagationEngine: PropagationEngine;
  private monteCarloEngine: MonteCarloEngine;
  private stabilityCalc: StabilityCalculator;
  private regimeDetector: RegimeDetector;
  private optimizationEngine: OptimizationEngine;

  constructor(nodes: EconomicNode[], edges: EconomicEdge[], policies: Policy[]) {
    this.graph = new EconomicGraph(nodes, edges);
    this.propagationEngine = new PropagationEngine(this.graph);
    this.monteCarloEngine = new MonteCarloEngine(this.graph);
    this.stabilityCalc = new StabilityCalculator();
    this.regimeDetector = new RegimeDetector();
    this.optimizationEngine = new OptimizationEngine(this.graph, policies);
  }

  runScenario(shock: Shock, policies: Policy[], steps: number = 24) {
    this.graph.reset();
    this.propagationEngine = new PropagationEngine(this.graph);
    
    this.propagationEngine.applyShock(shock);
    policies.forEach(p => this.propagationEngine.applyPolicy(p));

    const states = this.propagationEngine.simulate(steps);
    const history = states.map(s => Array.from(s.nodes.values()));

    const finalStability = this.stabilityCalc.calculateCompositeStability(this.graph);
    const regime = this.regimeDetector.detectRegime(this.graph, history);

    return {
      states,
      finalStability,
      regime,
      nodes: this.graph.getAllNodes()
    };
  }

  runMonteCarloAnalysis(shock: Shock, policies: Policy[], steps: number = 24, iterations: number = 1000) {
    return this.monteCarloEngine.runSimulations(shock, policies, steps, iterations, 'gdp');
  }

  optimizePolicies(shock: Shock, constraints: any) {
    return this.optimizationEngine.optimize(shock, constraints);
  }

  getGraph(): EconomicGraph {
    return this.graph;
  }
}
