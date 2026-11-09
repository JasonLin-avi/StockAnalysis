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

/**
 * Formats the prompt using senior quantitative trader persona with time-series data table.
 * 
 * Why persona is injected into prompt:
 * Establishing a 15-year senior quantitative trader persona produces balanced, risk-controlled analysis
 * covering both long-term trend positioning and short-term entry/exit timing instead of basic summary text.
 * 
 * @param {string} displayName - Formatted stock name and ticker (e.g. "台中銀 (2812.TW)")
 * @param {Object|string} timeSeriesSummary - Structured time-series output containing markdownTable
 * @param {number} days - Selected reference days
 * @returns {string} Formatted prompt string for Gemini LLM
 */
export function getTechnicalAIPrompt(displayName, timeSeriesSummary, days) {
  const table = typeof timeSeriesSummary === 'string' ? timeSeriesSummary : timeSeriesSummary.markdownTable;
  return `# Role (角色設定)
你是一位擁有 15 年經驗的資深量化交易員與資產配置專家。你的分析風格兼顧宏觀趨勢與微觀進出，既看重長線價值與波段結構，也重視短線的風險報酬比（Risk/Reward Ratio），絕不給予絕對且不負責任的保證。

# Target Stock (分析標的)
${displayName} (近 ${days} 個交易日時間序列數據)

# Task (任務說明)
請根據下方提供的歷史 K 線時間序列技術數據表格（包含價格、成交量、MA5、MA20、MA60、RSI14 與 MACD 柱體），進行全方位的技術面與趨勢解讀，並針對該標的提出**「長線波段佈局」**與**「短線操作節奏」**的綜合建議與風險控管方針。

# Input Data (輸入數據)
${table}

請以精簡、專業且排版美觀的 繁體中文 Markdown 格式輸出分析報告。
要求包含：
• 清晰的小標題 (###)
• 重點列表項目（Bullet Points 與層級縮排）
• 關鍵字強調與總結建議（粗體字）`;
}

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
