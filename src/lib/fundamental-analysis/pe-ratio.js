/**
 * P/E Ratio (Price-to-Earnings Ratio) Analysis Module
 * Evaluates stock valuation based on the relationship between stock price and earnings.
 * 
 * Why P/E analysis thresholds are selected:
 * - A P/E below 15 is historically considered undervalued because it is below the long-term S&P 500 average (~16),
 *   providing a margin of safety for value investors.
 * - A P/E between 15 and 25 is fair valuation, indicating the stock price reflects normal growth expectations.
 * - A P/E above 25 is considered overvalued for mature companies, as the investor pays a high premium.
 * - A negative P/E indicates the company is unprofitable, representing higher risk.
 * 
 * @module fundamental-analysis/pe-ratio
 */

/**
 * Analyzes the Price-to-Earnings (P/E) ratio of a stock.
 * 
 * @param {Object} stockData - Stock fundamental data
 * @param {number} [stockData.peRatio] - Direct P/E ratio if available
 * @param {number} [stockData.price] - Stock current price (used for calculation if peRatio is missing)
 * @param {number} [stockData.eps] - Earnings Per Share (used for calculation if peRatio is missing)
 * @returns {Object} P/E analysis result containing value, status, and recommendation
 */
function analyzePERatio(stockData) {
  if (!stockData) {
    return { value: null, status: 'N/A', recommendation: 'Hold' };
  }

  let pe = null;

  // Retrieve or compute P/E ratio.
  // We prefer using the pre-calculated peRatio, but fall back to calculating it dynamically
  // from price and eps to ensure maximum data coverage.
  if (typeof stockData.peRatio === 'number') {
    pe = stockData.peRatio;
  } else if (typeof stockData.price === 'number' && typeof stockData.eps === 'number' && stockData.eps !== 0) {
    pe = stockData.price / stockData.eps;
  }

  if (pe === null || isNaN(pe)) {
    return { value: null, status: 'N/A', recommendation: 'Hold' };
  }

  // Rounding to 2 decimal places for presentation consistency.
  pe = Math.round(pe * 100) / 100;

  if (pe < 0) {
    return {
      value: pe,
      status: 'N/A (Loss)',
      recommendation: 'Avoid'
    };
  }

  if (pe < 15) {
    return {
      value: pe,
      status: 'Undervalued',
      recommendation: 'Buy'
    };
  }

  if (pe <= 25) {
    return {
      value: pe,
      status: 'Fair',
      recommendation: 'Hold'
    };
  }

  return {
    value: pe,
    status: 'Overvalued',
    recommendation: 'Sell'
  };
}

export {analyzePERatio};
