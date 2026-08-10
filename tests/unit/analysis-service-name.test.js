import { getLatestPricesAndBacktest } from '@/services/analysis.service';

// Why: Mock external Yahoo Finance API calls to prevent network dependencies in unit tests.
jest.mock('@/external/data-fetcher/yahoo-finance', () => ({
  fetchStockData: jest.fn().mockImplementation(async (symbol) => ({
    symbol,
    name: symbol === 'NVDA' ? 'NVIDIA Corporation' : 'TSMC',
    price: 100.0,
    changePercent: 1.5
  })),
  fetchHistoricalData: jest.fn().mockResolvedValue({
    symbol: 'test',
    data: []
  })
}));

// Why: Mock stock-map service lookup to verify analysis.service enrichment without live TWSE API calls.
jest.mock('@/lib/stock-map', () => ({
  getCompanyNameByCode: jest.fn().mockImplementation(async (symbol) => {
    if (symbol === '2330.TW' || symbol === '2330') {
      return {
        success: true,
        code: '2330',
        rawSymbol: symbol,
        name: '台積電',
        market: '上市'
      };
    }
    return {
      success: false,
      message: 'Not found'
    };
  })
}));

describe('Analysis Service Stock Name Enrichment', () => {
  test('getLatestPricesAndBacktest 回傳資料中包含公司名稱 name 與市場 market 欄位', async () => {
    const results = await getLatestPricesAndBacktest(['2330.TW', 'NVDA']);

    expect(results['2330.TW']).toBeDefined();
    expect(results['2330.TW'].name).toBe('台積電');
    expect(results['2330.TW'].market).toBe('上市');

    expect(results['NVDA']).toBeDefined();
    expect(results['NVDA'].name).toBe('NVDA');
    expect(results['NVDA'].market).toBe('美股');
  });
});
