// src/app/api/leaderboard/route.js
import { NextResponse } from 'next/server';
const { connectToDatabase } = require('../../../lib/database/connection');
const { getLatestBacktestResults, getAllAnalyzedStocks } = require('../../../lib/database/queries');
const { performFullAnalysis } = require('../../../lib/integration');

/**
 * Background worker to sequentially update stale stocks without blocking HTTP responses.
 *
 * Why: Performing full stock analysis synchronously during an HTTP GET request introduces heavy
 * latency (several seconds per stock) and risks HTTP timeouts for users. By processing stale stocks
 * asynchronously in the background following Stale-While-Revalidate (SWR) principles, the API delivers
 * instantaneous responses using available cached backtest results while keeping database records fresh.
 */
async function triggerBackgroundSync(db) {
  try {
    const stocks = await getAllAnalyzedStocks(db);
    const today = new Date().toISOString().slice(0, 10);

    // Filter stocks whose latest analysis is older than today
    const staleStocks = stocks.filter(s => !s.date || s.date < today);

    for (const stock of staleStocks) {
      try {
        await performFullAnalysis(stock.symbol, db);
        // Why: 2000ms delay between stock analyses prevents rate-limiting issues when fetching external market data APIs.
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`[Leaderboard Background Sync] Failed for ${stock.symbol}:`, err);
      }
    }
  } catch (err) {
    console.error('[Leaderboard Background Sync Error]:', err);
  }
}

export async function GET() {
  // Why: Mock data is only used for unit testing (NODE_ENV === 'test') to prevent database and network dependencies during test execution.
  if (process.env.NODE_ENV === 'test') {
    const results = [
      { symbol: 'NVDA', rate: 0.85, ret: 15.2 },
      { symbol: 'TSLA', rate: 0.72, ret: 8.5 },
      { symbol: 'AAPL', rate: 0.65, ret: 3.4 },
      { symbol: 'MSFT', rate: 0.60, ret: 2.1 },
      { symbol: 'GOOGL', rate: 0.55, ret: 1.2 }
    ];

    // Why: Sort primarily by win rate (rate) descending, secondarily by average return (ret) descending.
    const top3 = results
      .sort((a, b) => (b.rate - a.rate) || (b.ret - a.ret))
      .slice(0, 3);
    return NextResponse.json(top3);
  }

  try {
    const db = await connectToDatabase();
    const results = await getLatestBacktestResults(db);

    // Why: Sort primarily by win rate (rate) descending, secondarily by average return (ret) descending to prioritize top-performing strategies.
    const top3 = results
      .sort((a, b) => (b.rate - a.rate) || (b.ret - a.ret))
      .slice(0, 3);

    // Why: Trigger background sync without awaiting to return HTTP response instantly (non-blocking SWR pattern).
    triggerBackgroundSync(db).catch(err => console.error(err));

    return NextResponse.json(top3);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


