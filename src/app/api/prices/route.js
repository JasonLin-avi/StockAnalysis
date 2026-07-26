import { NextResponse } from 'next/server';
import { getLatestPricesAndBacktest } from '../../../services/analysis.service';
import logger  from '../../../lib/logger';

// Why: Next.js might statically optimize API routes without dynamic functions. This ensures we always fetch fresh prices.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbolsStr = searchParams.get('symbols') || '';
  
  logger.info('API_PRICES', `Received GET request for symbols: "${symbolsStr}"`);

  try {
    if (!symbolsStr) {
      logger.info('API_PRICES', 'Request completed: no symbols provided');
      return NextResponse.json({});
    }

    // Why: Normalize symbol input by splitting comma-separated values, converting to uppercase, and removing empty tokens.
    const symbols = symbolsStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    logger.info('API_PRICES', `Fetching stock prices and backtests via service for symbols: ${JSON.stringify(symbols)}`);
    const results = await getLatestPricesAndBacktest(symbols);

    logger.info('API_PRICES', `Request completed for "${symbolsStr}"`, results);
    return NextResponse.json(results);
  } catch (err) {
    // Why: Provide a generic 500 error handler to capture unhandled errors gracefully.
    logger.error('API_PRICES', `Unhandled exception in GET route for "${symbolsStr}"`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


