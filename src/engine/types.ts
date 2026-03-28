export interface EconomicNode {
  id: string;
  label: string;
  baseline_value: number;
  current_value: number;
  volatility: number;
  resilience_coefficient: number;
  recovery_rate: number;
  collapse_threshold: number;
  category: 'monetary' | 'fiscal' | 'labor' | 'trade' | 'financial';
  time_lag_factor: number;
}

export interface EconomicEdge {
  from_node: string;
  to_node: string;
  transmission_weight: number;
  transmission_delay: number;
  amplification_factor: number;
  damping_factor: number;
}

export interface Shock {
  target_nodes: string[];
  magnitude: number;
  duration: number;
  persistence_factor: number;
  spread_pattern: 'localized' | 'cascading' | 'global';
}

export interface Policy {
  id: string;
  name: string;
  type: 'monetary' | 'fiscal' | 'structural';
  cost: number;
  effectiveness_vector: Record<string, number>;
  inflationary_pressure: number;
  lag_time: number;
  duration: number;
  side_effect_risk: number;
}

export interface SimulationState {
  timestep: number;
  nodes: Map<string, number>;
  stability_index: number;
  regime: RegimeType;
}

export type RegimeType = 'Expansion' | 'Overheating' | 'Stagnation' | 'Crisis' | 'Recovery';

export interface MonteCarloResult {
  mean: number[];
  confidence_interval: [number[], number[]];
  worst_case: number[];
  collapse_probability: number;
}

export interface OptimizationResult {
  policy_mix: Policy[];
  delta_gdp: number;
  delta_inflation: number;
  delta_unemployment: number;
  composite_risk: number;
  stabilization_time: number;
  tradeoff_score: number;
}
