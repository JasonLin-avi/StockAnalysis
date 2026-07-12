/**
 * Portfolio Allocation Advisory Module
 * Suggests portfolio weighting based on stock health, risk metrics, and market conditions.
 * 
 * Why target weights and classes are chosen:
 * - Portfolio diversification is the only free lunch in finance; hence no single stock 
 *   should exceed a 15% allocation limit to avoid concentration risk.
 * - Stocks with excellent fundamentals and positive sentiment are classified as "Overweight" 
 *   (target 10% - 15%) because they offer the best risk-adjusted return potential.
 * - Moderate stocks are "Equal Weight" (5% - 9%), serving as core holdings.
 * - High-risk or declining stocks are designated as "Avoid" (0%) or "Underweight" (1% - 4%) 
 *   to preserve capital against permanent losses.
 * 
 * @module investment-advisor/portfolio
 */

/**
 * Generates portfolio allocation advice.
 * 
 * @param {Object} analysisResults - Consolidated analysis containing fundamental, technical, and news modules
 * @returns {Object} Portfolio advice containing targetWeight, allocationClass, and rationale
 */
function generatePortfolioAdvice(analysisResults) {
  if (!analysisResults || !analysisResults.fundamental) {
    return {
      targetWeight: 0,
      allocationClass: 'Under Review',
      rationale: 'Insufficient fundamental data to provide portfolio allocation advice.'
    };
  }

  const { fundamental, news } = analysisResults;

  // Grade fundamental health (out of 10 points)
  // Strong/Healthy states yield 2 points, while Moderate/Fair states yield 1 point.
  // This allows more granular asset allocation recommendations.
  let healthScore = 0;
  
  if (fundamental.debtRatio) {
    if (fundamental.debtRatio.status === 'Healthy') healthScore += 2;
    else if (fundamental.debtRatio.status === 'Moderate') healthScore += 1;
  }
  if (fundamental.eps) {
    if (fundamental.eps.status === 'Strong') healthScore += 2;
    else if (fundamental.eps.status === 'Moderate') healthScore += 1;
  }
  if (fundamental.revenueGrowth) {
    if (fundamental.revenueGrowth.status === 'High Growth') healthScore += 2;
    else if (fundamental.revenueGrowth.status === 'Stable Growth') healthScore += 1;
  }
  if (fundamental.cashFlow) {
    if (fundamental.cashFlow.status === 'Strong') healthScore += 2;
    else if (fundamental.cashFlow.status === 'Moderate') healthScore += 1;
  }
  if (fundamental.pe) {
    if (fundamental.pe.status === 'Undervalued') healthScore += 2;
    else if (fundamental.pe.status === 'Fair') healthScore += 1;
  }

  // Sentiment modifier (-1 to +1)
  let sentimentScore = 0;
  if (news && news.financialNews) {
    sentimentScore += news.financialNews.score || 0;
  }
  if (news && news.socialSentiment) {
    sentimentScore += news.socialSentiment.score || 0;
  }

  let targetWeight = 0.05; // Default to 5% (standard equal weight)
  let allocationClass = 'Equal Weight';
  let rationale = 'Average financial health with stable market sentiment. Recommend standard allocation.';

  if (fundamental.debtRatio && fundamental.debtRatio.status === 'High Risk') {
    targetWeight = 0.0;
    allocationClass = 'Avoid';
    rationale = 'High financial leverage and solvency risks. Recommend avoiding this asset to preserve capital.';
  } else if (healthScore >= 8 && sentimentScore > 0.5) {
    targetWeight = 0.12; // 12% allocation
    allocationClass = 'Overweight';
    rationale = 'Excellent fundamental health paired with highly bullish market sentiment. Suitable for overweighting.';
  } else if (healthScore >= 5 && sentimentScore >= 0) {
    targetWeight = 0.08; // 8% allocation
    allocationClass = 'Equal Weight';
    rationale = 'Solid balance sheet and stable revenue stream. Suitable as a core defensive portfolio holding.';
  } else if (healthScore <= 3 || sentimentScore < -0.5) {
    targetWeight = 0.02; // 2% allocation
    allocationClass = 'Underweight';
    rationale = 'Weakening profitability or deteriorating market sentiment. Reduce exposure to minimize downside risk.';
  }

  return {
    targetWeight,
    allocationClass,
    rationale
  };
}

module.exports = { generatePortfolioAdvice };
