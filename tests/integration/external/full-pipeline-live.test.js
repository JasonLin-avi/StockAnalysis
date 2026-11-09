/**
 * @fileoverview Live integration test for the full analysis pipeline against real external APIs (Yahoo Finance, etc.).
 * Why this file exists:
 * - Tests full multi-factor pipeline execution with real network calls for live AAPL data.
 * - Kept in tests/integration/external/ to inspect third-party API changes, network latency, or payload changes.
 * - Isolated from standard unit test suites.
 */

import { performFullAnalysis } from '../../src/services/analysis.service';
import { generateReport } from '../../src/lib/report-generator';
import { connectToDatabase } from '../../src/external/database/connection';
import { saveStockData, saveAnalysisResults } from '../../src/external/database/queries';

describe('Live Full Analysis Pipeline Integration Test', () => {
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

  test('runs full live analysis pipeline, writes to DB and renders report', async () => {
    const symbol = 'AAPL';
    const analysis = await performFullAnalysis(symbol, db);

    expect(analysis.symbol).toBe('AAPL');
    expect(analysis).toHaveProperty('price');
    expect(analysis).toHaveProperty('technical');
    expect(analysis).toHaveProperty('fundamental');
    expect(analysis).toHaveProperty('news');
    expect(analysis).toHaveProperty('advice');

    const dailyPrices = analysis.technical.prices.map((p, idx) => ({
      date: new Date(Date.now() - idx * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      open: p * 0.99,
      high: p * 1.01,
      low: p * 0.98,
      close: p,
      volume: 1000000
    }));

    await expect(saveStockData(db, symbol, dailyPrices)).resolves.not.toThrow();
    await expect(saveAnalysisResults(db, symbol, new Date().toISOString().split('T')[0], analysis)).resolves.not.toThrow();

    const htmlReport = await generateReport(analysis, 'html');
    expect(htmlReport).toContain('AAPL 分析報告');
    expect(htmlReport).toContain('Antigravity Stock Analytics');
  }, 45000);
});
