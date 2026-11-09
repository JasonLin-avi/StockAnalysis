/**
 * @fileoverview Technical AI Interpretation API Route
 * Presentation layer controller that delegates business logic, prompt formulation,
 * and caching to technical-ai.service.js in compliance with Clean Architecture.
 * 
 * @module api/stock/[symbol]/technical-ai
 */

import { NextResponse } from 'next/server';
import { getTechnicalAIAnalysis } from '../../../../../services/technical-ai.service';
import logger from '../../../../../lib/logger';

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

    logger.info('API_TECHNICAL_AI', `Processing technical AI request for ${symbol} with days=${days}`);
    const result = await getTechnicalAIAnalysis(symbol, days);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error('API_TECHNICAL_AI', 'Exception in GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
