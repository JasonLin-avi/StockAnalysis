/**
 * Backtest Service for Point-in-Time LLM Analysis & Evaluation
 *
 * Why: Separates historical data splitting logic from prediction/evaluation routines to strictly prevent lookahead bias.
 */

/**
 * Splits historical K-line data at a given cutoff date.
 * Past data up to and including the cutoff date is made available for analysis,
 * while future data after cutoff date is isolated for evaluation.
 *
 * @param {Array} klines - Array of K-line candle objects containing date/time and price fields.
 * @param {string} cutoffDate - ISO date string representing the cutoff point.
 * @param {number} predictionDays - Number of days to include in the future set (default: 20).
 * @returns {{ pastKlines: Array, futureKlines: Array }} Object containing past and future klines.
 */
export function splitHistoricalKlines(klines, cutoffDate, predictionDays = 20) {
  // Why: Guard against empty or invalid datasets to ensure system stability.
  if (!Array.isArray(klines) || klines.length === 0) {
    return { pastKlines: [], futureKlines: [] };
  }

  // Why: Attempt exact date match first to maintain candle sequence boundary integrity.
  const cutoffIndex = klines.findIndex(k => k.date === cutoffDate || k.time === cutoffDate);
  if (cutoffIndex === -1) {
    // Why: Fallback to string date filtering if exact index is not found (e.g. timestamp or weekend dates).
    const past = klines.filter(k => (k.date || k.time) <= cutoffDate);
    const future = klines.filter(k => (k.date || k.time) > cutoffDate).slice(0, predictionDays);
    return { pastKlines: past, futureKlines: future };
  }

  const pastKlines = klines.slice(0, cutoffIndex + 1);
  const futureKlines = klines.slice(cutoffIndex + 1, cutoffIndex + 1 + predictionDays);

  return { pastKlines, futureKlines };
}

import { connectToDatabase, getActiveDatabase } from '../external/database/connection';
import { saveStock, getStockData, insertStockDataBatch } from '../external/database/queries';
import { fetchHistoricalData } from '../external/data-fetcher';

/**
 * Retrieves historical K-lines from SQLite database first.
 * If database is empty or missing data around the cutoffDate, incrementally fetches from Yahoo Finance
 * and saves into database to prevent hitting API repeatedly.
 *
 * @param {string} symbol - Stock ticker symbol
 * @param {string} cutoffDate - Cutoff date string
 * @returns {Promise<Array>} Array of clean historical K-lines
 */
export async function getOrSyncKlines(symbol, cutoffDate) {
  const ticker = symbol.toUpperCase();
  const activeDb = getActiveDatabase() || await connectToDatabase();
  const stockId = await saveStock(activeDb, { symbol: ticker, market: ticker.includes('.') ? 'TW' : 'US' });

  // 1. Read existing K-lines from local database
  let dbKlines = await getStockData(activeDb, ticker);

  // Check if we have data up to and past cutoffDate
  const hasPastData = dbKlines.some(k => k.date <= cutoffDate);
  const hasFutureData = dbKlines.some(k => k.date > cutoffDate);

  if (dbKlines.length === 0 || !hasPastData || !hasFutureData) {
    // 2. Database missing data around cutoffDate -> Fetch 2y from Yahoo Finance and persist
    try {
      const rawResult = await fetchHistoricalData(ticker, '2y');
      const fetchedKlines = rawResult.data || [];

      if (fetchedKlines.length > 0) {
        await insertStockDataBatch(activeDb, stockId, fetchedKlines);
        dbKlines = await getStockData(activeDb, ticker);
      }
    } catch (err) {
      console.warn(`[Backtest DB Sync] Failed to fetch remote prices for ${ticker}:`, err.message);
    }
  }

  return dbKlines;
}

/**
 * Preset historical backtest cases for easy demonstration and sandbox testing.
 *
 * Why: Allows users to immediately run benchmark historical scenarios without manually searching dates.
 */
export const PRESET_CASES = [
  {
    id: 'tsmc-2024-breakout',
    symbol: '2330.TW',
    cutoffDate: '2024-03-01',
    title: '台積電千元前夕突破點',
    description: '站在 2024-03-01 時間點，評估台積電突破多頭攻擊訊號。'
  },
  {
    id: 'nvda-2023-earnings',
    symbol: 'NVDA',
    cutoffDate: '2023-05-15',
    title: 'NVIDIA 財報大漲前夕',
    description: '站在 2023 年 AI 狂潮爆發初期，讓 LLM 分析型態。'
  }
];
