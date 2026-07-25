/**
 * @fileoverview K-Line Technical Chart Data API Route
 * Provides historical candlestick data, volume data, and calculated moving averages (MA5, MA20, MA60)
 * for Lightweight Charts rendering.
 * 
 * Why this architecture is selected:
 * - Incremental DB synchronization ensures local SQLite cache is updated before reading historical price points.
 * - Moving averages (MA5, MA20, MA60) are calculated over the full price history first to avoid cold-start 
 *   warmup truncation when filtering for short timeframes (e.g. 1M or 3M).
 * - Standardized lightweight-charts format reduces frontend data transformation overhead.
 * 
 * @module api/stock/[symbol]/kline
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../external/database/connection';
import { saveStock, getHistoricalPricesFromDB } from '../../../../../external/database/queries';
import { syncStockPrices } from '../../../../../services/data-sync.service';
import { generateLLMTechnicalSummary } from '../../../../../lib/technical-analysis/klineanalysis';

export const dynamic = 'force-dynamic';

/**
 * Calculates simple moving averages over a numeric array for a given window period.
 * 
 * Why:
 * Moving averages smooth out price action over specified window intervals.
 * 
 * @param {Array<{close: number, date: string}>} prices - Full price series array ordered by date ASC
 * @param {number} period - Rolling window size (e.g. 5, 20, 60)
 * @returns {Array<{time: string, value: number}>} Calculated MA data points
 */
function calculateMA(prices, period) {
  const result = [];
  let sum = 0;

  for (let i = 0; i < prices.length; i++) {
    sum += prices[i].close;
    if (i >= period) {
      sum -= prices[i - period].close;
    }
    if (i >= period - 1) {
      result.push({
        time: prices[i].date,
        value: Number((sum / period).toFixed(2))
      });
    }
  }

  return result;
}

/**
 * Computes the cutoff date string (YYYY-MM-DD) based on selected range.
 * 
 * Why:
 * Relative calculation based on the latest available price date (or current date) ensures 
 * test isolation and resilience against missing weekend/holiday data points.
 * 
 * @param {Date} refDate - Latest date in dataset or current date
 * @param {string} range - Timeframe range identifier ('1M', '3M', '6M', '1Y', '3Y')
 * @returns {string} YYYY-MM-DD date string
 */
function getCutoffDateStr(refDate, range) {
  const cutoff = new Date(refDate);
  const upperRange = (range || '1Y').toUpperCase();

  switch (upperRange) {
    case '1M':
      cutoff.setMonth(cutoff.getMonth() - 1);
      break;
    case '3M':
      cutoff.setMonth(cutoff.getMonth() - 3);
      break;
    case '6M':
      cutoff.setMonth(cutoff.getMonth() - 6);
      break;
    case '3Y':
      cutoff.setFullYear(cutoff.getFullYear() - 3);
      break;
    case '1Y':
    default:
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
  }

  return cutoff.toISOString().slice(0, 10);
}

export async function GET(request, context) {
  try {
    // Why: Safely resolve params whether provided as a Promise (Next.js dynamic params) or plain object.
    const params = await (context?.params || {});
    const symbol = params?.symbol;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || '1Y').toUpperCase();

    const upperSymbol = symbol.toUpperCase();
    const db = await connectToDatabase();

    // Why: Ensure stock record exists in DB to obtain foreign key stockId for querying and syncing.
    const stockId = await saveStock(db, {
      symbol: upperSymbol,
      market: upperSymbol.includes('.') ? 'TW' : 'US'
    });

    // Why: Perform incremental sync from external providers (Yahoo/Google) to keep database updated before fetching.
    await syncStockPrices(db, stockId, upperSymbol);

    // Why: Fetch full historical price dataset from database sorted ASC by date.
    const prices = await getHistoricalPricesFromDB(db, stockId);

    if (!prices || prices.length === 0) {
      return NextResponse.json({
        candles: [],
        volume: [],
        ma5: [],
        ma20: [],
        ma60: [],
        summary: null
      });
    }

    // Why: Compute moving averages on the FULL dataset prior to date filtering 
    // so that MA line points at the start of the date range are properly warmed up and visible.
    const fullMa5 = calculateMA(prices, 5);
    const fullMa20 = calculateMA(prices, 20);
    const fullMa60 = calculateMA(prices, 60);

    let summary = null;
    if (prices.length >= 60) {
      const rawData = {
        dates: prices.map(p => p.date),
        opens: prices.map(p => p.open),
        highs: prices.map(p => p.high),
        lows: prices.map(p => p.low),
        closes: prices.map(p => p.close),
        volumes: prices.map(p => p.volume)
      };
      try {
        summary = generateLLMTechnicalSummary(rawData);
      } catch (err) {
        console.warn('[API_KLINE] Summary calculation failed:', err.message);
      }
    }

    // Why: Determine date threshold according to specified range parameter.
    const latestDate = new Date(prices[prices.length - 1].date);
    const cutoffDateStr = getCutoffDateStr(latestDate, range);

    // Why: Filter candles, volume, and MA series to include only data points on or after cutoffDateStr.
    const candles = [];
    const volume = [];

    for (const p of prices) {
      if (p.date >= cutoffDateStr) {
        candles.push({
          time: p.date,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close
        });

        // Why: Standard green (#26a69a) for bullish days (close >= open) and red (#ef5350) for bearish days (close < open).
        const color = p.close >= p.open ? '#26a69a' : '#ef5350';
        volume.push({
          time: p.date,
          value: p.volume,
          color
        });
      }
    }

    const ma5 = fullMa5.filter(item => item.time >= cutoffDateStr);
    const ma20 = fullMa20.filter(item => item.time >= cutoffDateStr);
    const ma60 = fullMa60.filter(item => item.time >= cutoffDateStr);

    return NextResponse.json({
      candles,
      volume,
      ma5,
      ma20,
      ma60,
      summary
    });
  } catch (error) {
    console.error(`[API_KLINE] Exception in GET for symbol:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
