import { NextResponse } from 'next/server';
import { callGemini } from '../../../external/gemini/client';
import { connectToDatabase } from '../../../external/database/connection.js';
import { getRecentPromptAnalysis, savePromptAnalysis } from '../../../external/database/queries.js';
import { getCompanyNameByCode, formatStockName } from '../../../lib/stock-map.js';
import { getFinancialTrendPrompt } from '../../../lib/prompts';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Query cache using 7-day window to avoid re-generating structural financial analysis repeatedly
    const cached = await getRecentPromptAnalysis(db, symbol, 'financial_trend', 7);
    if (cached) {
      return NextResponse.json({ markdown: cached }, { status: 200 });
    }

    // Resolve stock Chinese company name for Taiwan stocks or DB stocks to prevent LLM hallucinations
    let displayName = symbol;
    try {
      const nameInfo = await getCompanyNameByCode(symbol, { db });
      if (nameInfo && nameInfo.success && nameInfo.name) {
        displayName = formatStockName(nameInfo.name, symbol);
      }
    } catch (e) {
      // Fallback to original symbol if name lookup fails
    }

    // Generate prompt & call Gemini with Google Search tool grounding
    const prompt = getFinancialTrendPrompt(displayName);
    const markdown = await callGemini(prompt, {
      tools: [{ googleSearch: {} }]
    });

    if (!markdown || !markdown.trim()) {
      throw new Error('AI 財務趨勢分析生成內容為空');
    }

    // Save to cache
    await savePromptAnalysis(db, symbol, 'financial_trend', today, markdown);

    return NextResponse.json({ markdown }, { status: 200 });
  } catch (err) {
    console.error('Error in financial-trend API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
