import { NextResponse } from 'next/server';
import yahooFinance from '../../../lib/data-fetcher/yahoo-finance';
const { fetchStockData } = yahooFinance;

// Why: Next.js might statically optimize API routes without dynamic functions. This ensures we always fetch fresh prices.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsStr = searchParams.get('symbols') || '';
    if (!symbolsStr) {
      // Why: Return an empty object if no symbols are provided, representing no data fetched.
      return NextResponse.json({});
    }

    // Why: Normalize symbol input by splitting comma-separated values, converting to uppercase, and removing empty tokens.
    const symbols = symbolsStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const results = {};

    // Why: Parallelize requests to optimize API performance and reduce latency since symbols are fetched independently.
    await Promise.all(symbols.map(async (symbol) => {
      try {
        const data = await fetchStockData(symbol);
        if (!data) return;

        // Why: Verify the values are valid numbers before formatting with toFixed(2) to prevent potential TypeErrors.
        const isPriceValid = typeof data.price === 'number' && !isNaN(data.price);
        const isChangePercentValid = typeof data.changePercent === 'number' && !isNaN(data.changePercent);

        const priceVal = isPriceValid ? data.price : 0;
        const changePercentVal = isChangePercentValid ? data.changePercent : 0;

        // Why: Select colors dynamically (rose for negative, emerald for positive changes) to conform to design aesthetic standards.
        const color = changePercentVal >= 0 ? 'text-emerald-400' : 'text-rose-400';
        const sign = changePercentVal >= 0 ? '+' : '';
        results[symbol] = {
          price: `$${priceVal.toFixed(2)}`,
          change: `${sign}${changePercentVal.toFixed(2)}%`,
          color
        };
      } catch (err) {
        // Why: Catch errors for individual symbol fetching so one failed symbol doesn't fail the entire batch request.
        console.error(`Failed to fetch API price for ${symbol}:`, err);
      }
    }));

    return NextResponse.json(results);
  } catch (err) {
    // Why: Provide a generic 500 error handler to capture unhandled errors gracefully.
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
