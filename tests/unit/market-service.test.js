/**
 * @fileoverview Unit tests for Market Service
 * Verifies market indices fetching, formatting, and overview metrics caching.
 */

import {
  getMarketIndices,
  getMarketOverviewMetricsService,
  getMarketFundsFlowService,
  getMarketFundsFlowPrompt
} from '../../src/services/market.service';
import { fetchStockData } from '../../src/external/data-fetcher/yahoo-finance';
import { connectToDatabase } from '../../src/external/database/connection';
import { calculateMarketOverviewMetrics } from '../../src/lib/finnhub/marketMetrics';
import {
  getMarketOverviewMetrics,
  saveMarketOverviewMetrics,
  getMarketFundsFlow,
  saveMarketFundsFlow
} from '../../src/external/database/queries';
import { callGemini } from '../../src/external/gemini/client';

jest.mock('../../src/external/data-fetcher/yahoo-finance');
jest.mock('../../src/external/database/connection');
jest.mock('../../src/lib/finnhub/marketMetrics');
jest.mock('../../src/external/database/queries');
jest.mock('../../src/external/gemini/client');

describe('Market Service', () => {
  const mockDb = {};

  beforeEach(() => {
    jest.clearAllMocks();
    connectToDatabase.mockResolvedValue(mockDb);
  });

  describe('getMarketIndices', () => {
    it('fetches and formats TWII and GSPC indices correctly', async () => {
      fetchStockData.mockImplementation(async (symbol) => {
        if (symbol === '^TWII') return { price: 23000.5, changePercent: 1.25 };
        if (symbol === '^GSPC') return { price: 5500.25, changePercent: -0.45 };
        return { price: 0, changePercent: 0 };
      });

      const result = await getMarketIndices();

      expect(result.twii.price).toBe(23000.5);
      expect(result.twii.displayPrice).toBe('23,000.50');
      expect(result.twii.displayChange).toBe('▲ +1.25%');
      expect(result.twii.color).toBe('text-emerald-400');

      expect(result.gspc.price).toBe(5500.25);
      expect(result.gspc.displayPrice).toBe('5,500.25');
      expect(result.gspc.displayChange).toBe('▼ -0.45%');
      expect(result.gspc.color).toBe('text-rose-400');
    });

    it('falls back gracefully to static values when fetch fails', async () => {
      fetchStockData.mockRejectedValue(new Error('Network error'));

      const result = await getMarketIndices();

      expect(result.twii.price).toBe(23450.80);
      expect(result.gspc.price).toBe(5632.10);
    });
  });

  describe('getMarketOverviewMetricsService', () => {
    it('returns cached metrics when SQLite cache exists', async () => {
      getMarketOverviewMetrics.mockResolvedValue({
        fear_greed_score: 80,
        fear_greed_text: '極度貪婪',
        vix_value: 14.2,
        vix_text: '低風險區',
        win_rate: 72.5
      });

      const result = await getMarketOverviewMetricsService({ db: mockDb });

      expect(result.cached).toBe(true);
      expect(result.fearGreed.score).toBe(80);
      expect(result.vix.value).toBe(14.2);
      expect(result.winRate).toBe(72.5);
      expect(calculateMarketOverviewMetrics).not.toHaveBeenCalled();
    });

    it('calculates fresh metrics and saves to DB cache on cache miss', async () => {
      getMarketOverviewMetrics.mockResolvedValue(null);
      calculateMarketOverviewMetrics.mockResolvedValue({
        fear_greed_score: 65,
        fear_greed_text: '貪婪',
        vix_value: 16.5,
        vix_text: '中等風險',
        win_rate: 61.2
      });

      const result = await getMarketOverviewMetricsService({ db: mockDb });

      expect(result.cached).toBe(false);
      expect(result.fearGreed.score).toBe(65);
      expect(saveMarketOverviewMetrics).toHaveBeenCalledWith(mockDb, {
        fear_greed_score: 65,
        fear_greed_text: '貪婪',
        vix_value: 16.5,
        vix_text: '中等風險',
        win_rate: 61.2
      });
    });

    it('returns fallback values on unexpected exception', async () => {
      getMarketOverviewMetrics.mockRejectedValue(new Error('DB crashed'));

      const result = await getMarketOverviewMetricsService({ db: mockDb });

      expect(result.cached).toBe(false);
      expect(result.fearGreed.score).toBe(74);
      expect(result.vix.value).toBe(15.42);
      expect(result.winRate).toBe(68.4);
    });
  });

  describe('getMarketFundsFlowService', () => {
    it('returns cached funds flow when matching prompt exists in DB', async () => {
      const prompt = getMarketFundsFlowPrompt('TW', '2026-11-09');
      getMarketFundsFlow.mockResolvedValue({
        market: 'TW',
        date: '2026-11-09',
        prompt,
        content: '## 資金流向分析快取'
      });

      const result = await getMarketFundsFlowService('TW', '2026-11-09', { db: mockDb });

      expect(result.content).toBe('## 資金流向分析快取');
      expect(callGemini).not.toHaveBeenCalled();
    });

    it('calls Gemini and saves to DB when not cached', async () => {
      getMarketFundsFlow.mockResolvedValue(null);
      callGemini.mockResolvedValue('## 新鮮資金流向分析');

      const result = await getMarketFundsFlowService('TW', '2026-11-09', { db: mockDb });

      expect(result.content).toBe('## 新鮮資金流向分析');
      expect(callGemini).toHaveBeenCalled();
      expect(saveMarketFundsFlow).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          market: 'TW',
          date: '2026-11-09',
          content: '## 新鮮資金流向分析'
        })
      );
    });
  });
});
