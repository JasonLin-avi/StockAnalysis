const { performFullAnalysis } = require('../../src/lib/integration');
const { generateReport } = require('../../src/lib/report-generator');
const { connectToDatabase } = require('../../src/lib/database/connection');
const { saveStockData, saveAnalysisResults } = require('../../src/lib/database/queries');

describe('End-to-End Stock Analysis Workflow', () => {
  let db;

  beforeAll(async () => {
    // Setup clean in-memory database for E2E flow
    db = await connectToDatabase(':memory:');
  });

  test('should run full analysis pipeline and write to DB and output report', async () => {
    const symbol = 'AAPL';
    const analysis = await performFullAnalysis(symbol);

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
