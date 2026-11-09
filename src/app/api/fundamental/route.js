/**
 * @fileoverview Fundamental Analysis API Route
 * Presentation layer controller that delegates fundamental analysis to fundamental.service.js.
 */

import { NextResponse } from 'next/server';
import { getFundamentalAnalysis } from '../../../services/fundamental.service';
import logger from '../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    logger.info('API_FUNDAMENTAL', `Processing fundamental analysis request for ${symbol}`);
    const result = await getFundamentalAnalysis(symbol);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    logger.error('API_FUNDAMENTAL', 'Error in fundamental API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
