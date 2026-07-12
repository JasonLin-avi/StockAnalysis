const yahoo = require('./yahoo-finance');
const google = require('./google-finance');

/**
 * Fetches current stock data with Yahoo Finance as primary and Google Finance as fallback.
 * @param {string} symbol - Stock symbol (e.g. 'AAPL')
 * @returns {Promise<Object>} Standardized stock data
 */
async function fetchStockData(symbol) {
  try {
    return await yahoo.fetchStockData(symbol);
  } catch (yahooError) {
    try {
      return await google.fetchStockData(symbol);
    } catch (googleError) {
      throw new Error(
        `Failed to fetch stock data for ${symbol}: Yahoo (${yahooError.message}), Google (${googleError.message})`
      );
    }
  }
}

/**
 * Fetches historical data with Yahoo Finance as primary and Google Finance as fallback.
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time range (default: '1mo')
 * @returns {Promise<Object>} Standardized historical data
 */
async function fetchHistoricalData(symbol, period = '1mo') {
  try {
    return await yahoo.fetchHistoricalData(symbol, period);
  } catch (yahooError) {
    try {
      return await google.fetchHistoricalData(symbol, period);
    } catch (googleError) {
      throw new Error(
        `Failed to fetch historical data for ${symbol}: Yahoo (${yahooError.message}), Google (${googleError.message})`
      );
    }
  }
}

module.exports = { fetchStockData, fetchHistoricalData };
