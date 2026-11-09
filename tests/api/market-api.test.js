/**
 * @fileoverview API route tests for market endpoints.
 * Verifies HTTP GET responses and delegation to market.service.
 */

import { GET as getMarket } from '../../src/app/api/market/route';
import { GET as getOverviewMetrics } from '../../src/app/api/market/overview-metrics/route';
import {
  getMarketIndices,
  getMarketOverviewMetricsService
} from '../../src/services/market.service';

jest.mock('../../src/services/market.service');

describe('Market API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/market', () => {
    it('returns 200 with market indices payload from service', async () => {
      getMarketIndices.mockResolvedValue({
        twii: { price: 23000, displayPrice: '23,000.00', displayChange: '▲ +1.00%', color: 'text-emerald-400' },
        gspc: { price: 5500, displayPrice: '5,500.00', displayChange: '▼ -0.50%', color: 'text-rose-400' }
      });

      const response = await getMarket();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.twii.price).toBe(23000);
      expect(data.gspc.price).toBe(5500);
      expect(getMarketIndices).toHaveBeenCalledTimes(1);
    });

    it('returns 500 when service throws an unexpected exception', async () => {
      getMarketIndices.mockRejectedValue(new Error('Market service failed'));

      const response = await getMarket();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Market service failed');
    });
  });

  describe('GET /api/market/overview-metrics', () => {
    it('returns 200 with fearGreed, vix, and winRate payload from service', async () => {
      getMarketOverviewMetricsService.mockResolvedValue({
        fearGreed: { score: 75, text: '極度貪婪' },
        vix: { value: 15.0, text: '低風險區' },
        winRate: 68.4,
        cached: true
      });

      const response = await getOverviewMetrics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fearGreed.score).toBe(75);
      expect(data.vix.value).toBe(15.0);
      expect(data.winRate).toBe(68.4);
      expect(data.cached).toBe(true);
      expect(getMarketOverviewMetricsService).toHaveBeenCalledTimes(1);
    });
  });
});
