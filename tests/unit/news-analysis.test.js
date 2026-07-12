/**
 * Unit tests for the News and Sentiment Analysis Module.
 * Validates financial news sentiment scoring, social chatter parsing, and major event flag triggers.
 */

const {
  performNewsAnalysis,
  analyzeFinancialNews,
  analyzeSocialSentiment,
  analyzeMajorEvents
} = require('../../src/lib/news-analysis/index');

describe('News and Sentiment Analysis Engine', () => {

  // ---------------------------------------------------------------------------
  // Financial News Analysis Tests
  // ---------------------------------------------------------------------------
  describe('analyzeFinancialNews', () => {
    test('calculates correct sentiment score and category for TSLA (mock)', async () => {
      const result = await analyzeFinancialNews('TSLA');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('articles');
      expect(result.articles.length).toBeGreaterThan(0);
      // TSLA mock news contains positive triggers ("record", "upgrade", "breakthrough")
      // and negative triggers ("scrutiny"). Sentiment score should reflect this mix.
      expect(typeof result.score).toBe('number');
      expect(['Positive', 'Negative', 'Neutral']).toContain(result.sentiment);
    });

    test('calculates correct sentiment score and category for AAPL (mock)', async () => {
      const result = await analyzeFinancialNews('AAPL');
      expect(result.articles.length).toBeGreaterThan(0);
      expect(typeof result.score).toBe('number');
    });

    test('handles unknown symbols using default news gracefully', async () => {
      const result = await analyzeFinancialNews('UNKNOWN');
      expect(result.articles).toBeDefined();
      expect(result.articles.length).toBe(2);
      expect(result.score).toBe(0); // Default news doesn't contain matching sentiment trigger words
      expect(result.sentiment).toBe('Neutral');
    });

    test('handles empty or null symbols gracefully', async () => {
      const result = await analyzeFinancialNews(null);
      expect(result.sentiment).toBe('Neutral');
      expect(result.score).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Social Sentiment Tests
  // ---------------------------------------------------------------------------
  describe('analyzeSocialSentiment', () => {
    test('measures social sentiment and mention volume for TSLA', async () => {
      const result = await analyzeSocialSentiment('TSLA');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('mentionVolume');
      expect(result.mentionVolume).toBe(4);
      expect(typeof result.score).toBe('number');
    });

    test('handles default social feeds for unknown symbols', async () => {
      const result = await analyzeSocialSentiment('XYZ');
      expect(result.mentionVolume).toBe(2);
      // Default posts: "Macro trends look uncertain, holding cash for now."
      // "undervalued" is in post 2 (positive) -> score is positive.
      expect(result.score).toBeGreaterThan(0);
      expect(result.sentiment).toBe('Positive');
    });
  });

  // ---------------------------------------------------------------------------
  // Major Events Tests
  // ---------------------------------------------------------------------------
  describe('analyzeMajorEvents', () => {
    test('returns major events and alerts high impact for TSLA', async () => {
      const result = await analyzeMajorEvents('TSLA');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('hasHighImpactEvent');
      expect(result.events.length).toBe(2);
      // TSLA contains "Annual Robotaxi Unveil Event" with impact "High Positive"
      expect(result.hasHighImpactEvent).toBe(true);
    });

    test('returns major events and alerts high impact for AAPL', async () => {
      const result = await analyzeMajorEvents('AAPL');
      expect(result.events.length).toBe(2);
      // AAPL contains "Antitrust Litigation Trial" with impact "High Negative"
      expect(result.hasHighImpactEvent).toBe(true);
    });

    test('handles default events for unknown symbols with no high-impact alerts', async () => {
      const result = await analyzeMajorEvents('MSFT');
      expect(result.events.length).toBe(1);
      expect(result.hasHighImpactEvent).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------
  describe('performNewsAnalysis (Integration)', () => {
    test('parallel-resolves all sentiment facets for a stock', async () => {
      const result = await performNewsAnalysis('AAPL');
      expect(result).toHaveProperty('financialNews');
      expect(result).toHaveProperty('socialSentiment');
      expect(result).toHaveProperty('majorEvents');
      
      expect(result.financialNews.articles.length).toBe(3);
      expect(result.socialSentiment.mentionVolume).toBe(3);
      expect(result.majorEvents.hasHighImpactEvent).toBe(true);
    });
  });
});
