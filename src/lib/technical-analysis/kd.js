/**
 * @fileoverview Stochastic Oscillator (KD) Indicator Calculation
 * 
 * Why this module is designed:
 * - Implements classical 9-3-3 Stochastic Oscillator (RSV -> K -> D) commonly used in Taiwan and Asian stock markets.
 * - Enforces standard domain fallback: if data length is insufficient (< period), returns 50 (neutral midline).
 * - Avoids division-by-zero errors when the trading range is flat (highest high === lowest low) by safely defaulting RSV to 50.
 * - Evaluates momentum diagnostic status in Traditional Chinese for instant UI readout.
 * 
 * @module lib/technical-analysis/kd
 */

/**
 * Calculates KD indicator series over price history.
 * 
 * @param {Array<{date?: string, time?: string, high: number, low: number, close: number}>} prices
 * @param {number} [period=9] - RSV lookback window (default 9)
 * @param {number} [smoothK=3] - K smoothing period (default 3)
 * @param {number} [smoothD=3] - D smoothing period (default 3)
 * @returns {{
 *   k: Array<{time: string, value: number}>,
 *   d: Array<{time: string, value: number}>,
 *   latest: { k: number, d: number, status: string }
 * }}
 */
export function calculateKD(prices, period = 9, smoothK = 3, smoothD = 3) {
  if (!Array.isArray(prices) || prices.length === 0) {
    return {
      k: [],
      d: [],
      latest: { k: 50, d: 50, status: '無資料' }
    };
  }

  const kSeries = [];
  const dSeries = [];

  // Initial reference values start at 50 as standard baseline for Taiwanese stock market KD calculation
  let prevK = 50;
  let prevD = 50;

  const kWeight = 1 / smoothK;
  const dWeight = 1 / smoothD;

  for (let i = 0; i < prices.length; i++) {
    const time = prices[i].date || prices[i].time || '';

    // Insufficient historical data prior to window period
    if (i < period - 1) {
      kSeries.push({ time, value: 50 });
      dSeries.push({ time, value: 50 });
      continue;
    }

    // Determine rolling highest high and lowest low over the lookback window
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - period + 1; j <= i; j++) {
      if (prices[j].high > highestHigh) highestHigh = prices[j].high;
      if (prices[j].low < lowestLow) lowestLow = prices[j].low;
    }

    let rsv = 50;
    const priceRange = highestHigh - lowestLow;
    if (priceRange > 0) {
      rsv = ((prices[i].close - lowestLow) / priceRange) * 100;
    }

    const currentK = Number(((1 - kWeight) * prevK + kWeight * rsv).toFixed(2));
    const currentD = Number(((1 - dWeight) * prevD + dWeight * currentK).toFixed(2));

    prevK = currentK;
    prevD = currentD;

    kSeries.push({ time, value: currentK });
    dSeries.push({ time, value: currentD });
  }

  const lastK = kSeries.length > 0 ? kSeries[kSeries.length - 1].value : 50;
  const lastD = dSeries.length > 0 ? dSeries[dSeries.length - 1].value : 50;
  const prevLastK = kSeries.length > 1 ? kSeries[kSeries.length - 2].value : lastK;
  const prevLastD = dSeries.length > 1 ? dSeries[dSeries.length - 2].value : lastD;

  let status = '常態整理';
  if (prices.length < period) {
    status = '資料不足 (基準50)';
  } else if (prevLastK <= prevLastD && lastK > lastD && lastK < 30) {
    status = '低檔黃金交叉 (買訊)';
  } else if (prevLastK >= prevLastD && lastK < lastD && lastK > 70) {
    status = '高檔死亡交叉 (賣訊)';
  } else if (lastK >= 80 && lastD >= 80) {
    status = '高檔超買鈍化';
  } else if (lastK <= 20 && lastD <= 20) {
    status = '低檔超賣鈍化';
  } else if (lastK > lastD) {
    status = '多方控盤 (K > D)';
  } else if (lastK < lastD) {
    status = '空方控盤 (K < D)';
  }

  return {
    k: kSeries,
    d: dSeries,
    latest: {
      k: lastK,
      d: lastD,
      status
    }
  };
}
