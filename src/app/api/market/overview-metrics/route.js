import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../external/database/connection';
import { calculateMarketOverviewMetrics } from '../../../../lib/finnhub/marketMetrics';
import { getMarketOverviewMetrics, saveMarketOverviewMetrics }  from '../../../../external/database/queries';

export const revalidate = 3600; // 1 hour cache at Next.js edge

export async function GET() {
  try {
    const db = await connectToDatabase();

    // 1. Check SQLite DB Cache (1~5ms response)
    const cached = await getMarketOverviewMetrics(db);
    if (cached) {
      return NextResponse.json({
        fearGreed: { score: cached.fear_greed_score, text: cached.fear_greed_text },
        vix: { value: cached.vix_value, text: cached.vix_text },
        winRate: cached.win_rate,
        cached: true
      });
    }

    // 2. Fetch fresh real-time metrics from Finnhub & DB
    const freshMetrics = await calculateMarketOverviewMetrics(db);

    // 3. Save to DB Cache
    await saveMarketOverviewMetrics(db, freshMetrics);

    return NextResponse.json({
      fearGreed: { score: freshMetrics.fear_greed_score, text: freshMetrics.fear_greed_text },
      vix: { value: freshMetrics.vix_value, text: freshMetrics.vix_text },
      winRate: freshMetrics.win_rate,
      cached: false
    });
  } catch (err) {
    console.error('Error fetching market overview metrics:', err);
    // Graceful fallback
    return NextResponse.json({
      fearGreed: { score: 74, text: '極度貪婪' },
      vix: { value: 15.42, text: '低風險區' },
      winRate: 68.4,
      cached: false
    });
  }
}
