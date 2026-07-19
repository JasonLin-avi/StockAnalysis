/**
 * Unit tests for the SQLite Database Module.
 * Validates connection initialization, transactional DDL, and CRUD queries using an in-memory database.
 */

const { connectToDatabase } = require('../../src/lib/database/connection');
const {
  saveStock,
  saveStockData,
  saveAnalysisResults,
  getStock,
  getStockData,
  getLatestAnalysisResults,
  getLatestBacktestResults
} = require('../../src/lib/database/queries');

describe('Database Module', () => {
  let db;

  // Initialize a fresh, isolated in-memory database before each test.
  beforeEach(async () => {
    db = await connectToDatabase(':memory:');
  });

  // Close connection after each test to free system memory.
  afterEach((done) => {
    db.close(done);
  });

  // ---------------------------------------------------------------------------
  // Connection and Schema Initialization
  // ---------------------------------------------------------------------------
  describe('connectToDatabase', () => {
    test('establishes connection and creates tables successfully', (done) => {
      // Query sqlite_master to verify that the table structures exist.
      db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, rows) => {
        expect(err).toBeNull();
        const tableNames = rows.map(r => r.name);
        expect(tableNames).toContain('stocks');
        expect(tableNames).toContain('stock_data');
        expect(tableNames).toContain('analysis_results');
        done();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Stock Metadata Queries
  // ---------------------------------------------------------------------------
  describe('saveStock and getStock', () => {
    test('inserts metadata and retrieves it correctly', async () => {
      const stock = { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'US' };
      const id = await saveStock(db, stock);
      
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);

      const retrieved = await getStock(db, 'TSLA');
      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(id);
      expect(retrieved.symbol).toBe('TSLA');
      expect(retrieved.name).toBe('Tesla, Inc.');
      expect(retrieved.market).toBe('US');
    });

    test('ignores duplicate inserts and returns the same ID', async () => {
      const stock = { symbol: 'AAPL', name: 'Apple Inc.', market: 'US' };
      const id1 = await saveStock(db, stock);
      const id2 = await saveStock(db, stock);

      expect(id1).toBe(id2);

      // Verify that there is still only one row in the table.
      return new Promise((resolve, reject) => {
        db.all("SELECT * FROM stocks WHERE symbol = 'AAPL';", (err, rows) => {
          if (err) reject(err);
          expect(rows.length).toBe(1);
          resolve();
        });
      });
    });

    test('returns null for non-existent stock symbols', async () => {
      const result = await getStock(db, 'NONE');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Stock Pricing Queries
  // ---------------------------------------------------------------------------
  describe('saveStockData and getStockData', () => {
    test('batch inserts price records and retrieves sorted time-series', async () => {
      const symbol = 'AAPL';
      const dailyData = [
        { date: '2026-07-10', open: 180, high: 182, low: 179, close: 181, volume: 50000 },
        { date: '2026-07-11', open: 181, high: 183, low: 180, close: 182, volume: 60000 }
      ];

      await saveStockData(db, symbol, dailyData);

      const retrieved = await getStockData(db, symbol);
      expect(retrieved.length).toBe(2);
      
      // Sorted chronologically (ASC)
      expect(retrieved[0].date).toBe('2026-07-10');
      expect(retrieved[0].close).toBe(181);
      expect(retrieved[1].date).toBe('2026-07-11');
      expect(retrieved[1].close).toBe(182);

      // Verify that stocks table automatically registered the symbol metadata
      const stockMeta = await getStock(db, symbol);
      expect(stockMeta).not.toBeNull();
      expect(stockMeta.symbol).toBe('AAPL');
    });

    test('updates existing price points on duplicate dates (INSERT OR REPLACE)', async () => {
      const symbol = 'TSLA';
      const initial = [{ date: '2026-07-12', open: 250, high: 255, low: 248, close: 252, volume: 40000 }];
      const updated = [{ date: '2026-07-12', open: 250, high: 260, low: 248, close: 258, volume: 45000 }];

      await saveStockData(db, symbol, initial);
      await saveStockData(db, symbol, updated);

      const data = await getStockData(db, symbol);
      expect(data.length).toBe(1);
      expect(data[0].high).toBe(260); // Updated value
      expect(data[0].close).toBe(258); // Updated value
    });

    test('returns empty array for stocks with no pricing records', async () => {
      const data = await getStockData(db, 'NO_DATA');
      expect(data).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Analysis Results Queries
  // ---------------------------------------------------------------------------
  describe('saveAnalysisResults and getLatestAnalysisResults', () => {
    test('serializes and de-serializes nested analysis objects correctly', async () => {
      const symbol = 'TSLA';
      const date = '2026-07-12';
      const analysisPayload = {
        technical: { rsi: [35], ma: [240] },
        fundamental: { pe: { status: 'Fair' } },
        news: { financialNews: { score: 0.2 } },
        advice: { buySell: { action: 'Buy' } }
      };

      await saveAnalysisResults(db, symbol, date, analysisPayload);

      const latest = await getLatestAnalysisResults(db, symbol);
      expect(latest).not.toBeNull();
      expect(latest.date).toBe(date);
      
      // Sub-objects should be parsed back from strings to JSON
      expect(latest.technical).toEqual(analysisPayload.technical);
      expect(latest.fundamental).toEqual(analysisPayload.fundamental);
      expect(latest.news).toEqual(analysisPayload.news);
      expect(latest.advice).toEqual(analysisPayload.advice);
    });

    test('returns latest entry based on date order', async () => {
      const symbol = 'AAPL';
      const olderAnalysis = { technical: { rsi: [50] } };
      const newerAnalysis = { technical: { rsi: [30] } };

      await saveAnalysisResults(db, symbol, '2026-07-10', olderAnalysis);
      await saveAnalysisResults(db, symbol, '2026-07-11', newerAnalysis);

      const latest = await getLatestAnalysisResults(db, symbol);
      expect(latest).not.toBeNull();
      expect(latest.date).toBe('2026-07-11');
      expect(latest.technical.rsi).toEqual([30]);
    });

    test('returns null if no analysis exists', async () => {
      const latest = await getLatestAnalysisResults(db, 'UNKNOWN');
      expect(latest).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Leaderboard / Backtest Queries
  // ---------------------------------------------------------------------------
  describe('getLatestBacktestResults', () => {
    test('retrieves the latest backtest results and maps fields correctly', async () => {
      const olderAnalysis = { backtest: { winRate5d: 0.6, avgReturn5d: 2.5 } };
      const newerAnalysis = { backtest: { winRate5d: 0.8, avgReturn5d: 12.0 } };
      const otherStockAnalysis = { backtest: { winRate5d: 0.7, avgReturn5d: 5.5 } };

      await saveAnalysisResults(db, 'AAPL', '2026-07-10', olderAnalysis);
      await saveAnalysisResults(db, 'AAPL', '2026-07-11', newerAnalysis);
      await saveAnalysisResults(db, 'TSLA', '2026-07-11', otherStockAnalysis);

      const results = await getLatestBacktestResults(db);
      expect(results.length).toBe(2);

      const aapl = results.find(r => r.symbol === 'AAPL');
      const tsla = results.find(r => r.symbol === 'TSLA');

      expect(aapl).toBeDefined();
      expect(aapl.rate).toBe(0.8);
      expect(aapl.ret).toBe(12.0);
      expect(aapl.date).toBe('2026-07-11');

      expect(tsla).toBeDefined();
      expect(tsla.rate).toBe(0.7);
      expect(tsla.ret).toBe(5.5);
      expect(tsla.date).toBe('2026-07-11');
    });

    test('ignores records without backtest field', async () => {
      const noBacktestAnalysis = { technical: { rsi: [50] } };
      await saveAnalysisResults(db, 'MSFT', '2026-07-11', noBacktestAnalysis);

      const results = await getLatestBacktestResults(db);
      const msft = results.find(r => r.symbol === 'MSFT');
      expect(msft).toBeUndefined();
    });
  });
});
