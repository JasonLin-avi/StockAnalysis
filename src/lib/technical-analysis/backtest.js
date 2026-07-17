/**
 * Backtest Engine for Pattern Matching using Euclidean Distance.
 * This module calculates historical pattern matches and statistical win rates
 * to help evaluate trading strategies based on mathematical distance.
 * 
 * @module technical-analysis/backtest
 */

/**
 * Computes Simple Moving Average (SMA).
 * We calculate SMA to measure the baseline average price over a rolling window,
 * which helps evaluate current price deviation (bias).
 * 
 * @param {Array} prices - Chronological array of price ticks
 * @param {number} period - Window size
 * @returns {Array} SMA series, padded with null for initial window
 */
function computeSMA(prices, period) {
  const sma = new Array(prices.length).fill(null);
  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    sum += prices[i].close;
    if (i >= period - 1) {
      if (i >= period) {
        sum -= prices[i - period].close;
      }
      sma[i] = sum / period;
    }
  }
  return sma;
}

/**
 * Computes Relative Strength Index (RSI).
 * We calculate RSI to determine overbought/oversold conditions on a scale of 0-100,
 * which is normalized to [0, 1] for our Euclidean distance space.
 * 
 * @param {Array} prices - Chronological array of price ticks
 * @param {number} period - RSI rolling window (default 14)
 * @returns {Array} RSI series, padded with null
 */
function computeRSI(prices, period = 14) {
  const rsi = new Array(prices.length).fill(null);
  if (prices.length < period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i].close - prices[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i].close - prices[i - 1].close;
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

/**
 * Computes Moving Average Convergence Divergence (MACD) Histogram.
 * MACD Histogram captures changes in momentum strength, direction, and trend duration.
 * We normalize this by current price to ensure comparison scale independence.
 * 
 * @param {Array} prices - Chronological array of price ticks
 * @returns {Array} MACD Histogram series, padded with null
 */
function computeMACD(prices) {
  const macdHist = new Array(prices.length).fill(null);
  if (prices.length < 26) return macdHist;

  // EMA helper function. We use EMA rather than SMA to give more weight to recent prices
  // in MACD calculations, capturing trend reversals faster.
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    const result = new Array(data.length).fill(null);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i].close;
    result[period - 1] = sum / period;

    for (let i = period; i < data.length; i++) {
      result[i] = data[i].close * k + result[i - 1] * (1 - k);
    }
    return result;
  };

  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  
  const macdLine = new Array(prices.length).fill(null);
  for (let i = 25; i < prices.length; i++) {
    macdLine[i] = ema12[i] - ema26[i];
  }

  // Signal line (9 EMA of MACD Line)
  const signal = new Array(prices.length).fill(null);
  const k9 = 2 / (9 + 1);
  let sumMacd = 0;
  for (let i = 25; i < 25 + 9; i++) sumMacd += macdLine[i];
  signal[33] = sumMacd / 9;

  for (let i = 34; i < prices.length; i++) {
    signal[i] = macdLine[i] * k9 + signal[i - 1] * (1 - k9);
  }

  for (let i = 33; i < prices.length; i++) {
    macdHist[i] = macdLine[i] - signal[i];
  }
  return macdHist;
}

/**
 * Calculates historical pattern match based on Euclidean Distance.
 * Compares current technical indicator state (RSI, MA Bias, MACD Ratio) with 
 * historical data points to find the most similar historical patterns.
 * Calculates forward returns (5d, 10d, 20d) and win rates of those historical patterns
 * to provide a statistical prediction baseline.
 * 
 * @param {Array} prices - Chronological array of price ticks
 * @returns {Object} Backtest metrics and Top similar dates
 */
function calculateBacktest(prices) {
  // We need at least 50 periods to ensure indicator stability (MACD signals start around index 33, 
  // and we want at least some lookback historical points).
  if (prices.length < 50) {
    return { winRate5d: 0.5, winRate10d: 0.5, winRate20d: 0.5, avgReturn5d: 0, avgReturn10d: 0, avgReturn20d: 0, similarDays: [] };
  }

  const rsi = computeRSI(prices, 14);
  const ma20 = computeSMA(prices, 20);
  const macdHist = computeMACD(prices);

  // Normalize features to align variables of different units into a unified metric space
  // for unbiased distance calculation.
  const features = prices.map((p, idx) => {
    if (rsi[idx] === null || ma20[idx] === null || macdHist[idx] === null) return null;
    return {
      date: p.date,
      close: p.close,
      rsi: rsi[idx] / 100, // Normalized to [0, 1]
      maBias: (p.close / ma20[idx]) - 1, // Percentage deviation from moving average
      macdRatio: macdHist[idx] / p.close // Scale-independent momentum metric
    };
  });

  const nowIdx = features.length - 1;
  const vNow = features[nowIdx];

  if (!vNow) {
    return { winRate5d: 0.5, winRate10d: 0.5, winRate20d: 0.5, avgReturn5d: 0, avgReturn10d: 0, avgReturn20d: 0, similarDays: [] };
  }

  // Calculate distances for historical days.
  // We exclude the last 20 days to prevent lookahead overlap (as we compute 20d future returns 
  // for the similar days to form win-rate stats).
  const distances = [];
  for (let i = 33; i < nowIdx - 20; i++) {
    const vHist = features[i];
    if (!vHist) continue;

    const dist = Math.sqrt(
      Math.pow(vHist.rsi - vNow.rsi, 2) +
      Math.pow(vHist.maBias - vNow.maBias, 2) +
      Math.pow(vHist.macdRatio - vNow.macdRatio, 2)
    );

    distances.push({
      idx: i,
      date: vHist.date,
      distance: dist,
      similarity: parseFloat((Math.max(0, 1 - dist) * 100).toFixed(1))
    });
  }

  // Sort by Euclidean distance (ascending) to identify the closest matches first
  distances.sort((a, b) => a.distance - b.distance);
  const top20 = distances.slice(0, 20);

  if (top20.length === 0) {
    return { winRate5d: 0.5, winRate10d: 0.5, winRate20d: 0.5, avgReturn5d: 0, avgReturn10d: 0, avgReturn20d: 0, similarDays: [] };
  }

  // Calculate forward returns and win rates across the top matching historical days
  let up5d = 0, up10d = 0, up20d = 0;
  let sumRet5d = 0, sumRet10d = 0, sumRet20d = 0;

  const similarDays = top20.map(item => {
    const baseClose = prices[item.idx].close;
    
    const ret5d = ((prices[item.idx + 5].close - baseClose) / baseClose) * 100;
    const ret10d = ((prices[item.idx + 10].close - baseClose) / baseClose) * 100;
    const ret20d = ((prices[item.idx + 20].close - baseClose) / baseClose) * 100;

    if (ret5d > 0) up5d++;
    if (ret10d > 0) up10d++;
    if (ret20d > 0) up20d++;

    sumRet5d += ret5d;
    sumRet10d += ret10d;
    sumRet20d += ret20d;

    return {
      date: item.date,
      similarity: item.similarity,
      return5d: parseFloat(ret5d.toFixed(2)),
      return10d: parseFloat(ret10d.toFixed(2)),
      return20d: parseFloat(ret20d.toFixed(2))
    };
  });

  return {
    winRate5d: parseFloat((up5d / top20.length).toFixed(2)),
    winRate10d: parseFloat((up10d / top20.length).toFixed(2)),
    winRate20d: parseFloat((up20d / top20.length).toFixed(2)),
    avgReturn5d: parseFloat((sumRet5d / top20.length).toFixed(2)),
    avgReturn10d: parseFloat((sumRet10d / top20.length).toFixed(2)),
    avgReturn20d: parseFloat((sumRet20d / top20.length).toFixed(2)),
    currentPattern: {
      rsi: parseFloat((vNow.rsi * 100).toFixed(1)),
      ma20Bias: parseFloat((vNow.maBias * 100).toFixed(2)),
      macdRatio: parseFloat((vNow.macdRatio * 1000).toFixed(4))
    },
    similarDays
  };
}

module.exports = { calculateBacktest };
