/**
 * Financial News Analysis Module
 * Fetches and analyzes current financial news articles for sentiment.
 * 
 * Why this dictionary-based approach is used:
 * - It provides a deterministic, lightweight, and dependency-free method to evaluate sentiment 
 *   without incurring API latency or LLM costs in a local environment.
 * - By mapping key financial verbs (e.g. profit, layoff) to weights, we can compute an overall 
 *   sentiment score between -1.0 (bearish) and 1.0 (bullish).
 * 
 * @module news-analysis/financial-news
 */

// Mock database containing simulated news articles for major stocks to facilitate testing.
const MOCK_NEWS_DATABASE = {
  TSLA: [
    { title: 'Tesla delivers record number of vehicles in Q2, beating expectations', date: '2026-07-10' },
    { title: 'Tesla faces regulatory scrutiny over new autopilot software update', date: '2026-07-08' },
    { title: 'Analysts upgrade Tesla stock to buy following battery technology breakthrough', date: '2026-07-05' }
  ],
  AAPL: [
    { title: 'Apple revenue increases as new AI features drive strong iPhone sales', date: '2026-07-11' },
    { title: 'EU launches fresh antitrust investigation into Apple App Store policies', date: '2026-07-09' },
    { title: 'Apple suppliers cut production forecasts due to global chip shortages', date: '2026-07-04' }
  ]
};

const DEFAULT_NEWS = [
  { title: 'Stock market indexes steady ahead of federal reserve interest rate decision', date: '2026-07-12' },
  { title: 'Global economic report expected to release in the second half of the year', date: '2026-07-11' }
];

const POSITIVE_WORDS = ['record', 'beat', 'upgrade', 'breakthrough', 'increase', 'profit', 'growth', 'success', 'buy', 'win'];
const NEGATIVE_WORDS = ['scrutiny', 'investigation', 'cut', 'shortage', 'loss', 'decline', 'drop', 'risk', 'warning', 'sell'];

/**
 * Fetches and analyzes financial news for a specific stock symbol.
 * 
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Financial news analysis results containing score, sentiment classification, and articles
 */
async function analyzeFinancialNews(symbol) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 50));

  const ticker = (symbol || '').toUpperCase();
  const articles = MOCK_NEWS_DATABASE[ticker] || DEFAULT_NEWS;

  let totalScore = 0;
  let matchesCount = 0;

  articles.forEach(article => {
    const titleLower = article.title.toLowerCase();
    
    // Check for positive word occurrences
    POSITIVE_WORDS.forEach(word => {
      if (titleLower.includes(word)) {
        totalScore += 1;
        matchesCount += 1;
      }
    });

    // Check for negative word occurrences
    NEGATIVE_WORDS.forEach(word => {
      if (titleLower.includes(word)) {
        totalScore -= 1;
        matchesCount += 1;
      }
    });
  });

  // Calculate average score, normalized between -1.0 and 1.0.
  // If no sentiment keywords are matched, the default score is 0.0 (neutral).
  const score = matchesCount > 0 ? Math.round((totalScore / matchesCount) * 100) / 100 : 0;

  let sentiment = 'Neutral';
  if (score > 0.15) {
    sentiment = 'Positive';
  } else if (score < -0.15) {
    sentiment = 'Negative';
  }

  return {
    score,
    sentiment,
    articles
  };
}

module.exports = { analyzeFinancialNews };
