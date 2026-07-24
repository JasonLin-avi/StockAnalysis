// Why: Replace native sqlite3 with libsql-adapter in watchlist migration test.
const sqlite3 = require('../../src/lib/database/libsql-adapter');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '../../test-watchlist.db');

describe('Watchlist Migration', () => {
  let db;

  beforeAll(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    // Run migration script directly on test db
    process.env.DB_PATH = dbPath;
    try {
      execSync('node scripts/migrations/02_create_watchlist_table.js', { env: process.env });
    } catch (e) {} // Will fail initially
    db = new sqlite3.Database(dbPath);
  });

  afterAll((done) => {
    db.close(() => {
      if (fs.existsSync(dbPath)) {
        try {
          fs.unlinkSync(dbPath);
        } catch (e) {
          // Ignore EBUSY on Windows during temp file cleanup
        }
      }
      done();
    });
  });

  it('creates the watchlist table', (done) => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='watchlist'", (err, row) => {
      expect(err).toBeNull();
      expect(row).toBeDefined();
      expect(row.name).toBe('watchlist');
      done();
    });
  });
});
