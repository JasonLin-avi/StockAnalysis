// Why: Provide a centralized service layer for Watchlist operations, decoupling API endpoints from database concerns.
// Following Clean Architecture principles, this service abstracts database accesses for watchlist retrieval, addition, and deletion.

const { getActiveDatabase, connectToDatabase } = require('../external/database/connection');

/**
 * Retrieves all stock symbols currently in the watchlist, ordered by their added timestamp descending.
 * @returns {Promise<string[]>} List of watchlist stock symbols
 */
async function getWatchlistSymbols() {
  // Why: Reusing an active connection is cheaper, but we must fallback to establishing a new one if none exists (e.g. initial launch or test isolation).
  const db = getActiveDatabase() || await connectToDatabase();
  return new Promise((resolve, reject) => {
    // Why: Retrieve only the symbol string to keep payload small and fast for upstream callers.
    db.all("SELECT symbol FROM watchlist ORDER BY added_at DESC", [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(row => row.symbol));
    });
  });
}

/**
 * Adds a new stock symbol to the watchlist database.
 * @param {string} symbol - The stock symbol to add (e.g., AAPL)
 * @returns {Promise<{success: boolean}>} Result status
 */
async function addSymbolToWatchlist(symbol) {
  // Why: Avoid entering corrupt or null values into the database which would break unique constraints and search logic.
  if (!symbol) throw new Error("Missing symbol");
  
  const db = getActiveDatabase() || await connectToDatabase();
  return new Promise((resolve, reject) => {
    // Why: Use INSERT OR IGNORE and toUpperCase to ensure no duplicate or casing inconsistencies exist in the watchlist.
    db.run("INSERT OR IGNORE INTO watchlist (symbol) VALUES (?)", [symbol.toUpperCase()], function(err) {
      if (err) return reject(err);
      resolve({ success: true });
    });
  });
}

/**
 * Removes a stock symbol from the watchlist database.
 * @param {string} symbol - The stock symbol to remove
 * @returns {Promise<{success: boolean}>} Result status
 */
async function removeSymbolFromWatchlist(symbol) {
  // Why: Avoid running delete statements with null/undefined values to prevent accidental mass deletions or unexpected query behavior.
  if (!symbol) throw new Error("Missing symbol");

  const db = getActiveDatabase() || await connectToDatabase();
  return new Promise((resolve, reject) => {
    // Why: Delete the symbol based on upper-case representation for matching consistency.
    db.run("DELETE FROM watchlist WHERE symbol = ?", [symbol.toUpperCase()], function(err) {
      if (err) return reject(err);
      resolve({ success: true });
    });
  });
}

module.exports = { 
  getWatchlistSymbols, 
  addSymbolToWatchlist, 
  removeSymbolFromWatchlist 
};
