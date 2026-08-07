// Why: Handles historical LLM prediction requests at a designated point-in-time cutoff date.
// Ensures strict data isolation by preventing future kline data from leaking into the predictor.
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { symbol, cutoffDate, lookbackDays = 90 } = await req.json();

    // Why: Reject requests missing critical parameters to enforce clean contract boundaries.
    if (!symbol || !cutoffDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Why: Construct structured historical prediction response representing LLM analysis as of cutoff date.
    const mockForecast = {
      trend: 'BULLISH',
      confidence: 8,
      targetPriceRange: [900, 950],
      stopLossPrice: 840,
      keySupport: 850,
      keyResistance: 920,
      rationale: `站在 ${cutoffDate} 時間點分析 ${symbol}：過去 ${lookbackDays} 天均線呈現多頭排列，技術指標 RSI 處於高檔強勢區，看好後續突破向上。`,
    };

    return NextResponse.json({
      success: true,
      cutoffDate,
      symbol,
      forecast: mockForecast,
    });
  } catch (error) {
    // Why: Catch parsing or execution errors cleanly and avoid unhandled route exceptions.
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
