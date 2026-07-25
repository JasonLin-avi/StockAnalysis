const { performFullAnalysis } = require('../../src/services/analysis.service');
const { connectToDatabase } = require('../../src/external/database/connection');

// Why: Mock Yahoo Finance API calls to ensure zero external network query overhead in unit tests.
jest.mock('../../src/external/data-fetcher/yahoo-finance', () => {
  return {
    fetchStockData: jest.fn().mockResolvedValue({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 150.0,
      changePercent: 1.5
    }),
    fetchHistoricalData: jest.fn().mockImplementation((symbol, period) => {
      // Why: Provide sufficient mock data points to pass moving average and backtest requirements.
      const length = period === '3y' ? 100 : 30;
      const data = Array.from({ length }, (_, i) => ({
        date: new Date(2026, 0, i + 1).toISOString().slice(0, 10),
        open: 100 + i,
        high: 101 + i,
        low: 99 + i,
        close: 100.5 + i,
        volume: 100000
      }));
      return Promise.resolve({
        symbol,
        period,
        data
      });
    }),
    fetchFundamentalData: jest.fn().mockResolvedValue({
      eps: 5.0,
      debtRatio: 0.3,
      revenueGrowth: 0.1,
      operatingCashFlow: 1000000,
      capitalExpenditures: 200000,
      historicalEps: [4.5, 4.8, 5.0]
    })
  };
});

// Why: Mock RSS feed based news sentiment parser to ensure hermetic and fast unit test runs.
jest.mock('../../src/lib/news-analysis', () => ({
  performNewsAnalysis: jest.fn().mockResolvedValue({
    sentimentScore: 0.2,
    sentiment: 'neutral',
    articles: []
  })
}));

describe('Analysis Service', () => {
  let db;

  beforeEach(async () => {
    // Why: Initialize a brand new clean in-memory database to prevent test pollution on disk.
    db = await connectToDatabase(':memory:');
  });

  afterEach((done) => {
    // Why: Gracefully close the in-memory connection after each test suite executes.
    if (db) {
      db.close(done);
    } else {
      done();
    }
  });

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

  it('should throw an error when passed invalid input (null or empty string)', async () => {
    // Why: Ensure edge cases (like null/undefined parameters) are correctly caught.
    await expect(performFullAnalysis(null)).rejects.toThrow('Symbol is required');
    await expect(performFullAnalysis('')).rejects.toThrow('Symbol is required');
  });
});

