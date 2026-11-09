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
import { saveStock, getHistoricalPricesFromDB, getPromptAnalysis, savePromptAnalysis, getMaxPriceDate } from '../../../../../external/database/queries';
import { syncStockPrices } from '../../../../../services/data-sync.service';
import { generateLLMTimeSeriesSummary } from '../../../../../lib/technical-analysis/klineanalysis';
import { callGemini } from '../../../../../external/gemini/client';
import { getCompanyNameByCode, formatStockName } from '../../../../../lib/stock-map';
import { getTechnicalAIPrompt } from '../../../../../lib/prompts';

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  try {
    const params = await (context?.params || {});
    const symbol = params?.symbol;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    // Parse URL query parameter `days` (clamp between 5 and 120, default 30)
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    let days = daysParam ? parseInt(daysParam, 10) : 30;
    if (isNaN(days)) days = 30;
    days = Math.max(5, Math.min(120, days));

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `${upperSymbol}_technical_ai_${days}`;
    const db = await connectToDatabase();

    // Ensure stock record exists and sync incremental price data first
    const stockId = await saveStock(db, {
      symbol: upperSymbol,
      market: upperSymbol.includes('.') ? 'TW' : 'US'
    });

    if (typeof syncStockPrices === 'function') {
      try {
        await syncStockPrices(db, stockId, upperSymbol);
      } catch (syncErr) {
        console.warn(`[API_TECHNICAL_AI] Incremental sync warning for ${upperSymbol}:`, syncErr.message);
      }
    }

    // Determine latest price date in DB (max_date) to use as cache date key
    const maxDate = await getMaxPriceDate(db, stockId);
    const cacheDate = maxDate || new Date().toISOString().split('T')[0];

    // Check DB cache first to avoid unnecessary database lookups and API calls
    const cached = await getPromptAnalysis(db, cacheKey, 'technical', cacheDate);
    if (cached) {
      return NextResponse.json({ markdown: cached, days }, { status: 200 });
    }

    const prices = await getHistoricalPricesFromDB(db, stockId);

    // Minimum 60 trading days required to accurately compute MA60 and longer term trend metrics
    if (!prices || prices.length < 60) {
      const fallbackMarkdown = `### ⚠️ 數據不足提示\n\n歷史交易數據不足（少於 60 個交易日），無法計算完整長短線指標與生成 AI 深度技術解讀。`;
      return NextResponse.json({ markdown: fallbackMarkdown, days }, { status: 200 });
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
      // Fallback
    }

    const timeSeriesSummary = generateLLMTimeSeriesSummary(rawData, days);
    const prompt = getTechnicalAIPrompt(displayName, timeSeriesSummary, days);

    const markdown = await callGemini(prompt, {
      tools: [{ googleSearch: {} }]
    });

    if (!markdown || !markdown.trim()) {
      throw new Error('AI 技術面分析生成內容為空');
    }

    await savePromptAnalysis(db, cacheKey, 'technical', cacheDate, markdown);

    return NextResponse.json({ markdown, days }, { status: 200 });
  } catch (error) {
    console.error('[API_TECHNICAL_AI] Exception in GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
