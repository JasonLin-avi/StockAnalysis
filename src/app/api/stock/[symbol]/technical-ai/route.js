/**
 * @fileoverview Technical AI Interpretation API Route
 * Generates and caches senior quantitative trader AI interpretation of K-line technical data
 * using Gemini model with Grounding enabled.
 * 
 * Why this architecture is selected:
 * - SQLite caching (`stock_prompt_analysis`) prevents redundant costly Gemini API calls for the same symbol on the same day.
 * - Minimum 60-day historical data threshold guarantees indicator stability (MA60, MACD signal line, KD stochastic)
 *   before feeding structured features into the LLM prompt.
 * - Grounding enabled via `googleSearch: {}` allows Gemini to incorporate recent macro news context into technical analysis.
 * 
 * @module api/stock/[symbol]/technical-ai
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../external/database/connection';
import { saveStock, getHistoricalPricesFromDB, getPromptAnalysis, savePromptAnalysis } from '../../../../../external/database/queries';
import { syncStockPricesIncremental } from '../../../../../lib/data-fetcher';
import { generateLLMTechnicalSummary } from '../../../../../lib/technical-analysis/klineanalysis';
import { callGemini } from '../../../../../lib/gemini/client';

export const dynamic = 'force-dynamic';

/**
 * Formats the prompt using senior quantitative trader persona.
 * 
 * Why persona is injected into prompt:
 * Establishing a 15-year senior quantitative trader persona produces balanced, risk-controlled analysis
 * covering both long-term trend positioning and short-term entry/exit timing instead of basic summary text.
 * 
 * @param {string} symbol - Stock ticker symbol
 * @param {Object} summaryJson - Structured technical features calculated from price history
 * @returns {string} Formatted prompt string for Gemini LLM
 */
function getTechnicalAIPrompt(symbol, summaryJson) {
  return `# Role (角色設定)
你是一位擁有 15 年經驗的資深量化交易員與資產配置專家。你的分析風格兼顧宏觀趨勢與微觀進出，既看重長線價值與波段結構，也重視短線的風險報酬比（Risk/Reward Ratio），絕不給予絕對且不負責任的保證。

# Target Stock (分析標的)
${symbol}

# Task (任務說明)
請根據下方提供的結構化技術特徵 JSON 數據（包含短中長線指標），進行全方位的技術面與趨勢解讀，並針對該標的提出**「長線波段佈局」**與**「短線操作節奏」**的綜合建議與風險控管方針。

# Input Data (輸入數據)
\`\`\`json
${JSON.stringify(summaryJson, null, 2)}
\`\`\`

請以精簡、專業且排版美觀的 繁體中文 Markdown 格式輸出分析報告。
要求包含：
• 清晰的小標題 (###)
• 重點列表項目（Bullet Points 與層級縮排）
• 關鍵字強調與總結建議（粗體字）`;
}

export async function GET(request, context) {
  try {
    const params = await (context?.params || {});
    const symbol = params?.symbol;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    const upperSymbol = symbol.toUpperCase();
    const db = await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Check DB cache first to avoid unnecessary database lookups and API calls
    const cached = await getPromptAnalysis(db, upperSymbol, 'technical', today);
    if (cached) {
      return NextResponse.json({ markdown: cached }, { status: 200 });
    }

    // Ensure stock record exists and sync incremental price data
    const stockId = await saveStock(db, {
      symbol: upperSymbol,
      market: upperSymbol.includes('.') ? 'TW' : 'US'
    });

    if (typeof syncStockPricesIncremental === 'function') {
      try {
        await syncStockPricesIncremental(db, stockId, upperSymbol);
      } catch (syncErr) {
        console.warn(`[API_TECHNICAL_AI] Incremental sync warning for ${upperSymbol}:`, syncErr.message);
      }
    }

    const prices = await getHistoricalPricesFromDB(db, stockId);

    // Minimum 60 trading days required to accurately compute MA60 and longer term trend metrics
    if (!prices || prices.length < 60) {
      const fallbackMarkdown = `### ⚠️ 數據不足提示\n\n歷史交易數據不足（少於 60 個交易日），無法計算完整長短線指標與生成 AI 深度技術解讀。`;
      return NextResponse.json({ markdown: fallbackMarkdown }, { status: 200 });
    }

    const rawData = {
      dates: prices.map(p => p.date),
      opens: prices.map(p => p.open),
      highs: prices.map(p => p.high),
      lows: prices.map(p => p.low),
      closes: prices.map(p => p.close),
      volumes: prices.map(p => p.volume)
    };

    const summaryJson = generateLLMTechnicalSummary(rawData);
    const prompt = getTechnicalAIPrompt(upperSymbol, summaryJson);

    const markdown = await callGemini(prompt, {
      tools: [{ googleSearch: {} }]
    });

    await savePromptAnalysis(db, upperSymbol, 'technical', today, markdown);

    return NextResponse.json({ markdown }, { status: 200 });
  } catch (error) {
    console.error('[API_TECHNICAL_AI] Exception in GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
