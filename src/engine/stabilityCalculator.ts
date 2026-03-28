import { EconomicGraph } from './economicGraph';

export class StabilityCalculator {
  private weights = {
    gdp: 0.25,
    inflation: 0.20,
    unemployment: 0.20,
    debt_ratio: 0.15,
    currency: 0.10,
    equity_index: 0.10
  };

  calculateCompositeStability(graph: EconomicGraph): number {
    const nodes = graph.getAllNodes();
    let score = 100;

    const gdpNode = nodes.find(n => n.id === 'gdp');
    const inflationNode = nodes.find(n => n.id === 'inflation');
    const unemploymentNode = nodes.find(n => n.id === 'unemployment');
    const debtNode = nodes.find(n => n.id === 'debt_ratio');
    const currencyNode = nodes.find(n => n.id === 'currency');
    const equityNode = nodes.find(n => n.id === 'equity_index');

    if (gdpNode) {
      const deviation = Math.abs((gdpNode.current_value - gdpNode.baseline_value) / gdpNode.baseline_value);
      score -= deviation * 100 * this.weights.gdp;
    }

    if (inflationNode) {
      const deviation = Math.abs((inflationNode.current_value - inflationNode.baseline_value) / inflationNode.baseline_value);
      score -= deviation * 100 * this.weights.inflation;
    }

    if (unemploymentNode) {
      const spike = Math.max(0, (unemploymentNode.current_value - unemploymentNode.baseline_value) / unemploymentNode.baseline_value);
      score -= spike * 100 * this.weights.unemployment;
    }

    if (debtNode) {
      const growth = Math.max(0, (debtNode.current_value - debtNode.baseline_value) / debtNode.baseline_value);
      score -= growth * 100 * this.weights.debt_ratio;
    }

    if (currencyNode) {
      const volatility = Math.abs((currencyNode.current_value - currencyNode.baseline_value) / currencyNode.baseline_value);
      score -= volatility * 100 * this.weights.currency;
    }

    if (equityNode) {
      const stress = Math.max(0, (equityNode.baseline_value - equityNode.current_value) / equityNode.baseline_value);
      score -= stress * 100 * this.weights.equity_index;
    }

    return Math.max(0, Math.min(100, score));
  }

  getStabilityLevel(score: number): 'Stable' | 'Stressed' | 'Collapse Risk' {
    if (score >= 70) return 'Stable';
    if (score >= 40) return 'Stressed';
    return 'Collapse Risk';
  }
}
