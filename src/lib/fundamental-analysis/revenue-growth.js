/**
 * Revenue Growth Analysis Module
 * Evaluates the expansion rate of the company's top-line business operations.
 * 
 * Why Revenue Growth thresholds are selected:
 * - A growth rate above 10% (0.10) is classified as "High Growth" because it exceeds inflation 
 *   and typical GDP growth, demonstrating that the company is actively expanding market share or launching successful new products.
 * - Growth between 0% and 10% represents "Stable Growth", common in mature companies that have consolidated 
 *   their market position and focus on operational efficiencies.
 * - Negative growth (below 0%) is a clear red flag ("Declining"), indicating potential market saturation, 
 *   loss of product competitiveness, or pricing pressure.
 * 
 * @module fundamental-analysis/revenue-growth
 */

/**
 * Analyzes the Revenue Growth rate of a stock.
 * 
 * @param {Object} stockData - Stock fundamental data
 * @param {number} [stockData.revenueGrowth] - Pre-calculated revenue growth rate (as decimal e.g. 0.12 or percentage e.g. 12)
 * @param {number[]} [stockData.historicalRevenue] - Historical revenue figures (sorted chronologically from oldest to newest)
 * @returns {Object} Revenue growth analysis result containing value and status
 */
function analyzeRevenueGrowth(stockData) {
  if (!stockData) {
    return { value: null, status: 'N/A' };
  }

  let growth = null;

  // Retrieve or compute revenue growth rate.
  // We prefer calculation from historicalRevenue if available, as it is based on audit-ready raw values
  // rather than potentially inconsistent pre-calculated growth rates.
  if (Array.isArray(stockData.historicalRevenue) && stockData.historicalRevenue.length >= 2) {
    const len = stockData.historicalRevenue.length;
    const latest = stockData.historicalRevenue[len - 1];
    const prev = stockData.historicalRevenue[len - 2];

    if (prev > 0) {
      growth = (latest - prev) / prev;
    }
  } else if (typeof stockData.revenueGrowth === 'number') {
    growth = stockData.revenueGrowth;
    // Normalize percentage formats (e.g. 15 instead of 0.15) to decimals.
    if (Math.abs(growth) > 1) {
      growth = growth / 100;
    }
  }

  if (growth === null || isNaN(growth)) {
    return { value: null, status: 'N/A' };
  }

  // Rounding to 4 decimal places for presentation consistency (e.g. 0.1234 -> 12.34%).
  growth = Math.round(growth * 10000) / 10000;

  if (growth > 0.10) {
    return {
      value: growth,
      status: 'High Growth'
    };
  }

  if (growth >= 0) {
    return {
      value: growth,
      status: 'Stable Growth'
    };
  }

  return {
    value: growth,
    status: 'Declining'
  };
}

export {analyzeRevenueGrowth};
