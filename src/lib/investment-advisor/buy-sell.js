/**
 * Buy/Sell/Hold Action Recommendation Module
 * Combines fundamental, technical, and sentiment metrics into a single recommendation.
 * 
 * Why weight allocations are structured this way:
 * - Fundamentals (50%): The intrinsic value of the business decides the price ceiling/floor 
 *   over a long horizon (3+ years). Value traps are avoided by keeping this as the primary weight.
 * - Technicals (30%): Price action (RSI, MA, MACD) identifies entry and exit momentum. This helps 
 *   investors avoid buying falling knives or selling too early in a strong bull market.
 * - Sentiment (20%): News and retail social consensus act as short-term catalysts that drive volatility,
 *   helping time the trade relative to market emotion.
 * 
 * @module investment-advisor/buy-sell
 */

/**
 * Generates buy, sell, or hold recommendation with confidence scores.
 * 
 * @param {Object} analysisResults - Consolidated analysis containing fundamental, technical, and news modules
 * @param {number} [analysisResults.price] - Current stock price (optional, used in technical evaluation)
 * @returns {Object} Action advice containing action, confidenceScore, and summary
 */
function generateBuySellAdvice(analysisResults) {
  if (!analysisResults) {
    // We provide a fully populated default structure even when input is null or empty
    // to maintain schema consistency and guarantee that upstream components do not crash 
    // when attempting to access nested properties on the advice payload.
    return {
      action: 'Hold',
      confidenceScore: 0.5,
      summary: 'No data provided. Defaulting to Hold.',
      totalScore: 50,
      sentimentScore: 10,
      breakdown: {
        technical: {
          rsi: { value: null, score: 5 },
          ma: { value: null, score: 5 },
          macd: { value: null, score: 5 }
        },
        fundamental: {
          pe: { status: 'N/A', score: 5 },
          eps: { status: 'N/A', score: 5 },
          debtRatio: { status: 'N/A', score: 5 },
          revenueGrowth: { status: 'N/A', score: 5 },
          cashFlow: { status: 'N/A', score: 5 }
        },
        sentiment: {
          financialNews: { score: 5 },
          socialSentiment: { score: 5 }
        }
      }
    };
  }

  const { technical, fundamental, news } = analysisResults;

  // We manage distinct local variables for each metric's status/value and score,
  // rather than accumulating into a single global score variable immediately.
  // This isolated variable schema is critical to populate the detailed 'breakdown'
  // object without losing the identity and granular score of each indicator.
  let rsiScore = 5;
  let rsiValue = null;
  let rsiStatus = 'Neutral';
  let maScore = 5;
  let maValue = null;
  let maStatus = 'Bearish';
  let macdScore = 5;
  let macdValue = null;
  let macdStatus = 'Bearish';

  let peScore = 5;
  let peStatus = 'N/A';
  let epsScore = 5;
  let epsStatus = 'N/A';
  let debtScore = 5;
  let debtStatus = 'N/A';
  let revenueScore = 5;
  let revenueStatus = 'N/A';
  let cashScore = 5;
  let cashStatus = 'N/A';

  let newsScoreNormalized = 5;
  let socialScoreNormalized = 5;

  // We evaluate technical metrics and override their default neutral settings
  // if relevant indicators are provided in the input payload.
  if (technical) {
    if (Array.isArray(technical.rsi) && technical.rsi.length > 0) {
      rsiValue = technical.rsi[technical.rsi.length - 1];
      if (rsiValue !== null && rsiValue !== undefined) {
        // RSI values below 30 point to oversold conditions (bullish catalyst),
        // values above 70 indicate overbought conditions (bearish risk),
        // and values in between indicate standard trading ranges (neutral).
        if (rsiValue < 30) {
          rsiScore = 10;
          rsiStatus = 'Oversold';
        } else if (rsiValue > 70) {
          rsiScore = 3;
          rsiStatus = 'Overbought';
        } else {
          rsiScore = 7;
          rsiStatus = 'Neutral';
        }
      }
    }

    if (Array.isArray(technical.ma) && technical.ma.length > 0) {
      maValue = technical.ma[technical.ma.length - 1];
      const currentPrice = analysisResults.price;
      if (currentPrice && maValue !== null && maValue !== undefined) {
        // Price staying above the moving average is a standard bullish trend sign,
        // while falling below indicates a bearish trend setup.
        maScore = currentPrice >= maValue ? 10 : 3;
        maStatus = currentPrice >= maValue ? 'Bullish' : 'Bearish';
      } else {
        // In the absence of a current price reference, we fall back to a neutral score
        // to prevent skewing the technical rating too far in either direction.
        maScore = 7;
        maStatus = 'Bearish';
      }
    }

    if (technical.macd && Array.isArray(technical.macd.histogram) && technical.macd.histogram.length > 0) {
      macdValue = technical.macd.histogram[technical.macd.histogram.length - 1];
      if (macdValue !== null && macdValue !== undefined) {
        // Positive MACD histogram bars represent upward momentum (bullish),
        // while negative bars indicate deceleration or downward momentum (bearish).
        macdScore = macdValue >= 0 ? 10 : 3;
        macdStatus = macdValue >= 0 ? 'Bullish' : 'Bearish';
      }
    }
  }

  // We analyze fundamental valuation and financial health indicators.
  if (fundamental) {
    if (fundamental.pe) {
      peStatus = fundamental.pe.status || 'N/A';
      if (peStatus === 'Undervalued') peScore = 10;
      else if (peStatus === 'Fair') peScore = 7;
      else if (peStatus === 'Overvalued') peScore = 3;
      else peScore = 1;
    }

    if (fundamental.eps) {
      epsStatus = fundamental.eps.status || 'N/A';
      if (epsStatus === 'Strong') epsScore = 10;
      else if (epsStatus === 'Moderate') epsScore = 7;
      else epsScore = 2;
    }

    if (fundamental.debtRatio) {
      debtStatus = fundamental.debtRatio.status || 'N/A';
      if (debtStatus === 'Healthy') debtScore = 10;
      else if (debtStatus === 'Moderate') debtScore = 7;
      else debtScore = 2;
    }

    if (fundamental.revenueGrowth) {
      revenueStatus = fundamental.revenueGrowth.status || 'N/A';
      if (revenueStatus === 'High Growth') revenueScore = 10;
      else if (revenueStatus === 'Stable Growth') revenueScore = 7;
      else revenueScore = 2;
    }

    if (fundamental.cashFlow) {
      cashStatus = fundamental.cashFlow.status || 'N/A';
      if (cashStatus === 'Strong') cashScore = 10;
      else if (cashStatus === 'Moderate') cashScore = 7;
      else cashScore = 2;
    }
  }

  let newsScore = 0;
  let socialScore = 0;
  // We convert sentiment scores from a range of [-1.0, 1.0] to a positive score out of 10
  // to standardize their scales and simplify consolidation with fundamental/technical ratings.
  if (news) {
    newsScore = (news.financialNews && news.financialNews.score !== undefined) ? news.financialNews.score : 0;
    socialScore = (news.socialSentiment && news.socialSentiment.score !== undefined) ? news.socialSentiment.score : 0;
    newsScoreNormalized = (newsScore + 1) * 5;
    socialScoreNormalized = (socialScore + 1) * 5;
  }

  const techScore = rsiScore + maScore + macdScore;
  const fundScore = peScore + epsScore + debtScore + revenueScore + cashScore;
  const sentScore = newsScoreNormalized + socialScoreNormalized;
  const totalScore = techScore + fundScore + sentScore;

  let action = 'Hold';
  let confidenceScore = 0.5;
  let summary = 'Overall indicators point to a stable outlook. Suggest maintaining current holdings.';

  if (totalScore >= 70) {
    action = 'Buy';
    // We scale the confidence score based on how far the rating exceeds the buy threshold (70)
    // up to a ceiling of 0.95 at a maximum score of 100.
    confidenceScore = Math.round((0.70 + ((totalScore - 70) / 30) * 0.25) * 100) / 100;
    summary = `Strong fundamentals and positive market catalysts support buying. Confidence score: ${confidenceScore}.`;
  } else if (totalScore <= 40) {
    action = 'Sell';
    // We scale the confidence score based on how far below the sell threshold (40) the rating drops
    // to reflect higher certainty in risk management actions.
    confidenceScore = Math.round((0.70 + ((40 - totalScore) / 40) * 0.25) * 100) / 100;
    summary = `Weak core metrics or negative trends signal selling pressure. Risk-mitigation recommended. Confidence score: ${confidenceScore}.`;
  } else {
    // We adjust hold confidence linearly based on the relative position of the score 
    // within the neutral region [40, 70] to capture subtle bias towards buy/sell boundaries.
    confidenceScore = Math.round((0.50 + ((totalScore - 40) / 30) * 0.20) * 100) / 100;
  }

  return {
    action,
    confidenceScore,
    summary,
    totalScore,
    sentimentScore: sentScore,
    breakdown: {
      technical: {
        rsi: { value: rsiValue, status: rsiStatus, score: rsiScore },
        ma: { value: analysisResults.price, ma: maValue, status: maStatus, score: maScore },
        macd: { value: macdValue, status: macdStatus, score: macdScore }
      },
      fundamental: {
        pe: { status: peStatus, score: peScore },
        eps: { status: epsStatus, score: epsScore },
        debtRatio: { status: debtStatus, score: debtScore },
        revenueGrowth: { status: revenueStatus, score: revenueScore },
        cashFlow: { status: cashStatus, score: cashScore }
      },
      sentiment: {
        score: sentScore,
        news: { value: newsScore, score: newsScoreNormalized },
        social: { value: socialScore, score: socialScoreNormalized }
      }
    }
  };
}

module.exports = { generateBuySellAdvice };
