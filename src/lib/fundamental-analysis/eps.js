/**
 * EPS (Earnings Per Share) Analysis Module
 * Evaluates the company's profitability and profitability trend over time.
 * 
 * Why EPS trend analysis is crucial:
 * - Single-period EPS provides a snapshot of profitability, but cannot tell if a business is improving or deteriorating.
 *   Evaluating historical trends helps identify whether the company's competitive advantage (economic moat) 
 *   is widening (growing EPS) or evaporating (declining EPS).
 * - A positive but declining EPS might be a leading indicator of fundamental distress before the company becomes unprofitable.
 * 
 * @module fundamental-analysis/eps
 */

/**
 * Analyzes the Earnings Per Share (EPS) of a stock.
 * 
 * @param {Object} stockData - Stock fundamental data
 * @param {number} [stockData.eps] - Single period EPS value
 * @param {number[]} [stockData.historicalEps] - Historical EPS values (sorted chronologically from oldest to newest)
 * @returns {Object} EPS analysis result containing value, trend, and status
 */
function analyzeEPS(stockData) {
  if (!stockData) {
    return { value: null, trend: 'N/A', status: 'N/A' };
  }

  let value = null;
  let trend = 'N/A';
  let status = 'N/A';

  // Extract latest EPS value.
  // We check for historicalEps first because trending data gives a more complete view of business growth.
  if (Array.isArray(stockData.historicalEps) && stockData.historicalEps.length > 0) {
    const len = stockData.historicalEps.length;
    value = stockData.historicalEps[len - 1];

    if (len >= 2) {
      const prev = stockData.historicalEps[len - 2];
      if (value > prev) {
        trend = 'Growing';
      } else if (value < prev) {
        trend = 'Declining';
      } else {
        trend = 'Flat';
      }
    } else {
      trend = 'Flat';
    }
  } else if (typeof stockData.eps === 'number') {
    value = stockData.eps;
  }

  if (value === null || isNaN(value)) {
    return { value: null, trend: 'N/A', status: 'N/A' };
  }

  value = Math.round(value * 100) / 100;

  // Classify overall status.
  // A growing and positive EPS indicates strong performance, while a declining or negative EPS indicates a weak/risky outlook.
  if (value <= 0) {
    status = 'Weak';
  } else if (trend === 'Growing') {
    status = 'Strong';
  } else if (trend === 'Declining') {
    status = 'Moderate';
  } else {
    // If positive and flat or trend is N/A (no historical data)
    status = 'Moderate';
  }

  return { value, trend, status };
}

module.exports = { analyzeEPS };
