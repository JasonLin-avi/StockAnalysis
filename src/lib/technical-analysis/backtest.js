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
  // We need at least 50 periods to ensure indicator stability (MACD signals start around index 33).
  const emptyFallback = { 
    winRate5d: 0.5, winRate10d: 0.5, winRate20d: 0.5, winRate40d: 0.5, winRate60d: 0.5, winRate120d: 0.5, winRate240d: 0.5,
    avgReturn5d: 0, avgReturn10d: 0, avgReturn20d: 0, avgReturn40d: 0, avgReturn60d: 0, avgReturn120d: 0, avgReturn240d: 0,
    similarDays: [] 
  };

  if (prices.length < 50) return emptyFallback;

  const rsi = computeRSI(prices, 14);
  const ma20 = computeSMA(prices, 20);
  const macdHist = computeMACD(prices);

  const features = prices.map((p, idx) => {
    if (rsi[idx] === null || ma20[idx] === null || macdHist[idx] === null) return null;
    return {
      date: p.date,
      close: p.close,
      rsi: rsi[idx] / 100,
      maBias: (p.close / ma20[idx]) - 1,
      macdRatio: macdHist[idx] / p.close
    };
  });

  const nowIdx = features.length - 1;
  const vNow = features[nowIdx];

  if (!vNow) return emptyFallback;

  const distances = [];
  // Exclude last 20 days to ensure at least 5d/10d/20d returns can be computed without lookahead overlap
  const minLookahead = Math.min(20, Math.max(1, nowIdx - 34));
  for (let i = 33; i < nowIdx - minLookahead; i++) {
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

  distances.sort((a, b) => a.distance - b.distance);
  const top20 = distances.slice(0, 20);

  if (top20.length === 0) return emptyFallback;

  const horizons = [5, 10, 20, 40, 60, 120, 240];
  const horizonStats = {};
  horizons.forEach(h => {
    horizonStats[h] = { upCount: 0, sumRet: 0, validCount: 0 };
  });

  const similarDays = top20.map(item => {
    const baseClose = prices[item.idx].close;
    const dayResult = {
      date: item.date,
      similarity: item.similarity
    };

    horizons.forEach(h => {
      const targetIdx = item.idx + h;
      if (targetIdx < prices.length) {
        const ret = ((prices[targetIdx].close - baseClose) / baseClose) * 100;
        dayResult[`return${h}d`] = parseFloat(ret.toFixed(2));
        horizonStats[h].validCount++;
        horizonStats[h].sumRet += ret;
        if (ret > 0) horizonStats[h].upCount++;
      } else {
        dayResult[`return${h}d`] = null;
      }
    });

    return dayResult;
  });

  const result = {
    currentPattern: {
      rsi: parseFloat((vNow.rsi * 100).toFixed(1)),
      ma20Bias: parseFloat((vNow.maBias * 100).toFixed(2)),
      macdRatio: parseFloat((vNow.macdRatio * 1000).toFixed(4))
    },
    similarDays
  };

  horizons.forEach(h => {
    const stats = horizonStats[h];
    const winRateKey = `winRate${h}d`;
    const avgReturnKey = `avgReturn${h}d`;
    if (stats.validCount > 0) {
      result[winRateKey] = parseFloat((stats.upCount / stats.validCount).toFixed(2));
      result[avgReturnKey] = parseFloat((stats.sumRet / stats.validCount).toFixed(2));
    } else {
      result[winRateKey] = 0.5;
      result[avgReturnKey] = 0;
    }
  });

  return result;
}

export {calculateBacktest};

