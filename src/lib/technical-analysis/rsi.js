/**
 * Relative Strength Index (RSI) calculation using Wilder's Smoothing Method.
 * @module technical-analysis/rsi
 */

/**
 * Calculates the RSI for a given price array using Wilder's Smoothing Method.
 * Returns an array of the same length as prices, with null values
 * for indices where RSI cannot be computed (i.e., indices < period).
 *
 * Formula:
 *   RSI = 100 - (100 / (1 + RS))
 *   RS = avgGain / avgLoss
 *
 * Wilder's Smoothing:
 *   First avgGain / avgLoss = simple average of gains/losses over initial period.
 *   Subsequent values are smoothed: avgGain = (prevAvgGain * (period - 1) + currentGain) / period
 *
 * @param {number[]} prices - Array of closing prices.
 * @param {number} [period=14] - The RSI period (default 14).
 * @returns {(number|null)[]} RSI values aligned with the input array.
 */
function calculateRSI(prices, period = 14) {
  if (!Array.isArray(prices) || prices.length < period + 1 || period < 1) {
    return new Array(prices.length).fill(null);
  }

  const result = new Array(prices.length).fill(null);

  // Calculate initial gains and losses for the first period
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Compute first RSI value at index = period
  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  // Compute subsequent RSI values using Wilder's Smoothing
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change >= 0 ? 0 : Math.abs(change);

    // Wilder's Smoothing
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

export {calculateRSI};
