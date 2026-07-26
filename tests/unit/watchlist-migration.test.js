// Why: Test that the watchlist table is properly created during database initialization.
// Uses connectToDatabase (which runs schema including watchlist table) instead of
// executing the migration script as a subprocess, avoiding ESM resolution issues.
import { connectToDatabase } from '../../src/external/database/connection';

describe('Watchlist Migration', () => {
  let db;

  beforeAll(async () => {
    // Why: Use in-memory database for test isolation. connectToDatabase applies the full schema
    // including the watchlist table creation, mirroring production initialization.
    db = await connectToDatabase(':memory:');
  });

  afterAll((done) => {
    db.close(done);
  });

  it('creates the watchlist table', (done) => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='watchlist'", (err, row) => {
      expect(err).toBeNull();
      expect(row).toBeDefined();
      expect(row.name).toBe('watchlist');
      done();
    });
  });

  it('watchlist table has correct columns', (done) => {
    db.all("PRAGMA table_info(watchlist);", (err, columns) => {
      expect(err).toBeNull();
      const colNames = columns.map(c => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('symbol');
      expect(colNames).toContain('added_at');
      done();
    });
  });
});
