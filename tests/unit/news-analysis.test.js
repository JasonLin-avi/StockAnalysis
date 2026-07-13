/**
 * Unit tests for the News and Sentiment Analysis Module.
 * Validates Finnhub API integration, null-safe score handling (Option C),
 * and graceful degradation when the API is unavailable.
 *
 * Why we mock global fetch here:
 * - Unit tests must not make real network calls, as they introduce flakiness and API rate limits.
 * - Mocking fetch at the global level allows us to simulate both successful responses and
 *   failures (401, network error) without modifying production code.
 */

const {
  performNewsAnalysis,
  analyzeFinancialNews,
  analyzeSocialSentiment,
  analyzeMajorEvents
} = require('../../src/lib/news-analysis/index');

// Store original fetch and env so we can restore them after each test.
const originalFetch = global.fetch;
const originalEnv = process.env.FINNHUB_API_KEY;

beforeEach(() => {
  process.env.FINNHUB_API_KEY = 'test-api-key';
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env.FINNHUB_API_KEY = originalEnv;
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Financial News Analysis Tests
// ---------------------------------------------------------------------------
describe('News and Sentiment Analysis Engine', () => {
  describe('analyzeFinancialNews', () => {
    test('parses Finnhub company-news response and computes sentiment', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ([
          { headline: 'Apple delivers record quarterly revenue beating estimates', datetime: 1720000000, url: 'https://example.com/1' },
          { headline: 'Apple faces antitrust investigation over App Store policies', datetime: 1719900000, url: 'https://example.com/2' },
          { headline: 'Analysts upgrade Apple stock following strong iPhone upgrade cycle', datetime: 1719800000, url: 'https://example.com/3' }
        ])
      });

      const result = await analyzeFinancialNews('AAPL');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('articles');
      expect(result.articles.length).toBe(3);
      // Mix of positive ("record", "beat", "upgrade") and negative ("investigation") → net positive
      expect(typeof result.score).toBe('number');
      expect(['Positive', 'Neutral']).toContain(result.sentiment);
    });

    test('returns null score when API responds with non-ok status (Option C)', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

      const result = await analyzeFinancialNews('AAPL');
      // Why null not 0: a 401 means no data arrived; counting it as neutral would be misleading.
      expect(result.score).toBeNull();
      expect(result.sentiment).toBe('N/A');
      expect(result.articles).toHaveLength(0);
    });

    test('returns null score when API returns empty array', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ([]) });

      const result = await analyzeFinancialNews('UNKNOWN');
      expect(result.score).toBeNull();
      expect(result.sentiment).toBe('N/A');
    });

    test('returns null score when FINNHUB_API_KEY is absent', async () => {
      delete process.env.FINNHUB_API_KEY;
      const result = await analyzeFinancialNews('TSLA');
      expect(result.score).toBeNull();
      expect(result.sentiment).toBe('N/A');
    });

    test('returns null score on fetch network failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

      const result = await analyzeFinancialNews('TSLA');
      expect(result.score).toBeNull();
      expect(result.sentiment).toBe('N/A');
    });
  });

  // ---------------------------------------------------------------------------
  // Social Sentiment Tests
  // ---------------------------------------------------------------------------
  describe('analyzeSocialSentiment', () => {
    test('parses Finnhub social-sentiment response and computes weighted score', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          reddit: [
            { positiveMention: 50, negativeMention: 10, score: 0.6 },
            { positiveMention: 30, negativeMention: 20, score: 0.4 }
          ],
          twitter: [
            { positiveMention: 20, negativeMention: 40, score: -0.3 }
          ]
        })
      });

      const result = await analyzeSocialSentiment('TSLA');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('mentionVolume');
      expect(typeof result.score).toBe('number');
      expect(result.mentionVolume).toBeGreaterThan(0);
    });

    test('returns null score when API returns empty social data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ reddit: [], twitter: [] })
      });

      const result = await analyzeSocialSentiment('XYZ');
      expect(result.score).toBeNull();
      expect(result.sentiment).toBe('N/A');
      expect(result.mentionVolume).toBe(0);
    });

    test('returns null score when API fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });

      const result = await analyzeSocialSentiment('MSFT');
      expect(result.score).toBeNull();
      expect(result.sentiment).toBe('N/A');
    });

    test('returns null score when API key is absent', async () => {
      delete process.env.FINNHUB_API_KEY;
      const result = await analyzeSocialSentiment('AAPL');
      expect(result.score).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Major Events Tests
  // ---------------------------------------------------------------------------
  describe('analyzeMajorEvents', () => {
    test('parses Finnhub earnings calendar and classifies high-impact events', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          earningsCalendar: [
            { date: '2026-07-31', symbol: 'AAPL', epsEstimate: 1.43, epsActual: 1.60, revenueEstimate: 94500000000 },
            { date: '2026-10-30', symbol: 'AAPL', epsEstimate: 1.55, epsActual: null, revenueEstimate: 97000000000 }
          ]
        })
      });

      const result = await analyzeMajorEvents('AAPL');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('hasHighImpactEvent');
      expect(result.events.length).toBe(2);
      // epsActual (1.60) > epsEstimate (1.43) by > 0.1 → High Positive
      expect(result.hasHighImpactEvent).toBe(true);
      expect(result.events[0].impact).toBe('High Positive');
    });

    test('returns empty events when API returns no earnings data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ earningsCalendar: [] })
      });

      const result = await analyzeMajorEvents('MSFT');
      expect(result.events).toHaveLength(0);
      expect(result.hasHighImpactEvent).toBe(false);
    });

    test('returns empty events when API fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });

      const result = await analyzeMajorEvents('XYZ');
      expect(result.events).toHaveLength(0);
      expect(result.hasHighImpactEvent).toBe(false);
    });

    test('returns empty events when API key is absent', async () => {
      delete process.env.FINNHUB_API_KEY;
      const result = await analyzeMajorEvents('TSLA');
      expect(result.events).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------
  describe('performNewsAnalysis (Integration)', () => {
    test('parallel-resolves all sentiment facets and exposes correct schema', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          // financial news
          ok: true,
          json: async () => ([{ headline: 'Strong revenue growth beats estimates', datetime: 1720000000, url: 'https://example.com' }])
        })
        .mockResolvedValueOnce({
          // social sentiment
          ok: true,
          json: async () => ({ reddit: [{ positiveMention: 10, negativeMention: 2, score: 0.5 }], twitter: [] })
        })
        .mockResolvedValueOnce({
          // major events
          ok: true,
          json: async () => ({ earningsCalendar: [{ date: '2026-07-31', epsEstimate: 1.43, epsActual: null }] })
        });

      const result = await performNewsAnalysis('AAPL');
      expect(result).toHaveProperty('financialNews');
      expect(result).toHaveProperty('socialSentiment');
      expect(result).toHaveProperty('majorEvents');

      expect(result.financialNews.articles.length).toBe(1);
      expect(result.socialSentiment.mentionVolume).toBeGreaterThan(0);
      expect(result.majorEvents.events.length).toBe(1);
    });
  });
});
