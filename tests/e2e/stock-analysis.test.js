import { performFullAnalysis } from '../../src/services/analysis.service';
import { generateReport } from '../../src/lib/report-generator';
import { connectToDatabase } from '../../src/external/database/connection';
import { saveStockData, saveAnalysisResults } from '../../src/external/database/queries';

// Mock Yahoo Finance to ensure zero network requests during standard test runs
jest.mock('../../src/external/data-fetcher/yahoo-finance', () => ({
  fetchStockData: jest.fn().mockResolvedValue({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 150.0,
    changePercent: 1.5
  }),
  fetchHistoricalData: jest.fn().mockImplementation((symbol, period) => {
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
}));

// Mock news analysis to prevent external network calls
jest.mock('../../src/lib/news-analysis', () => ({
  performNewsAnalysis: jest.fn().mockResolvedValue({
    sentimentScore: 0.2,
    sentiment: 'neutral',
    articles: []
  })
}));

describe('End-to-End Stock Analysis Workflow (Hermetic)', () => {
  let db;

  beforeAll(async () => {
    db = await connectToDatabase(':memory:');
  });

  afterAll((done) => {
    if (db && typeof db.close === 'function') {
      db.close(done);
    } else {
      done();
    }
  });

  test('should run full analysis pipeline and write to DB and output report', async () => {
    const symbol = 'AAPL';
    const analysis = await performFullAnalysis(symbol, db);

    // Verify analysis schema
    expect(analysis.symbol).toBe('AAPL');
    expect(analysis).toHaveProperty('price');
    expect(analysis).toHaveProperty('technical');
    expect(analysis).toHaveProperty('fundamental');
    expect(analysis).toHaveProperty('news');
    expect(analysis).toHaveProperty('advice');

    // Save to DB
    const dailyPrices = analysis.technical.prices.map((p, idx) => ({
      date: new Date(Date.now() - idx * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      open: p * 0.99,
      high: p * 1.01,
      low: p * 0.98,
      close: p,
      volume: 1000000
    }));

    await expect(saveStockData(db, symbol, dailyPrices)).resolves.not.toThrow();
    await expect(saveAnalysisResults(db, symbol, '2026-07-12', analysis)).resolves.not.toThrow();

    // Generate HTML report
    const htmlReport = await generateReport(analysis, 'html');
    expect(htmlReport).toContain('AAPL 分析報告');
    expect(htmlReport).toContain('Antigravity Stock Analytics');
  }, 30000);
});
