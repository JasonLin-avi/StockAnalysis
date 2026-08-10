import { getLatestPricesAndBacktest } from '@/services/analysis.service';

describe('PopularStocks Name Fallback Integration', () => {
  test('getLatestPricesAndBacktest 針對台股應優先從 stock-map 解析中文名稱而非使用 Yahoo Finance 的 2330.TW', async () => {
    const results = await getLatestPricesAndBacktest(['2330.TW']);
    expect(results['2330.TW']).toBeDefined();
    expect(results['2330.TW'].name).toBe('台積電');
  });
});
