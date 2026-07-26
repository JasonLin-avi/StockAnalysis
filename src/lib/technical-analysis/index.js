/**
 * Technical Analysis Engine
 * Provides pure computation functions for stock market technical indicators.
 * @module technical-analysis
 */

import { calculateMA }  from './ma';
import { calculateRSI }  from './rsi';
import { calculateMACD }  from './macd';

/**
 * Runs all technical indicators on the provided historical price data.
 *
 * @param {Object} historicalData - Input data object.
 * @param {number[]} historicalData.prices - Array of closing prices.
 * @returns {{ ma: (number|null)[], rsi: (number|null)[], macd: { macdLine: (number|null)[], signalLine: (number|null)[], histogram: (number|null)[] } }}
 */
function performTechnicalAnalysis(historicalData) {
  const prices = historicalData && historicalData.prices ? historicalData.prices : [];

  if (prices.length === 0) {
    return {
      ma: [],
      rsi: [],
      macd: { macdLine: [], signalLine: [], histogram: [] },
    };
  }

  const ma = calculateMA(prices, 20);
  const rsi = calculateRSI(prices, 14);
  const macd = calculateMACD(prices);

  return { ma, rsi, macd };
}

export {performTechnicalAnalysis, calculateMA, calculateRSI, calculateMACD};
