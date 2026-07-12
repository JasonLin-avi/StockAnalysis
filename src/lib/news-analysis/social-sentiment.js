/**
 * Social Media Sentiment Analysis Module
 * Analyzes discussions on platforms like Reddit, Twitter/X, and finance forums.
 * 
 * Why social sentiment is analyzed separately from traditional news:
 * - Retail investor sentiment (e.g. wallstreetbets) often moves speculative or high-beta stocks 
 *   prior to mainstream financial media publication (meme stock dynamics).
 * - "Mention Volume" acts as a proxy for market liquidity and retail participation. High mention volume 
 *   coupled with highly positive or negative sentiment often leads to short-term price volatility.
 * 
 * @module news-analysis/social-sentiment
 */

const MOCK_SOCIAL_POSTS = {
  TSLA: [
    { text: 'Tesla is going to the moon with this new FSD release, loading up on calls!', source: 'Reddit' },
    { text: 'Unpopular opinion: TSLA is overpriced, bubble has to pop eventually. Bearish.', source: 'Twitter' },
    { text: 'Love my Model Y, and loving this stock performance. Buy and hold!', source: 'Reddit' },
    { text: 'TSLA has too much competition now, dumping my shares.', source: 'Twitter' }
  ],
  AAPL: [
    { text: 'Apple intelligence is going to spark a massive upgrade cycle. Very bullish.', source: 'Reddit' },
    { text: 'AAPL is a safe haven in this choppy market. Good hold.', source: 'Twitter' },
    { text: 'Is it just me or is AAPL losing its innovation edge? Puts on AAPL.', source: 'Reddit' }
  ]
};

const DEFAULT_POSTS = [
  { text: 'Macro trends look uncertain, holding cash for now.', source: 'Reddit' },
  { text: 'Looking for undervalued stocks, any recommendations?', source: 'Twitter' }
];

const POSITIVE_WORDS = ['moon', 'call', 'calls', 'buy', 'hold', 'love', 'bull', 'bullish', 'undervalued', 'gem'];
const NEGATIVE_WORDS = ['pop', 'bear', 'bearish', 'put', 'puts', 'sell', 'dump', 'overvalued', 'trash', 'scam', 'bubble'];

/**
 * Analyzes social media sentiment and volume for a specific stock symbol.
 * 
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Social sentiment results containing score, sentiment, and mentionVolume
 */
async function analyzeSocialSentiment(symbol) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 50));

  const ticker = (symbol || '').toUpperCase();
  const posts = MOCK_SOCIAL_POSTS[ticker] || DEFAULT_POSTS;
  const mentionVolume = posts.length;

  let totalScore = 0;
  let matchesCount = 0;

  posts.forEach(post => {
    const textLower = post.text.toLowerCase();
    
    POSITIVE_WORDS.forEach(word => {
      if (textLower.includes(word)) {
        totalScore += 1;
        matchesCount += 1;
      }
    });

    NEGATIVE_WORDS.forEach(word => {
      if (textLower.includes(word)) {
        totalScore -= 1;
        matchesCount += 1;
      }
    });
  });

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
    mentionVolume
  };
}

module.exports = { analyzeSocialSentiment };
