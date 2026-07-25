import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../external/database/connection';
import { getMarketFundsFlow, saveMarketFundsFlow } from '../../../../external/database/queries';
import { callGemini } from '../../../../external/gemini/client';

// Business logic: Prompt definition resides in the business API domain
function getPrompt(market, date) {
  const marketName = market === 'US' ? '美股' : '台股';
  return `你是一個專業的量化金融分析師。請利用 Google Search 網路搜尋功能，檢索並分析在 ${date} 之前一個月內，${marketName} 市場的資金流動狀況。
請特別關注：
1. 資金主要流入與流出的板塊、行業或主要大型個股，尤其是這段時間內表現最為突出的幾隻科技股以及他們的資金流向的情況。
2. 三大法人（若為台股）或機構資金（若為美股）的最新主要動態。
3. 當前市場的熱點主題與板塊（特別是科技板塊）的輪動趨勢與資金流向數據。

請直接以精簡、專業的 Markdown 格式輸出你的分析報告，包含小標題、重點清單或比對表格，不要包含任何開場白或無關的贅詞。`;
}

async function handleRequest(market, date) {
  if (!market || !date) {
    return NextResponse.json({ error: 'Market and date are required' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const prompt = getPrompt(market, date);

    // 1. Check cache
    const cached = await getMarketFundsFlow(db, market, date);
    if (cached && cached.prompt === prompt) {
      return NextResponse.json({
        market: cached.market,
        date: cached.date,
        content: cached.content
      });
    }

    // 2. Call generic Gemini client from lib with business prompt & options
    const content = await callGemini(prompt, {
      tools: [{ googleSearch: {} }]
    });

    // 3. Save to DB
    await saveMarketFundsFlow(db, {
      market,
      date,
      prompt,
      content
    });

    return NextResponse.json({
      market,
      date,
      content
    });
  } catch (error) {
    console.error('Funds flow API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const { market, date } = await req.json();
  return handleRequest(market, date);
}

export async function GET(req) {
  const url = new URL(req.url);
  const market = url.searchParams.get('market');
  const date = url.searchParams.get('date');
  return handleRequest(market, date);
}
