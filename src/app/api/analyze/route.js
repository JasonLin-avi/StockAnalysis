import { NextResponse } from 'next/server';
const { performFullAnalysis } = require('../../../lib/integration');
const { connectToDatabase } = require('../../../lib/database/connection');
const { saveStockData, saveAnalysisResults } = require('../../../lib/database/queries');
const { fetchHistoricalData } = require('../../../lib/data-fetcher');
const logger = require('../../../lib/logger');

export const dynamic = 'force-dynamic';


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  logger.info('API_ANALYZE', `Received GET request for symbol: ${symbol}`);

  if (!symbol) {
    logger.warn('API_ANALYZE', 'Request failed: missing symbol parameter');
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    logger.info('API_ANALYZE', `Starting full analysis for ${symbol}`);
    const analysisResults = await performFullAnalysis(symbol);
    logger.info('API_ANALYZE', `Full analysis successfully completed for ${symbol}`);
    if (analysisResults.backtest) {
      logger.info('API_ANALYZE', `Backtest calculated: winRate5d=${analysisResults.backtest.winRate5d}, similarDaysCount=${analysisResults.backtest.similarDays ? analysisResults.backtest.similarDays.length : 0}`);
    } else {
      logger.warn('API_ANALYZE', `Backtest results are missing for ${symbol}`);
    }
    
    // Persistent storage integration
    try {
      logger.info('API_ANALYZE', `Connecting to database to persist ${symbol} data`);
      const db = await connectToDatabase();
      const historical = await fetchHistoricalData(symbol, '3mo');
      const dailyPrices = historical.data.map(item => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));
      
      logger.info('API_ANALYZE', `Saving daily prices and analysis results to database for ${symbol}`);
      await saveStockData(db, symbol, dailyPrices);
      await saveAnalysisResults(db, symbol, analysisResults.date, analysisResults);
      logger.info('API_ANALYZE', `Successfully saved ${symbol} data to database`);
    } catch (dbError) {
      logger.error('API_ANALYZE', `Database save error (non-blocking) for ${symbol}`, dbError);
    }

    return NextResponse.json(analysisResults);
  } catch (error) {
    logger.error('API_ANALYZE', `Analysis failed for ${symbol}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
