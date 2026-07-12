import { NextResponse } from 'next/server';
const { performFullAnalysis } = require('../../../lib/integration');
const { connectToDatabase } = require('../../../lib/database/connection');
const { saveStockData, saveAnalysisResults } = require('../../../lib/database/queries');
const { fetchHistoricalData } = require('../../../lib/data-fetcher');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    const analysisResults = await performFullAnalysis(symbol);
    
    // Persistent storage integration
    try {
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
      
      await saveStockData(db, symbol, dailyPrices);
      await saveAnalysisResults(db, symbol, analysisResults.date, analysisResults);
    } catch (dbError) {
      console.error('Database save error (non-blocking):', dbError);
    }

    return NextResponse.json(analysisResults);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
