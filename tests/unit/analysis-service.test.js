const { performFullAnalysis } = require('../../src/services/analysis.service');

describe('Analysis Service', () => {
  it('should successfully run performFullAnalysis and return correct structure', async () => {
    const result = await performFullAnalysis('AAPL');
    expect(result).toBeDefined();
    expect(result.symbol).toBe('AAPL');
    expect(result.name).toBeDefined();
    expect(result.price).toBeGreaterThan(0);
    expect(result.technical).toBeDefined();
    expect(result.fundamental).toBeDefined();
    expect(result.backtest).toBeDefined();
  });
});
