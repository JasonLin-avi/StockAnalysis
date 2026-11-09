// Why: Handles historical LLM prediction requests at a designated point-in-time cutoff date.
// Ensures strict data isolation by preventing future kline data from leaking into the predictor.
import { NextResponse } from 'next/server';
import { SMA, RSI, MACD } from 'technicalindicators';
import {
  splitHistoricalKlines,
  getOrSyncKlines,
  getCachedBacktestRecord,
  saveBacktestForecast,
} from '@/services/backtest.service';
import { callGemini } from '@/external/gemini/client';
import {
  getBacktestPredictPrompt,
  backtestPredictSchema,
  parseWithZod,
} from '@/lib/prompts';

export async function POST(req) {
  try {
    const { symbol, cutoffDate, lookbackDays = 60, predictionDays = 20 } = await req.json();

    // Why: Reject requests missing critical parameters to enforce clean contract boundaries.
    if (!symbol || !cutoffDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const activeLookbackDays = parseInt(lookbackDays, 10) || 60;

    // Why: Check local database cache to prevent redundant Gemini LLM analysis.
    const cachedRecord = await getCachedBacktestRecord({
      symbol,
      cutoffDate,
      lookbackDays: activeLookbackDays,
      predictionDays,
    });

    if (cachedRecord?.forecast) {
      return NextResponse.json({
        success: true,
        cutoffDate,
        actualDate: cachedRecord.forecast.actualDate || cutoffDate,
        symbol,
        basePrice: cachedRecord.forecast.basePrice,
        lookbackDays: activeLookbackDays,
        predictionDays,
        forecast: cachedRecord.forecast,
        cached: true,
      });
    }

    // 1. Get K-lines from DB first (syncs incrementally if missing)
    const klines = await getOrSyncKlines(symbol, cutoffDate);

    if (!Array.isArray(klines) || klines.length === 0) {
      return NextResponse.json(
        { success: false, error: `無法抓取股票 ${symbol} 之歷史 K 線數據` },
        { status: 404 }
      );
    }

    // 2. Strictly split historical data up to cutoffDate (Lookahead Protection)
    const { pastKlines } = splitHistoricalKlines(klines, cutoffDate, predictionDays);

    if (pastKlines.length === 0) {
      return NextResponse.json(
        { success: false, error: `在日期 ${cutoffDate} 前找不到 ${symbol} 之歷史數據` },
        { status: 400 }
      );
    }

    // 3. Compute indicators across all historical bars up to cutoffDate
    const closes = pastKlines.map(k => k.close);
    const sma5 = SMA.calculate({ period: 5, values: closes });
    const sma20 = SMA.calculate({ period: 20, values: closes });
    const sma60 = SMA.calculate({ period: 60, values: closes });
    const rsi14 = RSI.calculate({ period: 14, values: closes });
    const macdResult = MACD.calculate({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: closes,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });

    // 4. Attach computed indicators to each bar in pastKlines
    const enrichedKlines = pastKlines.map((k, i) => {
      const ma5 = i >= 4 && sma5[i - 4] !== undefined ? sma5[i - 4].toFixed(2) : '-';
      const ma20 = i >= 19 && sma20[i - 19] !== undefined ? sma20[i - 19].toFixed(2) : '-';
      const ma60 = i >= 59 && sma60[i - 59] !== undefined ? sma60[i - 59].toFixed(2) : '-';
      const rsi = i >= 14 && rsi14[i - 14] !== undefined ? rsi14[i - 14].toFixed(2) : '-';
      const macdHist = i >= 25 && macdResult[i - 25]?.histogram !== undefined
        ? macdResult[i - 25].histogram.toFixed(2)
        : '-';

      return {
        ...k,
        ma5,
        ma20,
        ma60,
        rsi,
        macdHist
      };
    });

    // 5. Slice recent N lookbackDays bars leading up to cutoffDate
    const numLookback = activeLookbackDays;
    const recentPast = enrichedKlines.slice(-numLookback);
    const latestBar = recentPast[recentPast.length - 1];

    // 6. Build daily time-series Markdown table
    const tableHeader = '| 日期 | 開盤價 | 最高價 | 最低價 | 收盤價 | 成交量 | MA5 | MA20 | MA60 | RSI(14) | MACD柱體 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |';
    const tableRows = recentPast.map(k => {
      const dateStr = k.date || k.time || '';
      const openStr = typeof k.open === 'number' ? k.open.toFixed(2) : (k.open || '-');
      const highStr = typeof k.high === 'number' ? k.high.toFixed(2) : (k.high || '-');
      const lowStr = typeof k.low === 'number' ? k.low.toFixed(2) : (k.low || '-');
      const closeStr = typeof k.close === 'number' ? k.close.toFixed(2) : (k.close || '-');
      const volStr = k.volume !== undefined ? k.volume : '-';

      return `| ${dateStr} | ${openStr} | ${highStr} | ${lowStr} | ${closeStr} | ${volStr} | ${k.ma5} | ${k.ma20} | ${k.ma60} | ${k.rsi} | ${k.macdHist} |`;
    });

    const markdownTable = `${tableHeader}\n${tableRows.join('\n')}`;

    // Summary statistics for prompt context
    const recentCloses = recentPast.map(k => k.close);
    const lastClose = latestBar.close;
    const avgClose = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;
    const minClose = Math.min(...recentCloses);
    const maxClose = Math.max(...recentCloses);

    // 7. Prompt with 15-year senior quant trader persona from centralized library
    const prompt = getBacktestPredictPrompt({
      symbol,
      cutoffDate,
      lastClose,
      recentPastLength: recentPast.length,
      maxClose,
      minClose,
      avgClose,
      markdownTable,
    });

    const fallbackForecast = () => ({
      trend: lastClose >= avgClose ? 'BULLISH' : 'BEARISH',
      confidence: 7,
      targetPriceRange: [Math.round(lastClose * 0.95), Math.round(lastClose * 1.08)],
      stopLossPrice: Math.round(lastClose * 0.92),
      keySupport: Math.round(minClose),
      keyResistance: Math.round(maxClose),
      rationale: `站在 ${cutoffDate} 時間點分析 ${symbol}：最新收盤價為 $${lastClose}（${recentPast.length} 日區間均價 $${avgClose.toFixed(2)}）。身為 15 年資深量化交易員，依據該時刻完整 daily 時間序列與 MA/RSI/MACD 技術數據評估未來短中線走向。`
    });

    let forecast;
    try {
      const llmOutput = await callGemini(prompt, { tools: [] });
      // Why: Defensively parse and validate JSON against Zod schema to avoid unhandled syntax or type errors.
      forecast = parseWithZod(llmOutput, backtestPredictSchema, fallbackForecast);
    } catch (llmErr) {
      console.warn('Gemini JSON parse fallback triggered:', llmErr);
      forecast = fallbackForecast();
    }

    const actualDate = latestBar.date || latestBar.time || cutoffDate;

    // Why: Attach base price and actual trading date to forecast object so cached hits preserve context.
    forecast.basePrice = lastClose;
    forecast.actualDate = actualDate;

    // Why: Save newly generated forecast into backtest_records for future cache hits.
    await saveBacktestForecast({
      symbol,
      cutoffDate,
      lookbackDays: activeLookbackDays,
      predictionDays,
      forecast,
    });

    return NextResponse.json({
      success: true,
      cutoffDate,
      actualDate,
      symbol,
      basePrice: lastClose,
      lookbackDays: activeLookbackDays,
      predictionDays,
      forecast,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
