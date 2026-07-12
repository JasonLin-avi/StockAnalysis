/**
 * Investment Advisor Module Index
 * Consolidates portfolio, action (buy/sell/hold), and risk mitigation advice.
 * 
 * Why this integration index is created:
 * - Single point of entry: Downstream modules (e.g. report generators and page routers) 
 *   can request the entire advisory suite in a single call, ensuring cleaner consumer-side code.
 * - Independence: Keeps portfolio sizing, recommendation scoring, and risk management logic decoupled, 
 *   ensuring each sub-advisor can be tested and modified in isolation.
 * 
 * @module investment-advisor
 */

const { generatePortfolioAdvice } = require('./portfolio');
const { generateBuySellAdvice } = require('./buy-sell');
const { generateRiskManagementAdvice } = require('./risk-management');

/**
 * Generates comprehensive investment and risk advice for a stock based on all analytical angles.
 * 
 * @param {Object} analysisResults - Consolidated analysis containing fundamental, technical, and news modules
 * @returns {Object} Complete advice package containing portfolio, buySell, and risk advice
 */
function generateInvestmentAdvice(analysisResults) {
  const data = analysisResults || {};

  const portfolio = generatePortfolioAdvice(data);
  const buySell = generateBuySellAdvice(data);
  const risk = generateRiskManagementAdvice(data);

  return {
    portfolio,
    buySell,
    risk
  };
}

module.exports = {
  generateInvestmentAdvice,
  generatePortfolioAdvice,
  generateBuySellAdvice,
  generateRiskManagementAdvice
};
