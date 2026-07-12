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
    return { action: 'Hold', confidenceScore: 0.5, summary: 'No data provided. Defaulting to Hold.' };
  }

  const { technical, fundamental, news } = analysisResults;

  // 1. Technical Scoring (Max 30 points)
  let techScore = 0;
  if (technical) {
    // RSI scoring: Oversold (< 30) is a buy catalyst (+10), overbought (> 70) is a risk (+3), mid-range is neutral (+7).
    if (Array.isArray(technical.rsi) && technical.rsi.length > 0) {
      const latestRsi = technical.rsi[technical.rsi.length - 1];
      if (latestRsi !== null && latestRsi !== undefined) {
        if (latestRsi < 30) techScore += 10;
        else if (latestRsi > 70) techScore += 3;
        else techScore += 7;
      } else {
        techScore += 5;
      }
    } else {
      techScore += 5;
    }

    // Moving Average scoring: Bullish price > MA (+10), Bearish price < MA (+3).
    // If exact price isn't provided, we check trend if possible, or give a default score.
    if (Array.isArray(technical.ma) && technical.ma.length > 0) {
      const latestMa = technical.ma[technical.ma.length - 1];
      const currentPrice = analysisResults.price;
      if (currentPrice && latestMa) {
        techScore += currentPrice >= latestMa ? 10 : 3;
      } else {
        techScore += 7; // Default neutral trend score
      }
    } else {
      techScore += 5;
    }

    // MACD scoring: Positive histogram indicates upward momentum (+10), negative indicates downward momentum (+3).
    if (technical.macd && Array.isArray(technical.macd.histogram) && technical.macd.histogram.length > 0) {
      const latestHist = technical.macd.histogram[technical.macd.histogram.length - 1];
      if (latestHist !== null && latestHist !== undefined) {
        techScore += latestHist >= 0 ? 10 : 3;
      } else {
        techScore += 5;
      }
    } else {
      techScore += 5;
    }
  } else {
    techScore = 15; // default half-weight
  }

  // 2. Fundamental Scoring (Max 50 points)
  let fundScore = 0;
  if (fundamental) {
    // P/E valuation
    if (fundamental.pe) {
      if (fundamental.pe.status === 'Undervalued') fundScore += 10;
      else if (fundamental.pe.status === 'Fair') fundScore += 7;
      else if (fundamental.pe.status === 'Overvalued') fundScore += 3;
      else fundScore += 1;
    } else {
      fundScore += 5;
    }

    // EPS health
    if (fundamental.eps) {
      if (fundamental.eps.status === 'Strong') fundScore += 10;
      else if (fundamental.eps.status === 'Moderate') fundScore += 7;
      else fundScore += 2;
    } else {
      fundScore += 5;
    }

    // Debt safety
    if (fundamental.debtRatio) {
      if (fundamental.debtRatio.status === 'Healthy') fundScore += 10;
      else if (fundamental.debtRatio.status === 'Moderate') fundScore += 7;
      else fundScore += 2;
    } else {
      fundScore += 5;
    }

    // Revenue momentum
    if (fundamental.revenueGrowth) {
      if (fundamental.revenueGrowth.status === 'High Growth') fundScore += 10;
      else if (fundamental.revenueGrowth.status === 'Stable Growth') fundScore += 7;
      else fundScore += 2;
    } else {
      fundScore += 5;
    }

    // Cash sustainability
    if (fundamental.cashFlow) {
      if (fundamental.cashFlow.status === 'Strong') fundScore += 10;
      else if (fundamental.cashFlow.status === 'Moderate') fundScore += 7;
      else fundScore += 2;
    } else {
      fundScore += 5;
    }
  } else {
    fundScore = 25; // default half-weight
  }

  // 3. Sentiment Scoring (Max 20 points)
  let sentScore = 0;
  if (news) {
    const newsScore = news.financialNews ? news.financialNews.score : 0;
    const socialScore = news.socialSentiment ? news.socialSentiment.score : 0;

    // Normalizing -1.0 to 1.0 into 0 to 10 points
    sentScore += (newsScore + 1) * 5;
    sentScore += (socialScore + 1) * 5;
  } else {
    sentScore = 10; // default half-weight
  }

  // 4. Combined Recommendation Evaluation
  const totalScore = techScore + fundScore + sentScore;

  let action = 'Hold';
  let confidenceScore = 0.5;
  let summary = 'Overall indicators point to a stable outlook. Suggest maintaining current holdings.';

  if (totalScore >= 70) {
    action = 'Buy';
    // Confidence score scaled based on how far above 70 the score is (max confidence 0.95 at score 100)
    confidenceScore = Math.round((0.70 + ((totalScore - 70) / 30) * 0.25) * 100) / 100;
    summary = `Strong fundamentals and positive market catalysts support buying. Confidence score: ${confidenceScore}.`;
  } else if (totalScore <= 40) {
    action = 'Sell';
    // Confidence score scaled based on how far below 40 the score is (max confidence 0.95 at score 0)
    confidenceScore = Math.round((0.70 + ((40 - totalScore) / 40) * 0.25) * 100) / 100;
    summary = `Weak core metrics or negative trends signal selling pressure. Risk-mitigation recommended. Confidence score: ${confidenceScore}.`;
  } else {
    confidenceScore = Math.round((0.50 + ((totalScore - 40) / 30) * 0.20) * 100) / 100;
  }

  return {
    action,
    confidenceScore,
    summary
  };
}

module.exports = { generateBuySellAdvice };
