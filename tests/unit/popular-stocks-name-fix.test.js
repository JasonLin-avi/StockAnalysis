/**
 * @fileoverview Unit test for Popular Stocks Chinese name resolution fallback.
 * Why mocks are used:
 * - Ensures 100% offline, hermetic, and sub-second execution without touching Yahoo Finance or TWSE network endpoints.
 * - Live network variant is preserved in tests/integration/external/popular-stocks-live.test.js.
 */

import { getLatestPricesAndBacktest } from '@/services/analysis.service';

// Mock Yahoo Finance returning English name for Taiwan stock
jest.mock('@/external/data-fetcher/yahoo-finance', () => ({
  fetchStockData: jest.fn().mockImplementation(async (symbol) => ({
    symbol,
    name: symbol === '2330.TW' ? 'Taiwan Semiconductor Manufacturing Company Limited' : symbol,
    price: 950.0,
    changePercent: 1.5
  })),
  fetchHistoricalData: jest.fn().mockResolvedValue({
    symbol: '2330.TW',
    data: []
  })
}));

// Mock stock-map service returning Chinese name
jest.mock('@/lib/stock-map', () => ({
  getCompanyNameByCode: jest.fn().mockImplementation(async (symbol) => {
    if (symbol.includes('2330')) {
      return {
        success: true,
        code: '2330',
        name: '台積電',
        market: '上市'
      };
    }
    return { success: false };
  })
}));

describe('PopularStocks Chinese Name Fallback Unit Test', () => {
  test('getLatestPricesAndBacktest 針對台股應優先從 stock-map 解析中文名稱而非使用 Yahoo Finance 的 English Name', async () => {
    const results = await getLatestPricesAndBacktest(['2330.TW']);
    expect(results['2330.TW']).toBeDefined();
    expect(results['2330.TW'].name).toBe('台積電');
    expect(results['2330.TW'].market).toBe('上市');
  });
});
