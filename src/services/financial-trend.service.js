/**
 * @fileoverview Financial Trend AI Service Layer
 * 
 * Why this service exists:
 * - Decouples 5-year financial trend analysis, prompt formulation, SQLite 7-day caching,
 *   and Gemini Google Search grounded calls from Next.js route handlers.
 * - Adheres to Clean Architecture by maintaining business rules inside the service layer.
 * 
 * @module services/financial-trend.service
 */

import { callGemini } from '../external/gemini/client.js';
import { connectToDatabase } from '../external/database/connection.js';
import { getRecentPromptAnalysis, savePromptAnalysis } from '../external/database/queries.js';
import { getCompanyNameByCode, formatStockName } from '../lib/stock-map.js';
import logger from '../lib/logger.js';
import { getFinancialTrendPrompt } from '../lib/prompts/index.js';

export { getFinancialTrendPrompt };

/**
 * Performs 5-year financial trend AI stock analysis with 7-day SQLite cache check.
 * 
 * @param {string} symbol - Stock ticker symbol
 * @param {Object} [options] - Optional dependency injection overrides
 * @returns {Promise<{markdown: string}>}
 */
export async function getFinancialTrendAnalysis(symbol, options = {}) {
  const upperSymbol = symbol.toUpperCase();
  const db = options.db || (await connectToDatabase());
  const today = new Date().toISOString().split('T')[0];

  // 1. Query cache using 7-day window
  const cached = await getRecentPromptAnalysis(db, upperSymbol, 'financial_trend', 7);
  if (cached) {
    logger.info('FINANCIAL_TREND_SERVICE', `7-day cache hit for ${upperSymbol} financial trend`);
    return { markdown: cached };
  }

  // 2. Resolve stock Chinese company name to prevent LLM hallucinations
  let displayName = upperSymbol;
  try {
    const nameInfo = await getCompanyNameByCode(upperSymbol, { db });
    if (nameInfo && nameInfo.success && nameInfo.name) {
      displayName = formatStockName(nameInfo.name, upperSymbol);
    }
  } catch (e) {
    logger.warn('FINANCIAL_TREND_SERVICE', `Could not resolve company name for ${upperSymbol}`);
  }

  // 3. Assemble prompt & invoke Gemini with search grounding
  const prompt = getFinancialTrendPrompt(displayName);
  const markdown = await callGemini(prompt, {
    tools: [{ googleSearch: {} }]
  });

  if (!markdown || !markdown.trim()) {
    throw new Error('AI 財務趨勢分析生成內容為空');
  }

  // 4. Save to cache
  await savePromptAnalysis(db, upperSymbol, 'financial_trend', today, markdown);

  return { markdown };
}

export default {
  getFinancialTrendAnalysis,
  getFinancialTrendPrompt
};
