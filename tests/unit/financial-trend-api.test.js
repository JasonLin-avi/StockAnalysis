/**
 * @fileoverview Unit tests for Financial Trend API route.
 * Tests parameter validation, cache fetching, Gemini generation,
 * and empty content validation guards.
 */

import { GET } from '../../src/app/api/financial-trend/route';
import { connectToDatabase } from '../../src/external/database/connection';
import { getRecentPromptAnalysis, savePromptAnalysis } from '../../src/external/database/queries';
import { callGemini } from '../../src/external/gemini/client';

jest.mock('../../src/external/database/connection');
jest.mock('../../src/external/database/queries');
jest.mock('../../src/external/gemini/client');

describe('GET /api/financial-trend', () => {
  const mockDb = {};

  beforeEach(() => {
    jest.clearAllMocks();
    connectToDatabase.mockResolvedValue(mockDb);
  });

  test('returns 400 if symbol parameter is missing', async () => {
    const request = new Request('http://localhost/api/financial-trend');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Symbol parameter is required');
  });

  test('returns cached markdown when valid 7-day cache hits', async () => {
    getRecentPromptAnalysis.mockResolvedValue('## Cached Financial Trend');

    const request = new Request('http://localhost/api/financial-trend?symbol=2330.TW');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toBe('## Cached Financial Trend');
    expect(callGemini).not.toHaveBeenCalled();
    expect(savePromptAnalysis).not.toHaveBeenCalled();
  });

  test('calls Gemini and saves to cache when no valid cache exists', async () => {
    getRecentPromptAnalysis.mockResolvedValue(null);
    callGemini.mockResolvedValue('## Fresh Financial Trend Analysis');

    const request = new Request('http://localhost/api/financial-trend?symbol=2330.TW');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.markdown).toBe('## Fresh Financial Trend Analysis');
    expect(callGemini).toHaveBeenCalledWith(
      expect.stringContaining('2330.TW'),
      expect.objectContaining({ tools: [{ googleSearch: {} }] })
    );
    expect(savePromptAnalysis).toHaveBeenCalledWith(
      mockDb,
      '2330.TW',
      'financial_trend',
      expect.any(String),
      '## Fresh Financial Trend Analysis'
    );
  });

  test('returns 500 and does NOT save to DB when Gemini returns empty content', async () => {
    getRecentPromptAnalysis.mockResolvedValue(null);
    callGemini.mockResolvedValue('');

    const request = new Request('http://localhost/api/financial-trend?symbol=2330.TW');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toContain('生成內容為空');
    expect(savePromptAnalysis).not.toHaveBeenCalled();
  });
});
