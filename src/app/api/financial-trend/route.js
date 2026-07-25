import { NextResponse } from 'next/server';
import { callGemini } from '../../../lib/gemini/client';
import { connectToDatabase } from '../../../external/database/connection';
const { getRecentPromptAnalysis, savePromptAnalysis } = require('../../../external/database/queries');

export const dynamic = 'force-dynamic';

function getFinancialTrendPrompt(symbol) {
  return `分析股票 ${symbol} 過去 5 年的財務數據。
請拆解：
• 營收成長
• 淨利趨勢
• 自由現金流
• 利潤率
• 負債水準
• 股東權益報酬率（ROE）

並判斷這家公司目前是財務體質正在變強，還是開始走弱。
請以精簡、專業的 繁體中文 Markdown 格式輸出，包含清晰的小標題、重點清單與比較表格。`;
}

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

    // Generate prompt & call Gemini with Google Search tool grounding
    const prompt = getFinancialTrendPrompt(symbol);
    const markdown = await callGemini(prompt, {
      tools: [{ googleSearch: {} }]
    });

    // Save to cache
    await savePromptAnalysis(db, symbol, 'financial_trend', today, markdown);

    return NextResponse.json({ markdown }, { status: 200 });
  } catch (err) {
    console.error('Error in financial-trend API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
