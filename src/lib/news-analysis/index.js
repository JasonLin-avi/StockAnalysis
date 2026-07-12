/**
 * News and Sentiment Analysis Module Index
 * Consolidates media sentiment, retail social discussions, and corporate events.
 * 
 * Why this integration layer is created:
 * - Market sentiment is multi-faceted; combining traditional journalism (financial-news) with retail chatter
 *   (social-sentiment) and core catalysts (major-events) provides a holistic sentiment overview.
 * - Centralizing these async calls simplifies endpoint controllers, making it easier to fetch all news-related
 *   analyses in a single request.
 * 
 * @module news-analysis
 */

const { analyzeFinancialNews } = require('./financial-news');
const { analyzeSocialSentiment } = require('./social-sentiment');
const { analyzeMajorEvents } = require('./major-events');

/**
 * Performs a complete news, sentiment, and event analysis for a given stock symbol.
 * 
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Object containing financialNews, socialSentiment, and majorEvents analyses
 */
async function performNewsAnalysis(symbol) {
  const ticker = symbol || '';

  // Run all news-related analyses in parallel to minimize overall network wait times.
  const [financialNews, socialSentiment, majorEvents] = await Promise.all([
    analyzeFinancialNews(ticker),
    analyzeSocialSentiment(ticker),
    analyzeMajorEvents(ticker)
  ]);

  return {
    financialNews,
    socialSentiment,
    majorEvents
  };
}

module.exports = {
  performNewsAnalysis,
  analyzeFinancialNews,
  analyzeSocialSentiment,
  analyzeMajorEvents
};
