/**
 * MACD (Moving Average Convergence Divergence) calculation.
 * @module technical-analysis/macd
 */

/**
 * Calculates the Exponential Moving Average (EMA) for a given price array.
 *
 * @param {number[]} prices - Array of values.
 * @param {number} period - The EMA period.
 * @returns {(number|null)[]} EMA values aligned with the input array.
 */
function calculateEMA(prices, period) {
  if (!Array.isArray(prices) || prices.length === 0 || period < 1) {
    return [];
  }

  const result = new Array(prices.length).fill(null);
  const multiplier = 2 / (period + 1);

  // Find first non-null value to seed
  let seedIndex = -1;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] !== null && prices[i] !== undefined) {
      seedIndex = i;
      break;
    }
  }

  // If no valid values, return all nulls
  if (seedIndex === -1) {
    return result;
  }

  // Seed with SMA of first period (or available) non-null values starting from seedIndex
  let count = 0;
  let sum = 0;
  let i = seedIndex;
  while (count < period && i < prices.length) {
    if (prices[i] !== null && prices[i] !== undefined) {
      sum += prices[i];
      count++;
    }
    i++;
  }

  if (count === 0) {
    return result;
  }

  let ema = sum / count;
  result[i - 1] = ema;

  // Compute EMA for remaining values
  for (let j = i; j < prices.length; j++) {
    if (prices[j] !== null && prices[j] !== undefined) {
      ema = (prices[j] - ema) * multiplier + ema;
      result[j] = ema;
    }
    // Skip null values - they keep the previous ema but result stays null
  }

  return result;
}

/**
 * Calculates the MACD indicator (MACD Line, Signal Line, Histogram).
 *
 * MACD Line = EMA(fastPeriod) - EMA(slowPeriod)
 * Signal Line = EMA(MACD Line, signalPeriod)
 * Histogram = MACD Line - Signal Line
 *
 * @param {number[]} prices - Array of closing prices.
 * @param {number} [fastPeriod=12] - Fast EMA period (default 12).
 * @param {number} [slowPeriod=26] - Slow EMA period (default 26).
 * @param {number} [signalPeriod=9] - Signal line EMA period (default 9).
 * @returns {{ macdLine: (number|null)[], signalLine: (number|null)[], histogram: (number|null)[] }}
 */
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!Array.isArray(prices) || prices.length === 0) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);

  // MACD Line = EMA(fast) - EMA(slow)
  const macdLine = new Array(prices.length).fill(null);
  const startIndex = Math.max(fastPeriod, slowPeriod) - 1;
  for (let i = startIndex; i < prices.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine[i] = emaFast[i] - emaSlow[i];
    }
  }

  // Signal Line = EMA(MACD Line, signalPeriod)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Histogram = MACD Line - Signal Line
  const histogram = new Array(prices.length).fill(null);
  for (let i = 0; i < prices.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }

  return { macdLine, signalLine, histogram };
}

module.exports = { calculateMACD, calculateEMA };
