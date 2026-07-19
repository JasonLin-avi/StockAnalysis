import { NextResponse } from 'next/server';
import yahooFinance from '../../../lib/data-fetcher/yahoo-finance';
const { fetchStockData } = yahooFinance;
const { connectToDatabase } = require('../../../lib/database/connection');
const { getLatestAnalysisResults } = require('../../../lib/database/queries');
const logger = require('../../../lib/logger');

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
    const results = {};

    let db = null;
    try {
      db = await connectToDatabase();
    } catch (e) {
      logger.warn('API_PRICES', 'Database connection unavailable for backtest metrics');
    }

    logger.info('API_PRICES', `Fetching stock prices for symbols: ${JSON.stringify(symbols)}`);

    // Why: Parallelize requests to optimize API performance and reduce latency since symbols are fetched independently.
    await Promise.all(symbols.map(async (symbol) => {
      try {
        const data = await fetchStockData(symbol);
        const horizons = [5, 10, 20, 40, 60, 120, 240];
        const backtestMetrics = {};

        horizons.forEach(h => {
          backtestMetrics[`winRate${h}d`] = 0;
          backtestMetrics[`avgReturn${h}d`] = 0;
        });

        if (db) {
          try {
            const analysis = await getLatestAnalysisResults(db, symbol);
            if (analysis && analysis.backtest) {
              horizons.forEach(h => {
                backtestMetrics[`winRate${h}d`] = analysis.backtest[`winRate${h}d`] || 0;
                backtestMetrics[`avgReturn${h}d`] = analysis.backtest[`avgReturn${h}d`] || 0;
              });
            }
          } catch (dbErr) {
            logger.warn('API_PRICES', `Could not fetch backtest for ${symbol}`, dbErr);
          }
        }

        if (!data) {
          logger.warn('API_PRICES', `No data returned for symbol: ${symbol}`);
          results[symbol] = {
            price: '$0.00',
            change: '+0.00%',
            color: 'text-emerald-400',
            ...backtestMetrics
          };
          return;
        }

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
          color,
          ...backtestMetrics
        };


        logger.info('API_PRICES', `Successfully fetched price for ${symbol}: ${results[symbol].price} (${results[symbol].change})`);
      } catch (err) {
        // Why: Catch errors for individual symbol fetching so one failed symbol doesn't fail the entire batch request.
        logger.error('API_PRICES', `Failed to fetch API price for ${symbol}`, err);
      }
    }));

    logger.info('API_PRICES', `Request completed for "${symbolsStr}"`, results);
    return NextResponse.json(results);
  } catch (err) {
    // Why: Provide a generic 500 error handler to capture unhandled errors gracefully.
    logger.error('API_PRICES', `Unhandled exception in GET route for "${symbolsStr}"`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


