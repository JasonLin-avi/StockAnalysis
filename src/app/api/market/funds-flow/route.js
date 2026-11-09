/**
 * @fileoverview Market Funds Flow API Route
 * Presentation layer controller returning market funds flow analysis.
 * Delegates Gemini invocation and SQLite caching to market.service.js.
 */

import { NextResponse } from 'next/server';
import { getMarketFundsFlowService } from '../../../../services/market.service';
import logger from '../../../../lib/logger';

async function handleRequest(market, date) {
  if (!market || !date) {
    return NextResponse.json({ error: 'Market and date are required' }, { status: 400 });
  }

  try {
    const result = await getMarketFundsFlowService(market, date);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('API_FUNDS_FLOW', 'Funds flow API error:', error);
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
