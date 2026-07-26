import { NextResponse } from 'next/server';
import { connectToDatabase }  from '../../../../external/database/connection.js';
import { getLatestAnalysisResults, getStockData }  from '../../../../external/database/queries.js';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const latest = await getLatestAnalysisResults(db, symbol);
    
    if (!latest) {
      return NextResponse.json({ data: null });
    }

    // reconstruct the data object as expected by the UI
    const historicalData = await getStockData(db, symbol);

    const data = {
      symbol: symbol,
      name: symbol,
      date: latest.date,
      price: historicalData.length > 0 ? historicalData[historicalData.length - 1].close : 0,
      changePercent: historicalData.length > 1 
        ? ((historicalData[historicalData.length - 1].close - historicalData[historicalData.length - 2].close) / historicalData[historicalData.length - 2].close) * 100 
        : 0,
      technical: latest.technical,
      fundamental: latest.fundamental,
      news: latest.news,
      advice: latest.advice,
      backtest: latest.backtest,
      historicalData: historicalData
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching latest analysis:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
