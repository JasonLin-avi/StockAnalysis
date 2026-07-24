const { connectToDatabase } = require('../../src/lib/database/connection');
// Why: Use libsql-adapter to replace sqlite3 import in test suite.
const sqlite3 = require('../../src/lib/database/libsql-adapter');

describe('Database Migration Tests', () => {
  let db;
  beforeEach(async () => {
    // 建立一個在記憶體中的乾淨資料庫以進行隔離測試
    db = await connectToDatabase(':memory:');
  });

  afterEach((done) => {
    db.close(done);
  });

  test('analysis_results table should contain backtest column', (done) => {
    db.all("PRAGMA table_info(analysis_results);", (err, columns) => {
      expect(err).toBeNull();
      const hasBacktest = columns.some(col => col.name === 'backtest');
      expect(hasBacktest).toBe(true);
      done();
    });
  });
});
