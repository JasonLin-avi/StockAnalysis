/**
 * @fileoverview Fundamental AI Service Layer
 * 
 * Why this service exists:
 * - Decouples fundamental AI analysis, Prompt assembly, SQLite 7-day caching,
 *   and Gemini Google Search grounded calls from Next.js route handlers.
 * - Adheres to Clean Architecture by establishing clear business domain boundaries.
 * 
 * @module services/fundamental.service
 */

import { callGemini } from '../external/gemini/client.js';
import { connectToDatabase } from '../external/database/connection.js';
import { getRecentPromptAnalysis, savePromptAnalysis } from '../external/database/queries.js';
import { getCompanyNameByCode, formatStockName } from '../lib/stock-map.js';
import logger from '../lib/logger.js';

/**
 * Generates prompt for fundamental stock analysis.
 * 
 * @param {string} displayName - Formatted company name and symbol
 * @returns {string} Prompt text
 */
export function getFundamentalPrompt(displayName) {
  return `以華爾街資深股票分析師的角度進行完整分析。
分析股票：${displayName}
內容包括：
• 商業模式與收入來源
• 競爭優勢（護城河）
• 產業趨勢
• 財務健康狀況（營收成長、利潤率、負債）
• 關鍵風險
• 與競爭對手的估值比較
• 多頭、空頭與基本情境分析
• 未來 12–24 個月展望
請用簡單易懂的方式解釋，但保有專業分析深度。`;
}

/**
 * Performs fundamental AI stock analysis with 7-day SQLite cache check.
 * 
 * @param {string} symbol - Stock ticker symbol
 * @param {Object} [options] - Optional dependency injection overrides
 * @returns {Promise<{markdown: string}>}
 */
export async function getFundamentalAnalysis(symbol, options = {}) {
  const upperSymbol = symbol.toUpperCase();
  const db = options.db || (await connectToDatabase());
  const today = new Date().toISOString().split('T')[0];

  // 1. Query cache using 7-day window to reduce unnecessary AI API calls
  const cached = await getRecentPromptAnalysis(db, upperSymbol, 'fundamental', 7);
  if (cached) {
    logger.info('FUNDAMENTAL_SERVICE', `7-day cache hit for ${upperSymbol} fundamental analysis`);
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
    logger.warn('FUNDAMENTAL_SERVICE', `Could not resolve company name for ${upperSymbol}`);
  }

  // 3. Assemble prompt & invoke Gemini with search grounding
  const prompt = getFundamentalPrompt(displayName);
  const markdown = await callGemini(prompt, {
    tools: [{ googleSearch: {} }]
  });

  if (!markdown || !markdown.trim()) {
    throw new Error('AI 基本面分析生成內容為空');
  }

  // 4. Save to cache
  await savePromptAnalysis(db, upperSymbol, 'fundamental', today, markdown);

  return { markdown };
}

export default {
  getFundamentalAnalysis,
  getFundamentalPrompt
};
