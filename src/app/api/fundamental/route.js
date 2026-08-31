import { NextResponse } from 'next/server';
import { callGemini } from '../../../external/gemini/client';
import { connectToDatabase } from '../../../external/database/connection.js';
import { getRecentPromptAnalysis, savePromptAnalysis } from '../../../external/database/queries.js';
import { getCompanyNameByCode, formatStockName } from '../../../lib/stock-map.js';

export const dynamic = 'force-dynamic';

function getFundamentalPrompt(displayName) {
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Query cache using 7-day window to reduce unnecessary AI API calls for recent data
    const cached = await getRecentPromptAnalysis(db, symbol, 'fundamental', 7);

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

    // Business domain prompt with explicit stock name
    const prompt = getFundamentalPrompt(displayName);

    // Call generic Gemini client from lib
    const markdown = await callGemini(prompt, {
      tools: [{ googleSearch: {} }]
    });

    if (!markdown || !markdown.trim()) {
      throw new Error('AI 基本面分析生成內容為空');
    }

    // Save to cache
    await savePromptAnalysis(db, symbol, 'fundamental', today, markdown);

    return NextResponse.json({ markdown }, { status: 200 });
  } catch (err) {
    console.error('Error in fundamental API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
