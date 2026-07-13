/**
 * Social Media Sentiment Analysis Module
 * Fetches social sentiment data from Finnhub's /stock/social-sentiment endpoint.
 *
 * Why Finnhub social-sentiment instead of mock:
 * - Aggregates Reddit and Twitter/X mention volumes and computed positivity scores per day,
 *   giving a real signal of retail investor attention and directional bias.
 * - This is a meaningful leading indicator for high-beta or meme-adjacent stocks where social
 *   discourse often precedes price movement.
 *
 * @module news-analysis/social-sentiment
 */

/**
 * Returns ISO date string for N days ago.
 * @param {number} daysAgo
 * @returns {string} YYYY-MM-DD
 */
function dateNDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/**
 * Computes a single weighted average sentiment score from Finnhub's daily social data array.
 * Finnhub provides positiveMention, negativeMention, and score per day.
 * We weight each day's score by its total mention volume to reflect days with more
 * market activity more heavily.
 *
 * @param {Array<Object>} data - Array of daily social sentiment entries from Finnhub
 * @returns {number} Weighted average score ∈ [-1.0, 1.0]
 */
function computeWeightedScore(data) {
  let totalMentions = 0;
  let weightedSum = 0;

  data.forEach(entry => {
    const mentions = (entry.positiveMention || 0) + (entry.negativeMention || 0);
    const dayScore = entry.score ?? 0;
    weightedSum += dayScore * mentions;
    totalMentions += mentions;
  });

  if (totalMentions === 0) return 0;
  return Math.round((weightedSum / totalMentions) * 100) / 100;
}

/**
 * Fetches and analyzes social media sentiment for a stock symbol from Finnhub.
 * Returns null score when data is unavailable so the caller can exclude this
 * dimension from the portfolio scoring rather than assign a misleading neutral.
 *
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} { score, sentiment, mentionVolume } or { score: null, sentiment: 'N/A', mentionVolume: 0 }
 */
async function analyzeSocialSentiment(symbol) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return { score: null, sentiment: 'N/A', mentionVolume: 0 };
  }

  const ticker = (symbol || '').toUpperCase();
  const from = dateNDaysAgo(7);
  const url = `https://finnhub.io/api/v1/stock/social-sentiment?symbol=${encodeURIComponent(ticker)}&from=${from}&token=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'stock-analysis-platform/1.0' }
    });

    if (!response.ok) {
      // Why null instead of 0: a failed request means we have no data, not that sentiment is neutral.
      // Returning null allows buy-sell.js to skip this dimension in score accumulation.
      console.warn(`Finnhub social-sentiment API error for ${ticker}: ${response.status}`);
      return { score: null, sentiment: 'N/A', mentionVolume: 0 };
    }

    const data = await response.json();
    // Finnhub returns { reddit: [...], twitter: [...] }
    const redditData = Array.isArray(data.reddit) ? data.reddit : [];
    const twitterData = Array.isArray(data.twitter) ? data.twitter : [];
    const allData = [...redditData, ...twitterData];

    if (allData.length === 0) {
      return { score: null, sentiment: 'N/A', mentionVolume: 0 };
    }

    const score = computeWeightedScore(allData);
    const mentionVolume = allData.reduce((sum, e) => sum + (e.positiveMention || 0) + (e.negativeMention || 0), 0);

    let sentiment = 'Neutral';
    if (score > 0.15) sentiment = 'Positive';
    else if (score < -0.15) sentiment = 'Negative';

    return { score, sentiment, mentionVolume };
  } catch (err) {
    console.warn(`analyzeSocialSentiment fetch failed for ${ticker}: ${err.message}`);
    return { score: null, sentiment: 'N/A', mentionVolume: 0 };
  }
}

module.exports = { analyzeSocialSentiment };
