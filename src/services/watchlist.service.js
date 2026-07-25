// Why: Provide a centralized service layer for Watchlist operations, decoupling API endpoints from database concerns.
// Following Clean Architecture principles, this service abstracts database accesses for watchlist retrieval, addition, and deletion.

import { getActiveDatabase, connectToDatabase } from '../external/database/connection';
import { getWatchlist, saveWatchlist, removeWatchlist } from '../external/database/queries';

/**
 * Retrieves all stock symbols currently in the watchlist, ordered by their added timestamp descending.
 * @returns {Promise<string[]>} List of watchlist stock symbols
 */
export async function getWatchlistSymbols() {
  // Why: Reusing an active connection is cheaper, but we must fallback to establishing a new one if none exists (e.g. initial launch or test isolation).
  const db = getActiveDatabase() || await connectToDatabase();
  // Why: Delegate database query execution to centralized query helper module, containing ZERO raw SQL strings.
  return getWatchlist(db);
}

/**
 * Adds a new stock symbol to the watchlist database.
 * @param {string} symbol - The stock symbol to add (e.g., AAPL)
 * @returns {Promise<{success: boolean}>} Result status
 */
export async function addSymbolToWatchlist(symbol) {
  // Why: Enforce strict input validation to prevent invalid, empty, or whitespace-only symbols from entering database.
  if (typeof symbol !== 'string' || !symbol.trim()) {
    throw new Error("Missing symbol");
  }
  
  const db = getActiveDatabase() || await connectToDatabase();
  // Why: Delegate to promise-wrapped database helper function instead of raw SQL.
  await saveWatchlist(db, symbol);
  return { success: true };
}

/**
 * Removes a stock symbol from the watchlist database.
 * @param {string} symbol - The stock symbol to remove
 * @returns {Promise<{success: boolean}>} Result status
 */
export async function removeSymbolFromWatchlist(symbol) {
  // Why: Enforce strict input validation to prevent executing deletes with invalid, empty, or whitespace-only inputs.
  if (typeof symbol !== 'string' || !symbol.trim()) {
    throw new Error("Missing symbol");
  }

  const db = getActiveDatabase() || await connectToDatabase();
  // Why: Delegate to promise-wrapped database helper function instead of raw SQL.
  await removeWatchlist(db, symbol);
  return { success: true };
}
