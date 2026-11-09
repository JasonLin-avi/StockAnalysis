/**
 * @fileoverview Unit tests for Fundamental and Financial Trend Services.
 */

import {
  getFundamentalAnalysis,
  getFundamentalPrompt
} from '../../src/services/fundamental.service';
import {
  getFinancialTrendAnalysis,
  getFinancialTrendPrompt
} from '../../src/services/financial-trend.service';
import { connectToDatabase } from '../../src/external/database/connection';
import { getRecentPromptAnalysis, savePromptAnalysis } from '../../src/external/database/queries';
import { callGemini } from '../../src/external/gemini/client';

jest.mock('../../src/external/database/connection');
jest.mock('../../src/external/database/queries');
jest.mock('../../src/external/gemini/client');
jest.mock('../../src/lib/stock-map', () => ({
  getCompanyNameByCode: jest.fn().mockResolvedValue({ success: true, name: '台積電' }),
  formatStockName: jest.fn((name, symbol) => `${name} (${symbol})`)
}));

describe('Fundamental and Financial Trend Services', () => {
  const mockDb = {};

  beforeEach(() => {
    jest.clearAllMocks();
    connectToDatabase.mockResolvedValue(mockDb);
  });

  describe('Fundamental Service', () => {
    it('formats prompt correctly', () => {
      const prompt = getFundamentalPrompt('台積電 (2330.TW)');
      expect(prompt).toContain('華爾街資深股票分析師');
      expect(prompt).toContain('台積電 (2330.TW)');
    });

    it('returns cached analysis on cache hit', async () => {
      getRecentPromptAnalysis.mockResolvedValue('## Cached Fundamental');

      const result = await getFundamentalAnalysis('2330.TW', { db: mockDb });

      expect(result.markdown).toBe('## Cached Fundamental');
      expect(callGemini).not.toHaveBeenCalled();
    });

    it('invokes Gemini and saves to DB cache on miss', async () => {
      getRecentPromptAnalysis.mockResolvedValue(null);
      callGemini.mockResolvedValue('## Gemini Generated Fundamental');

      const result = await getFundamentalAnalysis('2330.TW', { db: mockDb });

      expect(result.markdown).toBe('## Gemini Generated Fundamental');
      expect(callGemini).toHaveBeenCalled();
      expect(savePromptAnalysis).toHaveBeenCalledWith(
        mockDb,
        '2330.TW',
        'fundamental',
        expect.any(String),
        '## Gemini Generated Fundamental'
      );
    });

    it('throws error when Gemini content is empty', async () => {
      getRecentPromptAnalysis.mockResolvedValue(null);
      callGemini.mockResolvedValue('');

      await expect(getFundamentalAnalysis('2330.TW', { db: mockDb }))
        .rejects.toThrow('AI 基本面分析生成內容為空');
    });
  });

  describe('Financial Trend Service', () => {
    it('formats prompt correctly', () => {
      const prompt = getFinancialTrendPrompt('台積電 (2330.TW)');
      expect(prompt).toContain('過去 5 年的財務數據');
      expect(prompt).toContain('台積電 (2330.TW)');
    });

    it('returns cached analysis on cache hit', async () => {
      getRecentPromptAnalysis.mockResolvedValue('## Cached Financial Trend');

      const result = await getFinancialTrendAnalysis('2330.TW', { db: mockDb });

      expect(result.markdown).toBe('## Cached Financial Trend');
      expect(callGemini).not.toHaveBeenCalled();
    });

    it('invokes Gemini and saves to DB cache on miss', async () => {
      getRecentPromptAnalysis.mockResolvedValue(null);
      callGemini.mockResolvedValue('## Gemini Generated Financial Trend');

      const result = await getFinancialTrendAnalysis('2330.TW', { db: mockDb });

      expect(result.markdown).toBe('## Gemini Generated Financial Trend');
      expect(callGemini).toHaveBeenCalled();
      expect(savePromptAnalysis).toHaveBeenCalledWith(
        mockDb,
        '2330.TW',
        'financial_trend',
        expect.any(String),
        '## Gemini Generated Financial Trend'
      );
    });

    it('throws error when Gemini content is empty', async () => {
      getRecentPromptAnalysis.mockResolvedValue(null);
      callGemini.mockResolvedValue('');

      await expect(getFinancialTrendAnalysis('2330.TW', { db: mockDb }))
        .rejects.toThrow('AI 財務趨勢分析生成內容為空');
    });
  });
});
