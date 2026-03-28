import { EconomicNode, EconomicEdge, Policy, Shock } from './types';

export const developedEconomyNodes: EconomicNode[] = [
  { id: 'gdp', label: 'GDP', baseline_value: 26.9, current_value: 26.9, volatility: 0.15, resilience_coefficient: 0.85, recovery_rate: 0.12, collapse_threshold: 20, category: 'fiscal', time_lag_factor: 1 },
  { id: 'inflation', label: 'Inflation', baseline_value: 3.2, current_value: 3.2, volatility: 0.22, resilience_coefficient: 0.75, recovery_rate: 0.08, collapse_threshold: 10, category: 'monetary', time_lag_factor: 2 },
  { id: 'unemployment', label: 'Unemployment', baseline_value: 3.7, current_value: 3.7, volatility: 0.18, resilience_coefficient: 0.80, recovery_rate: 0.10, collapse_threshold: 15, category: 'labor', time_lag_factor: 1 },
  { id: 'debt_ratio', label: 'Debt/GDP', baseline_value: 123.4, current_value: 123.4, volatility: 0.06, resilience_coefficient: 0.95, recovery_rate: 0.02, collapse_threshold: 200, category: 'fiscal', time_lag_factor: 3 },
  { id: 'currency', label: 'Currency Index', baseline_value: 104.2, current_value: 104.2, volatility: 0.20, resilience_coefficient: 0.70, recovery_rate: 0.15, collapse_threshold: 70, category: 'trade', time_lag_factor: 1 },
  { id: 'equity_index', label: 'Equity Index', baseline_value: 4927, current_value: 4927, volatility: 0.30, resilience_coefficient: 0.65, recovery_rate: 0.18, collapse_threshold: 3000, category: 'financial', time_lag_factor: 0 },
  { id: 'interest_rate', label: 'Interest Rate', baseline_value: 5.25, current_value: 5.25, volatility: 0.12, resilience_coefficient: 0.90, recovery_rate: 0.05, collapse_threshold: 0, category: 'monetary', time_lag_factor: 1 },
  { id: 'money_supply', label: 'Money Supply', baseline_value: 21.4, current_value: 21.4, volatility: 0.08, resilience_coefficient: 0.88, recovery_rate: 0.06, collapse_threshold: 10, category: 'monetary', time_lag_factor: 2 },
  { id: 'govt_spending', label: 'Govt Spending', baseline_value: 6.1, current_value: 6.1, volatility: 0.10, resilience_coefficient: 0.92, recovery_rate: 0.04, collapse_threshold: 2, category: 'fiscal', time_lag_factor: 1 },
  { id: 'consumer_conf', label: 'Consumer Conf.', baseline_value: 102.6, current_value: 102.6, volatility: 0.14, resilience_coefficient: 0.78, recovery_rate: 0.14, collapse_threshold: 60, category: 'labor', time_lag_factor: 1 },
];

export const developedEconomyEdges: EconomicEdge[] = [
  { from_node: 'interest_rate', to_node: 'gdp', transmission_weight: -0.65, transmission_delay: 2, amplification_factor: 1.2, damping_factor: 0.15 },
  { from_node: 'interest_rate', to_node: 'inflation', transmission_weight: -0.45, transmission_delay: 3, amplification_factor: 1.1, damping_factor: 0.20 },
  { from_node: 'interest_rate', to_node: 'currency', transmission_weight: 0.55, transmission_delay: 1, amplification_factor: 1.3, damping_factor: 0.10 },
  { from_node: 'interest_rate', to_node: 'equity_index', transmission_weight: -0.40, transmission_delay: 1, amplification_factor: 1.5, damping_factor: 0.12 },
  { from_node: 'money_supply', to_node: 'inflation', transmission_weight: 0.60, transmission_delay: 4, amplification_factor: 1.4, damping_factor: 0.18 },
  { from_node: 'money_supply', to_node: 'gdp', transmission_weight: 0.35, transmission_delay: 2, amplification_factor: 1.1, damping_factor: 0.22 },
  { from_node: 'gdp', to_node: 'unemployment', transmission_weight: -0.70, transmission_delay: 1, amplification_factor: 1.3, damping_factor: 0.14 },
  { from_node: 'gdp', to_node: 'consumer_conf', transmission_weight: 0.55, transmission_delay: 1, amplification_factor: 1.2, damping_factor: 0.16 },
  { from_node: 'inflation', to_node: 'consumer_conf', transmission_weight: -0.35, transmission_delay: 1, amplification_factor: 1.1, damping_factor: 0.18 },
  { from_node: 'govt_spending', to_node: 'gdp', transmission_weight: 0.50, transmission_delay: 1, amplification_factor: 1.2, damping_factor: 0.20 },
  { from_node: 'govt_spending', to_node: 'debt_ratio', transmission_weight: 0.45, transmission_delay: 1, amplification_factor: 1.0, damping_factor: 0.10 },
  { from_node: 'unemployment', to_node: 'consumer_conf', transmission_weight: -0.50, transmission_delay: 1, amplification_factor: 1.2, damping_factor: 0.15 },
  { from_node: 'currency', to_node: 'inflation', transmission_weight: -0.30, transmission_delay: 2, amplification_factor: 1.1, damping_factor: 0.20 },
  { from_node: 'equity_index', to_node: 'consumer_conf', transmission_weight: 0.30, transmission_delay: 1, amplification_factor: 1.0, damping_factor: 0.25 },
];

export const availablePolicies: Policy[] = [
  {
    id: 'rate_cut_50',
    name: 'Rate Cut 50bp',
    type: 'monetary',
    cost: 0,
    effectiveness_vector: { interest_rate: -0.005, money_supply: 0.02 },
    inflationary_pressure: 0.3,
    lag_time: 2,
    duration: 12,
    side_effect_risk: 0.2
  },
  {
    id: 'rate_cut_150',
    name: 'Rate Cut 150bp',
    type: 'monetary',
    cost: 0,
    effectiveness_vector: { interest_rate: -0.015, money_supply: 0.05 },
    inflationary_pressure: 0.8,
    lag_time: 2,
    duration: 12,
    side_effect_risk: 0.5
  },
  {
    id: 'fiscal_stimulus',
    name: 'Fiscal Stimulus',
    type: 'fiscal',
    cost: 500,
    effectiveness_vector: { govt_spending: 0.15, gdp: 0.03 },
    inflationary_pressure: 1.4,
    lag_time: 1,
    duration: 8,
    side_effect_risk: 0.6
  },
  {
    id: 'qe_program',
    name: 'QE Program',
    type: 'monetary',
    cost: 200,
    effectiveness_vector: { money_supply: 0.10, equity_index: 0.05 },
    inflationary_pressure: 0.5,
    lag_time: 3,
    duration: 18,
    side_effect_risk: 0.4
  },
  {
    id: 'tax_cut',
    name: 'Tax Reduction',
    type: 'fiscal',
    cost: 300,
    effectiveness_vector: { consumer_conf: 0.04, gdp: 0.02 },
    inflationary_pressure: 0.6,
    lag_time: 2,
    duration: 12,
    side_effect_risk: 0.3
  }
];

export const predefinedShocks: Record<string, Shock> = {
  financial_crisis: {
    target_nodes: ['equity_index', 'consumer_conf', 'currency'],
    magnitude: -25,
    duration: 6,
    persistence_factor: 0.7,
    spread_pattern: 'cascading'
  },
  supply_shock: {
    target_nodes: ['inflation', 'gdp'],
    magnitude: 15,
    duration: 8,
    persistence_factor: 0.6,
    spread_pattern: 'global'
  },
  debt_crisis: {
    target_nodes: ['debt_ratio', 'interest_rate'],
    magnitude: 30,
    duration: 12,
    persistence_factor: 0.8,
    spread_pattern: 'cascading'
  },
  currency_collapse: {
    target_nodes: ['currency'],
    magnitude: -40,
    duration: 4,
    persistence_factor: 0.9,
    spread_pattern: 'global'
  }
};
