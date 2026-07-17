const { performFullAnalysis } = require('../../src/lib/integration');
const { connectToDatabase } = require('../../src/lib/database/connection');

// Mock Yahoo Finance to ensure zero network requests during tests
jest.mock('../../src/lib/data-fetcher/yahoo-finance', () => {
  return {
    fetchStockData: jest.fn().mockResolvedValue({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 150.0,
      changePercent: 1.5
    }),
    fetchHistoricalData: jest.fn().mockImplementation((symbol, period) => {
      // Provide 100 daily price points to satisfy the 50-day minimum limit of the backtest engine
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

// Mock Google Finance to prevent fallbacks from accessing network
jest.mock('../../src/lib/data-fetcher/google-finance', () => ({
  fetchStockData: jest.fn(),
  fetchHistoricalData: jest.fn()
}));

// Mock news analysis to avoid external RSS parser execution
jest.mock('../../src/lib/news-analysis', () => ({
  performNewsAnalysis: jest.fn().mockResolvedValue({
    sentimentScore: 0.2,
    sentiment: 'neutral',
    articles: []
  })
}));

describe('Backtest API Integration Tests', () => {
  let db;
  beforeEach(async () => {
    db = await connectToDatabase(':memory:');
    // Pre-insert a stock record
    await new Promise((resolve) => {
      db.run("INSERT INTO stocks (symbol, market) VALUES ('AAPL', 'US');", resolve);
    });
  });

  afterEach((done) => {
    db.close(done);
  });

  test('performFullAnalysis should return backtest object with structured metrics', async () => {
    const result = await performFullAnalysis('AAPL');
    expect(result).toHaveProperty('backtest');
    expect(result.backtest).toHaveProperty('winRate5d');
    expect(result.backtest.similarDays.length).toBeGreaterThanOrEqual(0);
  });
});
