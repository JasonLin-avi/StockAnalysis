/**
 * Financial News Analysis Module
 * Fetches recent financial news from Finnhub and computes sentiment using keyword scoring.
 *
 * Why Finnhub /company-news instead of mock:
 * - Provides real, ticker-specific news headlines updated continuously throughout the trading day.
 * - Keyword-based scoring over real headlines produces a sentiment signal that reflects genuine
 *   market discourse, rather than deterministic mock output that never changes.
 *
 * @module news-analysis/financial-news
 */

const logger = require('../logger');

const POSITIVE_WORDS = ['record', 'beat', 'upgrade', 'breakthrough', 'increase', 'profit', 'growth', 'success', 'buy', 'win', 'surge', 'rally', 'strong'];
const NEGATIVE_WORDS = ['scrutiny', 'investigation', 'cut', 'shortage', 'loss', 'decline', 'drop', 'risk', 'warning', 'sell', 'fall', 'crash', 'weak', 'miss'];

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
 * Computes sentiment score from an array of article titles.
 * Returns { score, sentiment } where score ∈ [-1.0, 1.0].
 * @param {Array<{title: string}>} articles
 * @returns {{ score: number, sentiment: string }}
 */
function scoreArticles(articles) {
  let totalScore = 0;
  let matchesCount = 0;

  articles.forEach(article => {
    const titleLower = (article.headline || article.title || '').toLowerCase();
    POSITIVE_WORDS.forEach(word => {
      if (titleLower.includes(word)) { totalScore += 1; matchesCount += 1; }
    });
    NEGATIVE_WORDS.forEach(word => {
      if (titleLower.includes(word)) { totalScore -= 1; matchesCount += 1; }
    });
  });

  const score = matchesCount > 0 ? Math.round((totalScore / matchesCount) * 100) / 100 : 0;
  let sentiment = 'Neutral';
  if (score > 0.15) sentiment = 'Positive';
  else if (score < -0.15) sentiment = 'Negative';

  return { score, sentiment };
}

/**
 * Fetches and analyzes financial news for a specific stock symbol from Finnhub.
 * Returns null score components when data is unavailable to avoid polluting the sentiment rating.
 *
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Financial news analysis: { score, sentiment, articles } or { score: null, sentiment: 'N/A', articles: [] }
 */
async function analyzeFinancialNews(symbol) {
  const apiKey = process.env.FINNHUB_API_KEY;
  // Why we skip fetch without a key: making an authenticated request without credentials would
  // return a 401 and provide no value; returning null signals to the scoring engine to ignore
  // this dimension rather than assuming a neutral score.
  if (!apiKey) {
    logger.info('FETCH_FINNHUB_NEWS', `Finnhub API key not found. Skipping news analysis for ${symbol}.`);
    return { score: null, sentiment: 'N/A', articles: [] };
  }

  const ticker = (symbol || '').toUpperCase();
  const from = dateNDaysAgo(7);
  const to = dateNDaysAgo(0);
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`;
  const safeUrl = url.replace(/token=[^&]+/, 'token=***');

  logger.info('FETCH_FINNHUB_NEWS', `Fetching company news for ${ticker} from: ${safeUrl}`);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'stock-analysis-platform/1.0' },
      cache: 'no-store' // Why: Ensure news signal reflects real-time data instead of stale Next.js cache
    });

    if (!response.ok) {
      // Why we return null instead of a neutral default:
      // Assigning score=0 when the API fails would silently hide the data gap and produce
      // a misleading "neutral" signal. Returning null lets the caller omit this dimension entirely.
      logger.warn('FETCH_FINNHUB_NEWS', `Finnhub company-news API error for ${ticker}: ${response.status}`);
      return { score: null, sentiment: 'N/A', articles: [] };
    }

    const data = await response.json();
    logger.info('FETCH_FINNHUB_NEWS', `Received response from Finnhub for ${ticker}`, { articlesFetched: data ? data.length : 0 });

    if (!Array.isArray(data) || data.length === 0) {
      logger.warn('FETCH_FINNHUB_NEWS', `No articles found in Finnhub response for ${ticker}`);
      return { score: null, sentiment: 'N/A', articles: [] };
    }

    // Use the 5 most recent articles for scoring to keep signal fresh and reduce noise.
    const recentArticles = data.slice(0, 5);
    const { score, sentiment } = scoreArticles(recentArticles);

    const parsedResult = {
      score,
      sentiment,
      articles: recentArticles.map(a => ({ title: a.headline, date: new Date(a.datetime * 1000).toISOString().split('T')[0], url: a.url }))
    };

    logger.info('FETCH_FINNHUB_NEWS', `Successfully parsed news sentiment for ${ticker}`, parsedResult);
    return parsedResult;
  } catch (err) {
    logger.error('FETCH_FINNHUB_NEWS', `analyzeFinancialNews fetch failed for ${ticker}`, err);
    return { score: null, sentiment: 'N/A', articles: [] };
  }
}

module.exports = { analyzeFinancialNews };
