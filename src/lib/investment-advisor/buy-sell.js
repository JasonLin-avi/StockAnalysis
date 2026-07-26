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
      totalScore: 0,
      sentimentScore: 0,
      breakdown: {
        technical: {
          rsi: { value: null, status: 'Neutral', score: 0 },
          ma: { value: null, ma: null, status: 'Bearish', score: 0 },
          macd: { value: null, status: 'Bearish', score: 0 }
        },
        fundamental: {
          pe: { status: 'N/A', score: 0 },
          eps: { status: 'N/A', score: 0 },
          debtRatio: { status: 'N/A', score: 0 },
          revenueGrowth: { status: 'N/A', score: 0 },
          cashFlow: { status: 'N/A', score: 0 }
        },
        sentiment: {
          score: 0,
          news: { value: 0, score: 0 },
          social: { value: 0, score: 0 }
        }
      }
    };
  }

  const { technical, fundamental, news } = analysisResults;

  // We manage distinct local variables for each metric's status/value and score,
  // rather than accumulating into a single global score variable immediately.
  // This isolated variable schema is critical to populate the detailed 'breakdown'
  // object without losing the identity and granular score of each indicator.
  let rsiScore = 0;
  let rsiValue = null;
  let rsiStatus = 'Neutral';
  let maScore = 0;
  let maValue = null;
  let maStatus = 'Bearish';
  let macdScore = 0;
  let macdValue = null;
  let macdStatus = 'Bearish';

  let peScore = 0;
  let peStatus = 'N/A';
  let epsScore = 0;
  let epsStatus = 'N/A';
  let debtScore = 0;
  let debtStatus = 'N/A';
  let revenueScore = 0;
  let revenueStatus = 'N/A';
  let cashScore = 0;
  let cashStatus = 'N/A';

  let newsScoreNormalized = 0;
  let socialScoreNormalized = 0;

  // We track the maximum possible score dynamically. If an indicator's value is null 
  // (e.g. data couldn't be fetched), we exclude it from this total so it doesn't penalize the final rating.
  let currentMaxScore = 0;

  // We evaluate technical metrics and override their default neutral settings
  // if relevant indicators are provided in the input payload.
  if (technical) {
    if (Array.isArray(technical.rsi) && technical.rsi.length > 0) {
      rsiValue = technical.rsi[technical.rsi.length - 1];
      if (rsiValue !== null && rsiValue !== undefined) {
        currentMaxScore += 10;
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
      if (currentPrice !== undefined && currentPrice !== null && maValue !== null && maValue !== undefined) {
        currentMaxScore += 10;
        maScore = currentPrice >= maValue ? 10 : 3;
        maStatus = currentPrice >= maValue ? 'Bullish' : 'Bearish';
      } else if (maValue !== null && maValue !== undefined) {
        currentMaxScore += 10;
        maScore = 7;
        maStatus = 'Bearish';
      }
    }

    if (technical.macd && Array.isArray(technical.macd.histogram) && technical.macd.histogram.length > 0) {
      macdValue = technical.macd.histogram[technical.macd.histogram.length - 1];
      if (macdValue !== null && macdValue !== undefined) {
        currentMaxScore += 10;
        macdScore = macdValue >= 0 ? 10 : 3;
        macdStatus = macdValue >= 0 ? 'Bullish' : 'Bearish';
      }
    }
  }

  // We analyze fundamental valuation and financial health indicators.
  if (fundamental) {
    if (fundamental.pe && fundamental.pe.value !== null) {
      peStatus = fundamental.pe.status || 'N/A';
      currentMaxScore += 10;
      if (peStatus === 'Undervalued') peScore = 10;
      else if (peStatus === 'Fair') peScore = 7;
      else if (peStatus === 'Overvalued') peScore = 3;
      else peScore = 1; // N/A (Loss)
    }

    if (fundamental.eps && fundamental.eps.value !== null) {
      epsStatus = fundamental.eps.status || 'N/A';
      currentMaxScore += 10;
      if (epsStatus === 'Strong') epsScore = 10;
      else if (epsStatus === 'Moderate') epsScore = 7;
      else epsScore = 2; // Weak
    }

    if (fundamental.debtRatio && fundamental.debtRatio.value !== null) {
      debtStatus = fundamental.debtRatio.status || 'N/A';
      currentMaxScore += 10;
      if (debtStatus === 'Healthy') debtScore = 10;
      else if (debtStatus === 'Moderate') debtScore = 7;
      else debtScore = 2; // High Risk
    }

    if (fundamental.revenueGrowth && fundamental.revenueGrowth.value !== null) {
      revenueStatus = fundamental.revenueGrowth.status || 'N/A';
      currentMaxScore += 10;
      if (revenueStatus === 'High Growth') revenueScore = 10;
      else if (revenueStatus === 'Stable Growth') revenueScore = 7;
      else revenueScore = 2; // Declining
    }

    // CashFlow can be freeCashFlow or operatingCashFlow; checking status ensures it was processed
    if (fundamental.cashFlow && fundamental.cashFlow.status !== 'N/A') {
      cashStatus = fundamental.cashFlow.status || 'N/A';
      currentMaxScore += 10;
      if (cashStatus === 'Strong') cashScore = 10;
      else if (cashStatus === 'Moderate') cashScore = 7;
      else cashScore = 2; // Weak
    }
  }

  let newsScore = null;
  let socialScore = null;
  // Why we check for null explicitly (not just falsy):
  // When Finnhub returns score=null it means data was unavailable, not that sentiment is neutral.
  // We must exclude null dimensions from the total to avoid silently penalizing stocks whose
  // news data couldn't be fetched, versus stocks with genuinely neutral sentiment (score=0).
  if (news) {
    const rawNewsScore = news.financialNews ? news.financialNews.score : undefined;
    const rawSocialScore = news.socialSentiment ? news.socialSentiment.score : undefined;

    if (rawNewsScore !== null && rawNewsScore !== undefined) {
      newsScore = rawNewsScore;
      newsScoreNormalized = (newsScore + 1) * 5;
      currentMaxScore += 10;
    }
    if (rawSocialScore !== null && rawSocialScore !== undefined) {
      socialScore = rawSocialScore;
      socialScoreNormalized = (socialScore + 1) * 5;
      currentMaxScore += 10;
    }
  }

  const techScore = rsiScore + maScore + macdScore;
  const fundScore = peScore + epsScore + debtScore + revenueScore + cashScore;
  const sentScore = newsScoreNormalized + socialScoreNormalized;
  const rawTotalScore = techScore + fundScore + sentScore;

  // Scale raw score proportionately to 100 based on currentMaxScore
  let totalScore = 50; // Default neutral
  if (currentMaxScore > 0) {
    totalScore = Math.round((rawTotalScore / currentMaxScore) * 100);
  }

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
        // Why: We carry the raw value from each sub-module so the UI can display the actual
        // metric number (e.g. PE = 24.5x, EPS = $3.12) alongside its score, making the
        // scoring process fully transparent. Without value, every cell would render as N/A.
        pe: { value: fundamental && fundamental.pe ? fundamental.pe.value : null, status: peStatus, score: peScore },
        eps: { value: fundamental && fundamental.eps ? fundamental.eps.value : null, status: epsStatus, score: epsScore },
        debtRatio: { value: fundamental && fundamental.debtRatio ? fundamental.debtRatio.value : null, status: debtStatus, score: debtScore },
        revenueGrowth: { value: fundamental && fundamental.revenueGrowth ? fundamental.revenueGrowth.value : null, status: revenueStatus, score: revenueScore },
        cashFlow: { value: fundamental && fundamental.cashFlow ? (fundamental.cashFlow.freeCashFlow ?? fundamental.cashFlow.operatingCashFlow) : null, status: cashStatus, score: cashScore }
      },
      sentiment: {
        score: sentScore,
        news: { value: newsScore, score: newsScoreNormalized },
        social: { value: socialScore, score: socialScoreNormalized }
      }
    }
  };
}

export {generateBuySellAdvice};
