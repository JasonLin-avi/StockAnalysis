/**
 * Fundamental Analysis Module Index
 * Serves as the central integration layer for all fundamental stock metrics.
 * 
 * Why this integration index is implemented:
 * - Decoupling: It allows individual financial metrics to remain simple, unit-testable, and isolated,
 *   while providing a unified interface for the rest of the application (e.g. API endpoints, advice engines).
 * - Graceful degradation: If some pieces of financial data are missing, it collects what is available
 *   and populates the rest with standardized 'N/A' defaults to prevent cascading runtime errors.
 * 
 * @module fundamental-analysis
 */

const { analyzePERatio } = require('./pe-ratio');
const { analyzeEPS } = require('./eps');
const { analyzeDebtRatio } = require('./debt-ratio');
const { analyzeRevenueGrowth } = require('./revenue-growth');
const { analyzeCashFlow } = require('./cash-flow');

/**
 * Performs a comprehensive fundamental analysis using the provided stock data.
 * 
 * @param {Object} stockData - Raw or structured fundamental financial metrics
 * @returns {Object} A comprehensive analysis report containing pe, eps, debtRatio, revenueGrowth, and cashFlow
 */
function performFundamentalAnalysis(stockData) {
  const data = stockData || {};

  const pe = analyzePERatio(data);
  const eps = analyzeEPS(data);
  const debtRatio = analyzeDebtRatio(data);
  const revenueGrowth = analyzeRevenueGrowth(data);
  const cashFlow = analyzeCashFlow(data);

  return {
    pe,
    eps,
    debtRatio,
    revenueGrowth,
    cashFlow
  };
}

module.exports = {
  performFundamentalAnalysis,
  analyzePERatio,
  analyzeEPS,
  analyzeDebtRatio,
  analyzeRevenueGrowth,
  analyzeCashFlow
};
