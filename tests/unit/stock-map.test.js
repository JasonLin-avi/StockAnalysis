import {
  initializeStockMap,
  queryStockByCode,
  resetStockMap,
  getStockCount
} from '@/lib/stock-map';

describe('Stock Map Service (台股代碼對照服務)', () => {
  beforeEach(() => {
    resetStockMap();
  });

  const mockTwseData = [
    { Code: '2330', Name: '台積電' },
    { Code: '2603', Name: '長榮' }
  ];

  const mockTpexData = [
    { SecuritiesCompanyCode: '8454', CompanyName: '富邦媒' },
    { SecuritiesCompanyCode: '3293', CompanyName: '鈊象' }
  ];

  const createMockFetcher = (twseData = mockTwseData, tpexData = mockTpexData) => {
    return jest.fn().mockImplementation((url) => {
      if (url.includes('twse')) {
        return Promise.resolve({ json: () => Promise.resolve(twseData) });
      }
      if (url.includes('tpex')) {
        return Promise.resolve({ json: () => Promise.resolve(tpexData) });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  };

  test('正確初始化並加載上市與上櫃股票資料', async () => {
    const mockFetcher = createMockFetcher();

    await initializeStockMap({ fetcher: mockFetcher });

    expect(mockFetcher).toHaveBeenCalledTimes(2);
    expect(getStockCount()).toBe(4);
  });

  test('查詢存在的上市股票代碼 (2330)', async () => {
    const mockFetcher = createMockFetcher();

    const result = await queryStockByCode('2330', { fetcher: mockFetcher });

    expect(result).toEqual({
      success: true,
      code: '2330',
      name: '台積電',
      market: '上市'
    });
  });

  test('查詢存在的上櫃股票代碼 (數字與字串皆可傳入)', async () => {
    const mockFetcher = createMockFetcher();

    const resultStr = await queryStockByCode('8454', { fetcher: mockFetcher });
    const resultNum = await queryStockByCode(8454, { fetcher: mockFetcher });

    expect(resultStr).toEqual({
      success: true,
      code: '8454',
      name: '富邦媒',
      market: '上櫃'
    });
    expect(resultNum).toEqual({
      success: true,
      code: '8454',
      name: '富邦媒',
      market: '上櫃'
    });
  });

  test('第二次查詢時應直接從記憶體快取讀取，不重新發起請求', async () => {
    const mockFetcher = createMockFetcher();

    await queryStockByCode('2330', { fetcher: mockFetcher });
    expect(mockFetcher).toHaveBeenCalledTimes(2);

    // 第二次查詢
    const result = await queryStockByCode('2603', { fetcher: mockFetcher });

    expect(result).toEqual({
      success: true,
      code: '2603',
      name: '長榮',
      market: '上市'
    });
    // fetcher 次數維持為 2，代表沒有重新請求 API
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  test('查詢不存在或下市的股票代碼時回傳失敗訊息', async () => {
    const mockFetcher = createMockFetcher();

    const result = await queryStockByCode('9999', { fetcher: mockFetcher });

    expect(result.success).toBe(false);
    expect(result.message).toContain('找不到代碼為 9999 的股票');
  });

  test('處理無效輸入 (null 或 undefined)', async () => {
    const mockFetcher = createMockFetcher();

    const result = await queryStockByCode(null, { fetcher: mockFetcher });

    expect(result).toEqual({
      success: false,
      message: '無效的股票代碼'
    });
  });

  test('若 API 請求部分失敗或資料結構不齊全時，仍能維持運作', async () => {
    const mockFetcher = jest.fn().mockImplementation((url) => {
      if (url.includes('twse')) {
        return Promise.resolve({ json: () => Promise.resolve(mockTwseData) });
      }
      return Promise.reject(new Error('TPEx API down'));
    });

    const result = await queryStockByCode('2330', { fetcher: mockFetcher });

    expect(result.success).toBe(true);
    expect(getStockCount()).toBe(2);
  });
});
