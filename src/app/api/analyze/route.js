import { NextResponse } from 'next/server';
const { performFullAnalysis } = require('../../../services/analysis.service');
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
    
    return NextResponse.json(analysisResults);
  } catch (error) {
    logger.error('API_ANALYZE', `Analysis failed for ${symbol}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
