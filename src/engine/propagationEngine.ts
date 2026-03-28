import { EconomicGraph } from './economicGraph';
import { Shock, SimulationState, Policy } from './types';

export class PropagationEngine {
  private graph: EconomicGraph;
  private shockHistory: Map<number, Map<string, number>>;
  private policyEffects: Map<string, number>;

  constructor(graph: EconomicGraph) {
    this.graph = graph;
    this.shockHistory = new Map();
    this.policyEffects = new Map();
  }

  applyShock(shock: Shock, timestep: number = 0) {
    const shockMap = new Map<string, number>();
    
    shock.target_nodes.forEach(nodeId => {
      const node = this.graph.getNode(nodeId);
      if (node) {
        const shockValue = node.baseline_value * (shock.magnitude / 100);
        node.current_value = node.baseline_value + shockValue;
        shockMap.set(nodeId, shockValue);
      }
    });

    this.shockHistory.set(timestep, shockMap);
  }

  applyPolicy(policy: Policy) {
    Object.entries(policy.effectiveness_vector).forEach(([nodeId, effect]) => {
      const current = this.policyEffects.get(nodeId) || 0;
      this.policyEffects.set(nodeId, current + effect);
    });
  }

  propagateStep(timestep: number, volatilityNoise: number = 0): SimulationState {
    const nodes = this.graph.getAllNodes();
    const changes = new Map<string, number>();

    nodes.forEach(node => {
      const incomingEdges = this.graph.getIncomingEdges(node.id);
      let deltaValue = 0;

      incomingEdges.forEach(edge => {
        const sourceNode = this.graph.getNode(edge.from_node);
        if (sourceNode && timestep >= edge.transmission_delay) {
          const sourceChange = (sourceNode.current_value - sourceNode.baseline_value) / sourceNode.baseline_value;
          const transmission = sourceChange * edge.transmission_weight * edge.amplification_factor;
          deltaValue += transmission * (1 - edge.damping_factor);
        }
      });

      // Apply policy effects
      const policyEffect = this.policyEffects.get(node.id) || 0;
      deltaValue += policyEffect;

      // Apply recovery
      const deviation = node.current_value - node.baseline_value;
      const recovery = -deviation * node.recovery_rate;
      deltaValue += recovery;

      // Apply volatility noise
      const noise = (Math.random() - 0.5) * 2 * node.volatility * volatilityNoise;
      deltaValue += noise;

      // Apply resilience
      deltaValue *= node.resilience_coefficient;

      changes.set(node.id, node.current_value + deltaValue * node.baseline_value);
    });

    // Update all nodes
    changes.forEach((value, nodeId) => {
      this.graph.updateNodeValue(nodeId, value);
    });

    return {
      timestep,
      nodes: new Map(this.graph.getAllNodes().map(n => [n.id, n.current_value])),
      stability_index: 0,
      regime: 'Stagnation'
    };
  }

  simulate(steps: number, volatilityNoise: number = 0): SimulationState[] {
    const results: SimulationState[] = [];
    for (let t = 0; t < steps; t++) {
      results.push(this.propagateStep(t, volatilityNoise));
    }
    return results;
  }

  reset() {
    this.graph.reset();
    this.shockHistory.clear();
    this.policyEffects.clear();
  }
}
