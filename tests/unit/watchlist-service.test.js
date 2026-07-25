// Why: Test suite for Watchlist Service to verify CRUD operations on the SQLite database.
// We use an in-memory database configuration to avoid interfering with physical test/prod data.

import { connectToDatabase } from '../../src/external/database/connection';
import { 
  getWatchlistSymbols, 
  addSymbolToWatchlist, 
  removeSymbolFromWatchlist 
} from '../../src/services/watchlist.service';

describe('Watchlist Service', () => {
  let db;

  beforeEach(async () => {
    // Why: Using ':memory:' ensures that each test runs against a clean, isolated database.
    db = await connectToDatabase(':memory:');
  });

  afterEach((done) => {
    // Why: Ensure the in-memory database connection is closed after each test to release resources.
    db.close(done);
  });

  it('should fetch watchlist symbols', async () => {
    // Why: Verifies that an empty watchlist initially returns an empty array.
    const symbols = await getWatchlistSymbols();
    expect(Array.isArray(symbols)).toBe(true);
    expect(symbols.length).toBe(0);
  });

  it('should add a symbol to watchlist', async () => {
    // Why: Verifies that adding a valid symbol successfully returns success status.
    const res = await addSymbolToWatchlist('AAPL');
    expect(res.success).toBe(true);

    const symbols = await getWatchlistSymbols();
    expect(symbols).toContain('AAPL');
  });

  it('should remove a symbol from watchlist', async () => {
    // Why: Verifies that deleting a symbol removes it from the list while keeping other symbols.
    await addSymbolToWatchlist('AAPL');
    await addSymbolToWatchlist('MSFT');

    const res = await removeSymbolFromWatchlist('AAPL');
    expect(res.success).toBe(true);

    const symbols = await getWatchlistSymbols();
    expect(symbols).not.toContain('AAPL');
    expect(symbols).toContain('MSFT');
  });

  it('should throw error when adding empty, whitespace-only, or invalid symbol type', async () => {
    // Why: Verifies validation logic that errors out when invalid, empty, or whitespace-only symbols are provided.
    await expect(addSymbolToWatchlist(null)).rejects.toThrow("Missing symbol");
    await expect(addSymbolToWatchlist('')).rejects.toThrow("Missing symbol");
    await expect(addSymbolToWatchlist('   ')).rejects.toThrow("Missing symbol");
    await expect(addSymbolToWatchlist(123)).rejects.toThrow("Missing symbol");
  });
});
