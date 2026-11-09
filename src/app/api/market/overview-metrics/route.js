/**
 * @fileoverview Market Overview Metrics API Route
 * Presentation layer controller returning Fear & Greed, VIX, and Win Rate.
 * Delegates cache check and computation to market.service.js.
 */

import { NextResponse } from 'next/server';
import { getMarketOverviewMetricsService } from '../../../../services/market.service';

export const revalidate = 3600; // 1 hour cache at Next.js edge

export async function GET() {
  const result = await getMarketOverviewMetricsService();
  return NextResponse.json(result);
}
