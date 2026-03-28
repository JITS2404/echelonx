import { EconomicGraph } from './economicGraph';
import { RegimeType } from './types';

export class RegimeDetector {
  detectRegime(graph: EconomicGraph, history: number[][]): { regime: RegimeType; confidence: number } {
    const nodes = graph.getAllNodes();
    const gdpNode = nodes.find(n => n.id === 'gdp');
    const inflationNode = nodes.find(n => n.id === 'inflation');
    const debtNode = nodes.find(n => n.id === 'debt_ratio');

    if (!gdpNode || !inflationNode || !debtNode) {
      return { regime: 'Stagnation', confidence: 0.5 };
    }

    const growthMomentum = (gdpNode.current_value - gdpNode.baseline_value) / gdpNode.baseline_value;
    const inflationPersistence = (inflationNode.current_value - inflationNode.baseline_value) / inflationNode.baseline_value;
    const debtTrajectory = (debtNode.current_value - debtNode.baseline_value) / debtNode.baseline_value;

    // Calculate volatility
    const recentValues = history.slice(-5).map(h => h[0] || 0);
    const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    const volatility = Math.sqrt(variance) / mean;

    // Regime classification
    let regime: RegimeType = 'Stagnation';
    let confidence = 0.5;

    if (growthMomentum > 0.02 && inflationPersistence < 0.03 && debtTrajectory < 0.05) {
      regime = 'Expansion';
      confidence = 0.75 + Math.min(0.2, growthMomentum * 5);
    } else if (growthMomentum > 0.03 && inflationPersistence > 0.05) {
      regime = 'Overheating';
      confidence = 0.70 + Math.min(0.25, inflationPersistence * 3);
    } else if (growthMomentum < -0.05 || debtTrajectory > 0.15 || volatility > 0.3) {
      regime = 'Crisis';
      confidence = 0.80 + Math.min(0.15, Math.abs(growthMomentum) * 2);
    } else if (growthMomentum > -0.02 && growthMomentum < 0.01 && volatility < 0.15) {
      regime = 'Recovery';
      confidence = 0.65;
    } else {
      regime = 'Stagnation';
      confidence = 0.72;
    }

    return { regime, confidence: Math.min(0.95, confidence) };
  }
}
