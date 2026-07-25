const { syncStockPricesIncremental } = require('../external/data-fetcher');

/**
 * Coordinates stock price synchronization from external fetchers to the local database.
 * Why: Moves integration workflow orchestration out of infrastructure components into a service layer,
 * decoupling external network boundaries from internal application orchestration.
 * 
 * @param {sqlite3.Database} db - Active SQLite database connection
 * @param {number} stockId - Internal unique stock identifier
 * @param {string} ticker - External ticker symbol
 * @returns {Promise<boolean>} Success indicator
 */
async function syncStockPrices(db, stockId, ticker) {
  return syncStockPricesIncremental(db, stockId, ticker);
}

module.exports = { syncStockPrices };
