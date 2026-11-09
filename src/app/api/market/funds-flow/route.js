import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../external/database/connection';
import { getMarketFundsFlow, saveMarketFundsFlow } from '../../../../external/database/queries';
import { callGemini } from '../../../../external/gemini/client';
import { getFundsFlowPrompt } from '../../../../lib/prompts';

async function handleRequest(market, date) {
  if (!market || !date) {
    return NextResponse.json({ error: 'Market and date are required' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    // Why: Use centralized prompt generator to guarantee standard versioning and query template.
    const prompt = getFundsFlowPrompt(market, date);

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
