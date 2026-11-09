/**
 * @fileoverview Market Indices API Route
 * Presentation layer controller returning ^TWII and ^GSPC quotes.
 * Delegates data fetching to market.service.js.
 */

import { NextResponse } from 'next/server';
import { getMarketIndices } from '../../../services/market.service';
import logger from '../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getMarketIndices();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('API_MARKET', 'Error fetching market indices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
