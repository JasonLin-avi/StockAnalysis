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

/**
 * Fetches fundamental metrics (Yahoo Finance primary).
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Standardized fundamental metrics
 */
async function fetchFundamentalData(symbol) {
  try {
    return await yahoo.fetchFundamentalData(symbol);
  } catch (err) {
    console.warn(`Fundamental fetch failed for ${symbol}, returning empty metrics: ${err.message}`);
    return {
      eps: null,
      debtRatio: null,
      revenueGrowth: null,
      operatingCashFlow: null,
      capitalExpenditures: null,
      historicalEps: []
    };
  }
}

const { getMaxPriceDate, insertStockDataBatch, getHistoricalPricesFromDB } = require('../database/queries');

/**
 * Incrementally syncs prices from Yahoo/Google Finance to SQLite local db.
 * 
 * Why:
 * Doing incremental sync limits bandwidth and avoids API rate limiting by only fetching new prices.
 * If no previous data exists, we pull 3 years to build a decent pattern sample library.
 * If data exists, we fetch the last 1 month to close the gap safely without hitting limit bounds.
 * 
 * @param {sqlite3.Database} db 
 * @param {number} stockId 
 * @param {string} symbol 
 * @returns {Promise<boolean>}
 */
async function syncStockPricesIncremental(db, stockId, symbol) {
  try {
    const maxDateStr = await getMaxPriceDate(db, stockId);
    let historicalData = [];

    if (!maxDateStr) {
      // Why: First time query, pull 3 years of historical data to build pattern sample library.
      // fetchHistoricalData returns an object containing 'data' as the actual array, so we must extract it.
      const result = await fetchHistoricalData(symbol, '3y');
      historicalData = result.data || [];
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const maxDate = new Date(maxDateStr);
      const now = new Date(today);
      const diffDays = Math.ceil((now - maxDate) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        // Why: Only fetch incremental data if there are missing days.
        // Yahoo allows fetching 1mo or 3mo period, which is small and fast.
        // We extract the data array from the returned { symbol, period, data: [...] } structure.
        const result = await fetchHistoricalData(symbol, '1mo');
        const rawData = result.data || [];
        // Filter out dates we already have
        historicalData = rawData.filter(d => d.date > maxDateStr);
      }
    }

    if (historicalData.length > 0) {
      await insertStockDataBatch(db, stockId, historicalData);
    }
    return true;
  } catch (error) {
    console.error(`[SYNC] Failed to sync ${symbol}:`, error);
    return false;
  }
}

/**
 * Fetches local persistent 3-year prices for analysis.
 * 
 * Why:
 * Technical analysis calculations (like SMA-200, MACD) require multiple years of clean, 
 * contiguous daily closing prices to avoid warmup period calculation bias.
 * 
 * @param {sqlite3.Database} db 
 * @param {number} stockId 
 * @returns {Promise<Array>}
 */
async function getLocal3YearPrices(db, stockId) {
  return await getHistoricalPricesFromDB(db, stockId);
}

module.exports = {
  fetchStockData,
  fetchHistoricalData,
  fetchFundamentalData,
  syncStockPricesIncremental,
  getLocal3YearPrices
};

