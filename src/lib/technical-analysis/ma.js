/**
 * Simple Moving Average (SMA) calculation.
 * @module technical-analysis/ma
 */

/**
 * Calculates the Simple Moving Average for a given price array.
 * Returns an array of the same length as prices, with null values
 * for indices where the MA cannot be computed (i.e., indices < period - 1).
 *
 * @param {number[]} prices - Array of closing prices.
 * @param {number} period - The moving average period (must be >= 1).
 * @returns {(number|null)[]} SMA values aligned with the input array.
 */
function calculateMA(prices, period) {
  if (!Array.isArray(prices) || prices.length === 0 || period < 1) {
    return [];
  }

  const result = new Array(prices.length).fill(null);

  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += prices[j];
    }
    result[i] = sum / period;
  }

  return result;
}

export {calculateMA};
