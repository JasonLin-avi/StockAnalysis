/**
 * @fileoverview Technical AI Service Layer
 * 
 * Why this service exists:
 * - Decouples AI prompt generation, SQLite cache lookup/storage, and Gemini LLM invocation
 *   from the Next.js API presentation/route layer, conforming to Clean Architecture.
 * - Centralizes technical analysis LLM prompts and historical threshold checks.
 * - Prevents repetitive expensive LLM calls using daily date-keyed SQLite prompt analysis cache.
 * 
 * @module services/technical-ai.service
 */

import { connectToDatabase } from '../external/database/connection.js';
import {
  saveStock,
  getHistoricalPricesFromDB,
  getPromptAnalysis,
  savePromptAnalysis,
  getMaxPriceDate
} from '../external/database/queries.js';
import { syncStockPrices } from './data-sync.service.js';
import { generateLLMTimeSeriesSummary } from '../lib/technical-analysis/klineanalysis.js';
import { callGemini } from '../external/gemini/client.js';
import { getCompanyNameByCode, formatStockName } from '../lib/stock-map.js';
import logger from '../lib/logger.js';
import { getTechnicalAIPrompt } from '../lib/prompts/index.js';

export { getTechnicalAIPrompt };

/**
 * Generates technical AI analysis for a given symbol and time horizon.
 * 
 * Why this workflow is orchestrated here:
 * 1. Checks SQLite prompt analysis cache keyed by symbol and max price date.
 * 2. Enforces minimum 60-day historical data threshold for indicator stability.
 * 3. Enriches symbol with localized Taiwanese/US company names to prevent LLM hallucinations.
 * 4. Invokes Gemini with Google Search grounding for recent macro context.
 * 5. Persists the result back into SQLite cache for identical queries.
 * 
 * @param {string} symbol - Stock symbol (e.g., '2330.TW', 'AAPL')
 * @param {number} [days=30] - Lookback days (between 5 and 120)
 * @param {Object} [options] - Optional overrides (e.g., db instance for testing)
 * @returns {Promise<{markdown: string, days: number}>}
 */
export async function getTechnicalAIAnalysis(symbol, days = 30, options = {}) {
  const upperSymbol = symbol.toUpperCase();
  const clampedDays = Math.max(5, Math.min(120, parseInt(days, 10) || 30));
  const cacheKey = `${upperSymbol}_technical_ai_${clampedDays}`;

  const db = options.db || (await connectToDatabase());

  // 1. Ensure stock record exists and trigger incremental price sync
  const stockId = await saveStock(db, {
    symbol: upperSymbol,
    market: upperSymbol.includes('.') ? 'TW' : 'US'
  });

  if (typeof syncStockPrices === 'function') {
    try {
      await syncStockPrices(db, stockId, upperSymbol);
    } catch (syncErr) {
      logger.warn('TECHNICAL_AI_SERVICE', `Incremental sync warning for ${upperSymbol}: ${syncErr.message}`);
    }
  }

  // 2. Determine latest price date in DB (max_date) to use as cache date key
  const maxDate = await getMaxPriceDate(db, stockId);
  const cacheDate = maxDate || new Date().toISOString().split('T')[0];

  // 3. Check DB cache first to avoid unnecessary database lookups and API calls
  const cached = await getPromptAnalysis(db, cacheKey, 'technical', cacheDate);
  if (cached) {
    logger.info('TECHNICAL_AI_SERVICE', `Cache hit for ${cacheKey} on ${cacheDate}`);
    return { markdown: cached, days: clampedDays };
  }

  // 4. Fetch price series from DB
  const prices = await getHistoricalPricesFromDB(db, stockId);

  // Minimum 60 trading days required to accurately compute MA60 and longer term trend metrics
  if (!prices || prices.length < 60) {
    const fallbackMarkdown = `### ⚠️ 數據不足提示\n\n歷史交易數據不足（少於 60 個交易日），無法計算完整長短線指標與生成 AI 深度技術解讀。`;
    return { markdown: fallbackMarkdown, days: clampedDays };
  }

  const rawData = {
    dates: prices.map(p => p.date),
    opens: prices.map(p => p.open),
    highs: prices.map(p => p.high),
    lows: prices.map(p => p.low),
    closes: prices.map(p => p.close),
    volumes: prices.map(p => p.volume)
  };

  let displayName = upperSymbol;
  try {
    const nameInfo = await getCompanyNameByCode(upperSymbol, { db });
    if (nameInfo && nameInfo.success && nameInfo.name) {
      displayName = formatStockName(nameInfo.name, upperSymbol);
    }
  } catch (e) {
    // Fallback to symbol
  }

  const timeSeriesSummary = generateLLMTimeSeriesSummary(rawData, clampedDays);
  const prompt = getTechnicalAIPrompt(displayName, timeSeriesSummary, clampedDays);

  const markdown = await callGemini(prompt, {
    tools: [{ googleSearch: {} }]
  });

  if (!markdown || !markdown.trim()) {
    throw new Error('AI 技術面分析生成內容為空');
  }

  await savePromptAnalysis(db, cacheKey, 'technical', cacheDate, markdown);

  return { markdown, days: clampedDays };
}

export default {
  getTechnicalAIAnalysis,
  getTechnicalAIPrompt
};
