/**
 * @fileoverview Unit tests for the Technical AI API route.
 * Tests parameter validation, SQLite caching, price history threshold fallback,
 * and Gemini LLM call with prompt analysis caching.
 */

import { GET } from '../../src/app/api/stock/[symbol]/technical-ai/route';
import { connectToDatabase } from '../../src/external/database/connection';
import {
  saveStock,
  getHistoricalPricesFromDB,
  getPromptAnalysis,
  savePromptAnalysis,
  getMaxPriceDate
} from '../../src/external/database/queries';
import { callGemini } from '../../src/external/gemini/client';

jest.mock('../../src/external/database/connection');
jest.mock('../../src/external/database/queries');
jest.mock('../../src/external/gemini/client');
jest.mock('../../src/services/data-sync.service', () => ({
  syncStockPrices: jest.fn().mockResolvedValue(true)
}));

describe('GET /api/stock/[symbol]/technical-ai', () => {
  const mockDb = {};

  beforeEach(() => {
    jest.clearAllMocks();
    connectToDatabase.mockResolvedValue(mockDb);
    getMaxPriceDate.mockResolvedValue('2026-08-07');
  });

  test('returns 400 if symbol parameter is missing', async () => {
    const request = new Request('http://localhost/api/stock//technical-ai');
    const response = await GET(request, { params: {} });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Symbol parameter is required');
  });

  test('returns cached markdown and days when SQLite cache hits using DB max_date', async () => {
    getPromptAnalysis.mockResolvedValue('## Cached AI Analysis');
    saveStock.mockResolvedValue(1);

    const request = new Request('http://localhost/api/stock/AAPL/technical-ai');
    const response = await GET(request, { params: { symbol: 'AAPL' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toBe('## Cached AI Analysis');
    expect(json.days).toBe(30);
    expect(getPromptAnalysis).toHaveBeenCalledWith(
      mockDb,
      'AAPL_technical_ai_30',
      'technical',
      '2026-08-07'
    );
    expect(callGemini).not.toHaveBeenCalled();
  });

  test('returns fallback message and days when historical prices < 60 days', async () => {
    getPromptAnalysis.mockResolvedValue(null);
    saveStock.mockResolvedValue(1);
    getHistoricalPricesFromDB.mockResolvedValue(Array.from({ length: 30 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, '0')}`, open: 100, high: 105, low: 95, close: 102, volume: 10000
    })));

    const request = new Request('http://localhost/api/stock/SHORT/technical-ai');
    const response = await GET(request, { params: { symbol: 'SHORT' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toContain('歷史交易數據不足（少於 60 個交易日），無法計算完整長短線指標與生成 AI 深度技術解讀。');
    expect(json.days).toBe(30);
    expect(callGemini).not.toHaveBeenCalled();
  });

  test('fetches price data, generates time-series prompt, calls Gemini, and caches result with per-range cache key on cache miss using max_date', async () => {
    getPromptAnalysis.mockResolvedValue(null);
    saveStock.mockResolvedValue(1);
    getHistoricalPricesFromDB.mockResolvedValue(Array.from({ length: 70 }, (_, i) => ({
      date: `2026-05-${String((i % 30) + 1).padStart(2, '0')}`, open: 100 + i, high: 105 + i, low: 95 + i, close: 102 + i, volume: 50000
    })));

    callGemini.mockResolvedValue('## Fresh Gemini AI Analysis');

    const request = new Request('http://localhost/api/stock/AAPL/technical-ai');
    const response = await GET(request, { params: { symbol: 'AAPL' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toBe('## Fresh Gemini AI Analysis');
    expect(json.days).toBe(30);
    expect(callGemini).toHaveBeenCalledWith(
      expect.stringContaining('| 日期 | 收盤價 | 漲跌幅 | 成交量 | MA5 | MA20 | MA60 | RSI14 | MACD柱體 |'),
      expect.objectContaining({ tools: [{ googleSearch: {} }] })
    );
    expect(savePromptAnalysis).toHaveBeenCalledWith(
      mockDb,
      'AAPL_technical_ai_30',
      'technical',
      '2026-08-07',
      '## Fresh Gemini AI Analysis'
    );
  });

  test('handles custom days query parameter and clamps value between 5 and 120 using max_date', async () => {
    getPromptAnalysis.mockResolvedValue(null);
    saveStock.mockResolvedValue(1);
    getHistoricalPricesFromDB.mockResolvedValue(Array.from({ length: 130 }, (_, i) => ({
      date: `2026-05-${String((i % 30) + 1).padStart(2, '0')}`, open: 100 + i, high: 105 + i, low: 95 + i, close: 102 + i, volume: 50000
    })));

    callGemini.mockResolvedValue('## 15-Day Analysis');

    // Test ?days=15
    const request15 = new Request('http://localhost/api/stock/AAPL/technical-ai?days=15');
    const response15 = await GET(request15, { params: { symbol: 'AAPL' } });
    const json15 = await response15.json();

    expect(response15.status).toBe(200);
    expect(json15.days).toBe(15);
    expect(savePromptAnalysis).toHaveBeenCalledWith(
      mockDb,
      'AAPL_technical_ai_15',
      'technical',
      '2026-08-07',
      '## 15-Day Analysis'
    );

    // Test clamped upper bound ?days=200 -> 120
    const request200 = new Request('http://localhost/api/stock/AAPL/technical-ai?days=200');
    const response200 = await GET(request200, { params: { symbol: 'AAPL' } });
    const json200 = await response200.json();
    expect(json200.days).toBe(120);

    // Test clamped lower bound ?days=2 -> 5
    const request2 = new Request('http://localhost/api/stock/AAPL/technical-ai?days=2');
    const response2 = await GET(request2, { params: { symbol: 'AAPL' } });
    const json2 = await response2.json();
    expect(json2.days).toBe(5);
  });
});
