/**
 * @fileoverview Unit tests for the Technical AI API route.
 * Tests parameter validation, SQLite caching, price history threshold fallback,
 * and Gemini LLM call with prompt analysis caching.
 */

const { GET } = require('../../src/app/api/stock/[symbol]/technical-ai/route');
const { connectToDatabase } = require('../../src/external/database/connection');
const queries = require('../../src/external/database/queries');
const { callGemini } = require('../../src/lib/gemini/client');

jest.mock('../../src/external/database/connection');
jest.mock('../../src/external/database/queries');
jest.mock('../../src/lib/gemini/client');
jest.mock('../../src/lib/data-fetcher', () => ({
  syncStockPricesIncremental: jest.fn().mockResolvedValue(true)
}));

describe('GET /api/stock/[symbol]/technical-ai', () => {
  const mockDb = {};

  beforeEach(() => {
    jest.clearAllMocks();
    connectToDatabase.mockResolvedValue(mockDb);
  });

  test('returns 400 if symbol parameter is missing', async () => {
    const request = new Request('http://localhost/api/stock//technical-ai');
    const response = await GET(request, { params: {} });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Symbol parameter is required');
  });

  test('returns cached markdown when SQLite cache hits', async () => {
    queries.getPromptAnalysis.mockResolvedValue('## Cached AI Analysis');

    const request = new Request('http://localhost/api/stock/AAPL/technical-ai');
    const response = await GET(request, { params: { symbol: 'AAPL' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toBe('## Cached AI Analysis');
    expect(callGemini).not.toHaveBeenCalled();
  });

  test('returns fallback message when historical prices < 60 days', async () => {
    queries.getPromptAnalysis.mockResolvedValue(null);
    queries.saveStock = jest.fn().mockResolvedValue(1);
    queries.getHistoricalPricesFromDB.mockResolvedValue(Array.from({ length: 30 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, '0')}`, open: 100, high: 105, low: 95, close: 102, volume: 10000
    })));

    const request = new Request('http://localhost/api/stock/SHORT/technical-ai');
    const response = await GET(request, { params: { symbol: 'SHORT' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toContain('歷史交易數據不足（少於 60 個交易日），無法計算完整長短線指標與生成 AI 深度技術解讀。');
    expect(callGemini).not.toHaveBeenCalled();
  });

  test('fetches price data, generates prompt, calls Gemini, and caches result on cache miss', async () => {
    queries.getPromptAnalysis.mockResolvedValue(null);
    queries.saveStock = jest.fn().mockResolvedValue(1);
    queries.getHistoricalPricesFromDB.mockResolvedValue(Array.from({ length: 70 }, (_, i) => ({
      date: `2026-05-${String((i % 30) + 1).padStart(2, '0')}`, open: 100 + i, high: 105 + i, low: 95 + i, close: 102 + i, volume: 50000
    })));

    callGemini.mockResolvedValue('## Fresh Gemini AI Analysis');

    const request = new Request('http://localhost/api/stock/AAPL/technical-ai');
    const response = await GET(request, { params: { symbol: 'AAPL' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toBe('## Fresh Gemini AI Analysis');
    expect(callGemini).toHaveBeenCalledWith(
      expect.stringContaining('你是一位擁有 15 年經驗的資深量化交易員與資產配置專家'),
      expect.objectContaining({ tools: [{ googleSearch: {} }] })
    );
    expect(queries.savePromptAnalysis).toHaveBeenCalledWith(
      mockDb,
      'AAPL',
      'technical',
      expect.any(String),
      '## Fresh Gemini AI Analysis'
    );
  });
});
