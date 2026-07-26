/**
 * Cash Flow Analysis Module
 * Evaluates the quality of earnings and financial resilience using operating and free cash flows.
 * 
 * Why OCF and FCF are analyzed together:
 * - Net income is an accounting construct subject to non-cash items and adjustments. Cash flow is the 
 *   actual lifeblood of a business.
 * - An Operating Cash Flow (OCF) greater than zero shows that core business activities generate actual cash. 
 *   If OCF is negative, the business is draining cash just by operating, which is a major red flag ("Weak").
 * - Free Cash Flow (FCF) represents the cash left after capital expenditures (CapEx). A positive FCF ("Strong") 
 *   allows the firm to pay dividends, repurchase shares, pay down debt, or acquire other businesses.
 * - A positive OCF but negative FCF ("Moderate") is common in growth phases, where high capital expenditures 
 *   are deployed to build future capacity.
 * 
 * @module fundamental-analysis/cash-flow
 */

/**
 * Analyzes the Cash Flow health of a stock.
 * 
 * @param {Object} stockData - Stock fundamental data
 * @param {number} [stockData.freeCashFlow] - Free cash flow value
 * @param {number} [stockData.operatingCashFlow] - Operating cash flow value
 * @param {number} [stockData.capitalExpenditures] - Capital expenditures (used if freeCashFlow is not provided)
 * @returns {Object} Cash flow analysis result containing freeCashFlow, operatingCashFlow, and status
 */
function analyzeCashFlow(stockData) {
  if (!stockData) {
    return { freeCashFlow: null, operatingCashFlow: null, status: 'N/A' };
  }

  let ocf = typeof stockData.operatingCashFlow === 'number' ? stockData.operatingCashFlow : null;
  let fcf = null;

  if (typeof stockData.freeCashFlow === 'number') {
    fcf = stockData.freeCashFlow;
  } else if (ocf !== null && typeof stockData.capitalExpenditures === 'number') {
    // FCF = Operating Cash Flow - Capital Expenditures
    fcf = ocf - stockData.capitalExpenditures;
  }

  if (ocf === null && fcf === null) {
    return { freeCashFlow: null, operatingCashFlow: null, status: 'N/A' };
  }

  // Classify overall cash flow status based on business sustainability.
  let status = 'N/A';
  if (ocf !== null && ocf <= 0) {
    status = 'Weak';
  } else if (fcf !== null && fcf > 0 && (ocf === null || ocf > 0)) {
    status = 'Strong';
  } else if (ocf !== null && ocf > 0 && fcf !== null && fcf <= 0) {
    status = 'Moderate';
  } else {
    // If only FCF is provided and <= 0, or other single-metric permutations
    status = 'Moderate';
  }

  return {
    freeCashFlow: fcf !== null ? Math.round(fcf * 100) / 100 : null,
    operatingCashFlow: ocf !== null ? Math.round(ocf * 100) / 100 : null,
    status
  };
}

export {analyzeCashFlow};
