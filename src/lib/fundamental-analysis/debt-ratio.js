/**
 * Debt Ratio Analysis Module
 * Evaluates the company's financial leverage and long-term solvency risk.
 * 
 * Why Debt Ratio thresholds are selected:
 * - A debt ratio below 50% (0.50) is healthy because the company's assets are funded mostly by equity,
 *   which minimizes bankruptcy risk even during economic downturns.
 * - A debt ratio between 50% and 70% is moderate, typical for capital-intensive industries (e.g. utilities, manufacturing)
 *   that use leverage to boost return on equity, which is safe as long as cash flows are predictable.
 * - A debt ratio above 70% (0.70) represents high risk. During interest rate hikes or sales declines,
 *   the company may experience debt servicing distress and liquidity crises.
 * 
 * @module fundamental-analysis/debt-ratio
 */

/**
 * Analyzes the Debt-to-Assets ratio of a stock.
 * 
 * @param {Object} stockData - Stock fundamental data
 * @param {number} [stockData.debtRatio] - Pre-calculated debt ratio (as decimal e.g. 0.45 or percentage e.g. 45)
 * @param {number} [stockData.totalAssets] - Total assets (used for calculation if debtRatio is missing)
 * @param {number} [stockData.totalLiabilities] - Total liabilities (used for calculation if debtRatio is missing)
 * @returns {Object} Debt ratio analysis result containing value and status
 */
function analyzeDebtRatio(stockData) {
  if (!stockData) {
    return { value: null, status: 'N/A' };
  }

  let ratio = null;

  // Compute or extract the debt ratio.
  // Checks if totalAssets and totalLiabilities are available to compute the ratio dynamically,
  // falling back to direct debtRatio if provided.
  if (typeof stockData.totalLiabilities === 'number' && typeof stockData.totalAssets === 'number' && stockData.totalAssets > 0) {
    ratio = stockData.totalLiabilities / stockData.totalAssets;
  } else if (typeof stockData.debtRatio === 'number') {
    ratio = stockData.debtRatio;
    // Normalize percentages (e.g. 60 instead of 0.6) to decimal form.
    if (ratio > 1) {
      ratio = ratio / 100;
    }
  }

  if (ratio === null || isNaN(ratio)) {
    return { value: null, status: 'N/A' };
  }

  // Rounding to 4 decimal places (for precision e.g. 0.4523 -> 45.23%).
  ratio = Math.round(ratio * 10000) / 10000;

  if (ratio < 0.50) {
    return {
      value: ratio,
      status: 'Healthy'
    };
  }

  if (ratio <= 0.70) {
    return {
      value: ratio,
      status: 'Moderate'
    };
  }

  return {
    value: ratio,
    status: 'High Risk'
  };
}

export {analyzeDebtRatio};
