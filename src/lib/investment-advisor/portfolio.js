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
    // We supply a robust default response layout to maintain consistent API schemas
    // even when inputs lack required fundamental metadata, safeguarding downstream UI modules.
    return {
      targetWeight: 0,
      allocationClass: 'Under Review',
      rationale: 'Insufficient fundamental data to provide portfolio allocation advice.',
      healthScore: 0,
      sentimentScore: 0,
      breakdown: {
        pe: { score: 0, status: 'N/A' },
        eps: { score: 0, status: 'N/A' },
        debtRatio: { score: 0, status: 'N/A' },
        revenueGrowth: { score: 0, status: 'N/A' },
        cashFlow: { score: 0, status: 'N/A' }
      }
    };
  }

  const { fundamental, news } = analysisResults;

  // We assign separate tracking variables for each sub-metric score.
  // Using explicit variables instead of mutating a single counter satisfies the breakdown schema requirement
  // and maintains full auditability of the investment engine's decisions.
  let debtScore = 0;
  let epsScore = 0;
  let revenueScore = 0;
  let cashScore = 0;
  let peScore = 0;

  const debtStatus = fundamental.debtRatio ? fundamental.debtRatio.status || 'N/A' : 'N/A';
  const epsStatus = fundamental.eps ? fundamental.eps.status || 'N/A' : 'N/A';
  const revenueStatus = fundamental.revenueGrowth ? fundamental.revenueGrowth.status || 'N/A' : 'N/A';
  const cashStatus = fundamental.cashFlow ? fundamental.cashFlow.status || 'N/A' : 'N/A';
  const peStatus = fundamental.pe ? fundamental.pe.status || 'N/A' : 'N/A';

  if (fundamental.debtRatio) {
    if (fundamental.debtRatio.status === 'Healthy') {
      debtScore = 2;
    } else if (fundamental.debtRatio.status === 'Moderate') {
      debtScore = 1;
    }
  }

  if (fundamental.eps) {
    if (fundamental.eps.status === 'Strong') {
      epsScore = 2;
    } else if (fundamental.eps.status === 'Moderate') {
      epsScore = 1;
    }
  }

  if (fundamental.revenueGrowth) {
    if (fundamental.revenueGrowth.status === 'High Growth') {
      revenueScore = 2;
    } else if (fundamental.revenueGrowth.status === 'Stable Growth') {
      revenueScore = 1;
    }
  }

  if (fundamental.cashFlow) {
    if (fundamental.cashFlow.status === 'Strong') {
      cashScore = 2;
    } else if (fundamental.cashFlow.status === 'Moderate') {
      cashScore = 1;
    }
  }

  if (fundamental.pe) {
    if (fundamental.pe.status === 'Undervalued') {
      peScore = 2;
    } else if (fundamental.pe.status === 'Fair') {
      peScore = 1;
    }
  }

  const healthScore = debtScore + epsScore + revenueScore + cashScore + peScore;

  // We compute the raw sum of available sentiment scores to gauge current public and financial consensus.
  // Normalizing or modifying the raw score here provides a scalar bias to modify target weights in allocation rules.
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
    rationale,
    healthScore,
    sentimentScore,
    breakdown: {
      pe: { score: peScore, status: peStatus },
      eps: { score: epsScore, status: epsStatus },
      debtRatio: { score: debtScore, status: debtStatus },
      revenueGrowth: { score: revenueScore, status: revenueStatus },
      cashFlow: { score: cashScore, status: cashStatus }
    }
  };
}

module.exports = { generatePortfolioAdvice };
