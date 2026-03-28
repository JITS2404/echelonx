// PHASE 1: Hardcoded Propagation Engine (Version 0.1)
// No DB, no sophistication - just pure logic

export class PropagationEngine {
  
  // Hardcoded baseline state
  getBaselineState() {
    return {
      GDP: 100,
      INFLATION: 2.5,
      UNEMPLOYMENT: 5.0,
      DEBT_GDP: 60,
      INTEREST_RATE: 3.0
    };
  }

  // Hardcoded coefficients (adjacency matrix)
  getCoefficients() {
    return [
      { from: 'GDP', to: 'UNEMPLOYMENT', weight: -0.4 },
      { from: 'GDP', to: 'INFLATION', weight: 0.3 },
      { from: 'INFLATION', to: 'INTEREST_RATE', weight: 0.5 },
      { from: 'INTEREST_RATE', to: 'GDP', weight: -0.3 },
      { from: 'UNEMPLOYMENT', to: 'GDP', weight: -0.2 },
      { from: 'DEBT_GDP', to: 'INTEREST_RATE', weight: 0.2 },
      { from: 'INTEREST_RATE', to: 'DEBT_GDP', weight: 0.1 }
    ];
  }

  // Core propagation logic
  propagate(shockNode, shockValue) {
    const state = this.getBaselineState();
    const coefficients = this.getCoefficients();
    
    // Apply initial shock
    state[shockNode] += shockValue;
    
    // Propagate through network (5 iterations)
    for (let iteration = 0; iteration < 5; iteration++) {
      const changes = {};
      
      coefficients.forEach(({ from, to, weight }) => {
        const sourceChange = state[from] - this.getBaselineState()[from];
        const impact = sourceChange * weight;
        changes[to] = (changes[to] || 0) + impact;
      });
      
      // Apply changes
      Object.keys(changes).forEach(node => {
        state[node] += changes[node] * 0.2; // Damping factor
      });
    }
    
    return {
      baseline: this.getBaselineState(),
      shocked: state,
      changes: this.calculateChanges(this.getBaselineState(), state)
    };
  }

  calculateChanges(baseline, shocked) {
    const changes = {};
    Object.keys(baseline).forEach(key => {
      changes[key] = {
        absolute: shocked[key] - baseline[key],
        percent: ((shocked[key] - baseline[key]) / baseline[key]) * 100
      };
    });
    return changes;
  }
}

export default new PropagationEngine();
