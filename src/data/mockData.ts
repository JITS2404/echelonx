// Mock data for the EchelonX simulation engine

export interface EconomyNode {
  id: string;
  label: string;
  value: number;
  volatility: number;
  category: 'monetary' | 'fiscal' | 'labor' | 'trade' | 'financial';
  x: number;
  y: number;
}

export interface EconomyEdge {
  source: string;
  target: string;
  weight: number;
  lag: number;
}

export interface SimulationResult {
  timestep: number;
  gdp: number;
  inflation: number;
  unemployment: number;
  debtRatio: number;
  currencyIndex: number;
  gdpUpper: number;
  gdpLower: number;
  inflationUpper: number;
  inflationLower: number;
}

export interface RiskScore {
  category: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ScenarioData {
  name: string;
  gdpDelta: number;
  inflationDelta: number;
  unemploymentDelta: number;
  debtDelta: number;
  riskScore: number;
  recoveryTime: number;
  score: number;
}

export const economyNodes: EconomyNode[] = [
  { id: 'interest_rate', label: 'Interest Rate', value: 5.25, volatility: 0.12, category: 'monetary', x: 50, y: 30 },
  { id: 'money_supply', label: 'Money Supply', value: 21.4, volatility: 0.08, category: 'monetary', x: 25, y: 20 },
  { id: 'gdp', label: 'GDP', value: 26.9, volatility: 0.15, category: 'fiscal', x: 50, y: 55 },
  { id: 'inflation', label: 'Inflation', value: 3.2, volatility: 0.22, category: 'monetary', x: 75, y: 25 },
  { id: 'unemployment', label: 'Unemployment', value: 3.7, volatility: 0.18, category: 'labor', x: 30, y: 70 },
  { id: 'govt_spending', label: 'Govt Spending', value: 6.1, volatility: 0.10, category: 'fiscal', x: 15, y: 45 },
  { id: 'tax_revenue', label: 'Tax Revenue', value: 4.4, volatility: 0.09, category: 'fiscal', x: 40, y: 85 },
  { id: 'debt_ratio', label: 'Debt/GDP', value: 123.4, volatility: 0.06, category: 'fiscal', x: 65, y: 80 },
  { id: 'currency', label: 'Currency Index', value: 104.2, volatility: 0.20, category: 'trade', x: 85, y: 50 },
  { id: 'trade_balance', label: 'Trade Balance', value: -67.3, volatility: 0.25, category: 'trade', x: 80, y: 75 },
  { id: 'consumer_conf', label: 'Consumer Conf.', value: 102.6, volatility: 0.14, category: 'labor', x: 60, y: 45 },
  { id: 'equity_index', label: 'Equity Index', value: 4927, volatility: 0.30, category: 'financial', x: 90, y: 30 },
];

export const economyEdges: EconomyEdge[] = [
  { source: 'interest_rate', target: 'gdp', weight: -0.65, lag: 2 },
  { source: 'interest_rate', target: 'inflation', weight: -0.45, lag: 3 },
  { source: 'interest_rate', target: 'currency', weight: 0.55, lag: 1 },
  { source: 'interest_rate', target: 'equity_index', weight: -0.40, lag: 1 },
  { source: 'money_supply', target: 'inflation', weight: 0.60, lag: 4 },
  { source: 'money_supply', target: 'gdp', weight: 0.35, lag: 2 },
  { source: 'gdp', target: 'unemployment', weight: -0.70, lag: 1 },
  { source: 'gdp', target: 'tax_revenue', weight: 0.80, lag: 1 },
  { source: 'gdp', target: 'consumer_conf', weight: 0.55, lag: 1 },
  { source: 'inflation', target: 'consumer_conf', weight: -0.35, lag: 1 },
  { source: 'inflation', target: 'currency', weight: -0.30, lag: 2 },
  { source: 'govt_spending', target: 'gdp', weight: 0.50, lag: 1 },
  { source: 'govt_spending', target: 'debt_ratio', weight: 0.45, lag: 1 },
  { source: 'tax_revenue', target: 'debt_ratio', weight: -0.40, lag: 1 },
  { source: 'unemployment', target: 'consumer_conf', weight: -0.50, lag: 1 },
  { source: 'trade_balance', target: 'gdp', weight: 0.25, lag: 2 },
  { source: 'currency', target: 'trade_balance', weight: -0.45, lag: 3 },
  { source: 'equity_index', target: 'consumer_conf', weight: 0.30, lag: 1 },
];

export const simulationResults: SimulationResult[] = Array.from({ length: 24 }, (_, i) => {
  const t = i;
  const base = {
    gdp: 26.9 + Math.sin(t * 0.3) * 0.8 - t * 0.05 + Math.random() * 0.3,
    inflation: 3.2 + Math.cos(t * 0.2) * 0.5 + t * 0.08,
    unemployment: 3.7 - Math.sin(t * 0.25) * 0.3 + t * 0.06,
    debtRatio: 123.4 + t * 0.8 + Math.random() * 2,
    currencyIndex: 104.2 - t * 0.3 + Math.sin(t * 0.4) * 2,
  };
  return {
    timestep: t,
    gdp: +base.gdp.toFixed(2),
    inflation: +base.inflation.toFixed(2),
    unemployment: +base.unemployment.toFixed(2),
    debtRatio: +base.debtRatio.toFixed(1),
    currencyIndex: +base.currencyIndex.toFixed(1),
    gdpUpper: +(base.gdp + 0.6 + t * 0.05).toFixed(2),
    gdpLower: +(base.gdp - 0.6 - t * 0.05).toFixed(2),
    inflationUpper: +(base.inflation + 0.4 + t * 0.03).toFixed(2),
    inflationLower: +(base.inflation - 0.4 - t * 0.03).toFixed(2),
  };
});

export const monteCarloDistribution = Array.from({ length: 50 }, (_, i) => {
  const x = 24 + i * 0.2;
  const mean = 26.2;
  const std = 1.8;
  const density = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);
  return {
    value: +x.toFixed(1),
    density: +(density * 100).toFixed(3),
    isWithinCI: x >= mean - std && x <= mean + std,
    isTailRisk: x < mean - 2 * std || x > mean + 2 * std,
  };
});

export const riskScores: RiskScore[] = [
  { category: 'Inflation Stress', score: 62, trend: 'up' },
  { category: 'Debt Overload', score: 71, trend: 'up' },
  { category: 'Employment Stability', score: 38, trend: 'stable' },
  { category: 'Currency Volatility', score: 55, trend: 'down' },
  { category: 'Growth Contraction', score: 44, trend: 'up' },
];

export const compositeRiskScore = 54;

export const scenarios: ScenarioData[] = [
  { name: 'Baseline', gdpDelta: 0, inflationDelta: 0, unemploymentDelta: 0, debtDelta: 0, riskScore: 54, recoveryTime: 0, score: 62 },
  { name: 'Rate Cut 150bp', gdpDelta: 1.2, inflationDelta: 0.8, unemploymentDelta: -0.4, debtDelta: 2.1, riskScore: 48, recoveryTime: 6, score: 71 },
  { name: 'Fiscal Stimulus', gdpDelta: 2.1, inflationDelta: 1.4, unemploymentDelta: -0.8, debtDelta: 8.5, riskScore: 61, recoveryTime: 8, score: 58 },
  { name: 'AI Optimized', gdpDelta: 1.6, inflationDelta: 0.3, unemploymentDelta: -0.6, debtDelta: 1.8, riskScore: 41, recoveryTime: 4, score: 78 },
];

export const regimeState = {
  current: 'Stagnation' as const,
  confidence: 0.72,
  indicators: [
    { label: 'Growth Momentum', value: -0.3, signal: 'weak' },
    { label: 'Inflation Persistence', value: 0.6, signal: 'elevated' },
    { label: 'Volatility Cluster', value: 0.45, signal: 'moderate' },
    { label: 'Debt Trajectory', value: 0.71, signal: 'critical' },
  ],
};
