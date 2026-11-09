/**
 * @fileoverview Unit tests for Technical AI Service
 * Verifies prompt formulation, cache lookup, Gemini delegation,
 * and 60-day historical data threshold enforcement.
 */

import {
  getTechnicalAIAnalysis,
  getTechnicalAIPrompt
} from '../../src/services/technical-ai.service';
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

describe('Technical AI Service', () => {
  const mockDb = {};

  beforeEach(() => {
    jest.clearAllMocks();
    connectToDatabase.mockResolvedValue(mockDb);
    getMaxPriceDate.mockResolvedValue('2026-11-09');
  });

  describe('getTechnicalAIPrompt', () => {
    it('generates markdown prompt containing senior quantitative trader persona', () => {
      const prompt = getTechnicalAIPrompt('台積電 (2330.TW)', '| Date | Close |\n| --- | --- |', 30);
      expect(prompt).toContain('15 年經驗的資深量化交易員');
      expect(prompt).toContain('台積電 (2330.TW)');
      expect(prompt).toContain('近 30 個交易日');
    });
  });

  describe('getTechnicalAIAnalysis', () => {
    it('returns cached result on SQLite cache hit without calling Gemini', async () => {
      getPromptAnalysis.mockResolvedValue('## Cached Technical Analysis');
      saveStock.mockResolvedValue(1);

      const result = await getTechnicalAIAnalysis('2330.TW', 30, { db: mockDb });

      expect(result.markdown).toBe('## Cached Technical Analysis');
      expect(result.days).toBe(30);
      expect(getPromptAnalysis).toHaveBeenCalledWith(
        mockDb,
        '2330.TW_technical_ai_30',
        'technical',
        '2026-11-09'
      );
      expect(callGemini).not.toHaveBeenCalled();
    });

    it('returns warning markdown when historical prices are fewer than 60 days', async () => {
      getPromptAnalysis.mockResolvedValue(null);
      saveStock.mockResolvedValue(1);
      getHistoricalPricesFromDB.mockResolvedValue(
        Array.from({ length: 45 }, (_, i) => ({
          date: `2026-09-${String(i + 1).padStart(2, '0')}`,
          open: 100, high: 105, low: 95, close: 102, volume: 1000
        }))
      );

      const result = await getTechnicalAIAnalysis('SHORT', 30, { db: mockDb });

      expect(result.markdown).toContain('歷史交易數據不足（少於 60 個交易日）');
      expect(callGemini).not.toHaveBeenCalled();
    });

    it('generates LLM analysis, calls Gemini, and saves to cache on cache miss', async () => {
      getPromptAnalysis.mockResolvedValue(null);
      saveStock.mockResolvedValue(1);
      getHistoricalPricesFromDB.mockResolvedValue(
        Array.from({ length: 70 }, (_, i) => ({
          date: `2026-08-${String((i % 30) + 1).padStart(2, '0')}`,
          open: 100 + i, high: 105 + i, low: 95 + i, close: 102 + i, volume: 10000
        }))
      );
      callGemini.mockResolvedValue('## Fresh Technical Analysis from Gemini');

      const result = await getTechnicalAIAnalysis('2330.TW', 30, { db: mockDb });

      expect(result.markdown).toBe('## Fresh Technical Analysis from Gemini');
      expect(callGemini).toHaveBeenCalledWith(
        expect.stringContaining('2330.TW'),
        expect.objectContaining({ tools: [{ googleSearch: {} }] })
      );
      expect(savePromptAnalysis).toHaveBeenCalledWith(
        mockDb,
        '2330.TW_technical_ai_30',
        'technical',
        '2026-11-09',
        '## Fresh Technical Analysis from Gemini'
      );
    });

    it('throws error when Gemini returns empty or whitespace markdown', async () => {
      getPromptAnalysis.mockResolvedValue(null);
      saveStock.mockResolvedValue(1);
      getHistoricalPricesFromDB.mockResolvedValue(
        Array.from({ length: 70 }, (_, i) => ({
          date: `2026-08-${String((i % 30) + 1).padStart(2, '0')}`,
          open: 100, high: 105, low: 95, close: 100, volume: 1000
        }))
      );
      callGemini.mockResolvedValue('   ');

      await expect(getTechnicalAIAnalysis('2330.TW', 30, { db: mockDb }))
        .rejects.toThrow('AI 技術面分析生成內容為空');
    });
  });
});
