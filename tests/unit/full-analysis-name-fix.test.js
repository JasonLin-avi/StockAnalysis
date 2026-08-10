import { performFullAnalysis } from '@/services/analysis.service';

// Mock Yahoo Finance API returning English long name for TW stock
jest.mock('@/external/data-fetcher/yahoo-finance', () => ({
  fetchStockData: jest.fn().mockResolvedValue({
    symbol: '2330.TW',
    name: 'Taiwan Semiconductor Manufacturing Company Limited',
    price: 950,
    changePercent: 1.5
  }),
  fetchHistoricalData: jest.fn().mockResolvedValue({
    symbol: '2330.TW',
    data: [{ date: '2026-08-10', open: 945, high: 955, low: 940, close: 950, volume: 10000 }]
  }),
  fetchFundamentalData: jest.fn().mockResolvedValue({})
}));

// Mock stock-map service returning Chinese name
jest.mock('@/lib/stock-map', () => ({
  getCompanyNameByCode: jest.fn().mockImplementation(async (symbol) => {
    if (symbol.includes('2330')) {
      return { success: true, name: '台積電', market: '上市' };
    }
    return { success: false };
  })
}));

describe('performFullAnalysis Chinese Stock Name Resolution', () => {
  test('returns Chinese stock name for 2330.TW instead of Yahoo Finance English longName', async () => {
    const result = await performFullAnalysis('2330.TW');
    expect(result.name).toBe('台積電');
  });
});
