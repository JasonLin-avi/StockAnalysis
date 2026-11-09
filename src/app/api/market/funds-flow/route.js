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
    logger.error('API_FUNDS_FLOW', 'Error fetching funds flow:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch funds flow' }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get('market');
  const date = searchParams.get('date');

  return handleRequest(market, date);
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    // ignore json parse error
  }
  const { market, date } = body;

  return handleRequest(market, date);
}
