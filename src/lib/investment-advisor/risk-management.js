/**
 * Risk Management Advisory Module
 * Identifies systemic and corporate risk factors to safeguard investment capital.
 * 
 * Why risk levels and mitigation strategies are categorized:
 * - Solvency (high debt) and liquidity (negative cash flow) risks are structural; they can force 
 *   a company into bankruptcy, warranting high/critical risk warnings.
 * - Upcoming high-impact events represent binary event risk (earnings, litigation), which can 
 *   cause price gaps overnight. Tightening stop-losses protects the portfolio from tail risk.
 * - Sizing positions based on risk levels ensures that the overall portfolio volatility 
 *   remains within acceptable limits.
 * 
 * @module investment-advisor/risk-management
 */

/**
 * Generates risk management assessments and mitigation advice.
 * 
 * @param {Object} analysisResults - Consolidated analysis containing fundamental, technical, and news modules
 * @returns {Object} Risk advice containing riskLevel, riskFactors, and riskMitigation
 */
function generateRiskManagementAdvice(analysisResults) {
  if (!analysisResults) {
    return {
      riskLevel: 'Medium',
      riskFactors: ['No data available for risk assessment'],
      riskMitigation: 'Exercise caution and verify market conditions before taking action.'
    };
  }

  const { fundamental, news } = analysisResults;
  const riskFactors = [];

  // 1. Solvency Risk
  if (fundamental && fundamental.debtRatio && fundamental.debtRatio.status === 'High Risk') {
    riskFactors.push('High Financial Leverage (Debt Ratio > 70%)');
  }

  // 2. Liquidity Risk (Cash Burn)
  if (fundamental && fundamental.cashFlow && fundamental.cashFlow.status === 'Weak') {
    riskFactors.push('Negative Operating Cash Flow');
  }

  // 3. Profitability Risk
  if (fundamental && fundamental.pe && fundamental.pe.status === 'N/A (Loss)') {
    riskFactors.push('Unprofitable Business Operations (Negative P/E)');
  }

  // 4. Valuation Risk
  if (fundamental && fundamental.pe && fundamental.pe.status === 'Overvalued') {
    riskFactors.push('Elevated Valuation Premium (P/E > 25)');
  }

  // 5. Binary Event Risk
  if (news && news.majorEvents && news.majorEvents.hasHighImpactEvent) {
    riskFactors.push('Upcoming High-Impact Corporate Catalyst');
  }

  // Determine risk level based on the count of structural and market risk factors.
  let riskLevel = 'Low';
  let riskMitigation = 'Standard trailing stop-loss of 10% recommended to capture long-term upside.';

  const factorCount = riskFactors.length;

  if (factorCount >= 3) {
    riskLevel = 'Critical';
    riskMitigation = 'Extremely high threat of capital impairment. Recommend exiting positions or hedging immediately. Avoid holding through binary events.';
  } else if (factorCount === 2) {
    riskLevel = 'High';
    riskMitigation = 'Significant fundamental headwind. Set a strict 5% stop-loss and limit position size to under 3% of total capital.';
  } else if (factorCount === 1) {
    riskLevel = 'Medium';
    riskMitigation = 'Moderate risk profile. Recommend a 7% trailing stop-loss. Monitor quarterly reports for improvement.';
  }

  return {
    riskLevel,
    riskFactors: factorCount > 0 ? riskFactors : ['No major structural risk factors detected'],
    riskMitigation
  };
}

export {generateRiskManagementAdvice};
