/**
 * @fileoverview Financial Trend API Route
 * Presentation layer controller that delegates financial trend analysis to financial-trend.service.js.
 */

import { NextResponse } from 'next/server';
import { getFinancialTrendAnalysis } from '../../../services/financial-trend.service';
import logger from '../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    logger.info('API_FINANCIAL_TREND', `Processing financial trend analysis request for ${symbol}`);
    const result = await getFinancialTrendAnalysis(symbol);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    logger.error('API_FINANCIAL_TREND', 'Error in financial-trend API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
