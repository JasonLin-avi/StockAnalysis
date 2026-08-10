import { connectToDatabase } from '@/external/database/connection';
import {
  parseStockCode,
  syncStockMapToDB,
  getCompanyNameByCode,
  getCodeByCompanyName,
  resetStockMap
} from '@/lib/stock-map';
import { getCompanyNameFromDB } from '@/external/database/queries';

describe('Stock Map Service DB Read-Through Integration', () => {
  let db;

  const mockTwseData = [
    { Code: '2330', Name: '台積電' },
    { Code: '2603', Name: '長榮' }
  ];

  const mockTpexData = [
    { SecuritiesCompanyCode: '8454', CompanyName: '富邦媒' }
  ];

  const mockFetcher = jest.fn().mockImplementation((url) => {
    if (url.includes('twse')) return Promise.resolve({ json: () => Promise.resolve(mockTwseData) });
    if (url.includes('tpex')) return Promise.resolve({ json: () => Promise.resolve(mockTpexData) });
    return Promise.reject(new Error('Unknown URL'));
  });

  beforeEach(async () => {
    resetStockMap();
    db = await connectToDatabase(':memory:');
    mockFetcher.mockClear();
  });

  afterEach((done) => {
    if (db) {
      db.close(done);
    } else {
      done();
    }
  });

  describe('parseStockCode', () => {
    test('應正確去除 .TW / .TWO 後綴並推斷市場類型', () => {
      expect(parseStockCode('2330.TW')).toEqual({ code: '2330', inferredMarket: '上市' });
      expect(parseStockCode('8454.TWO')).toEqual({ code: '8454', inferredMarket: '上櫃' });
      expect(parseStockCode('2330')).toEqual({ code: '2330', inferredMarket: null });
      expect(parseStockCode(' 2603.tw ')).toEqual({ code: '2603', inferredMarket: '上市' });
      expect(parseStockCode(null)).toEqual({ code: '', inferredMarket: null });
      expect(parseStockCode(undefined)).toEqual({ code: '', inferredMarket: null });
    });
  });

  describe('getCompanyNameByCode', () => {
    test('傳入 2330.TW 時能正確去除後綴並解析市場名稱與寫入 DB 快取', async () => {
      const result = await getCompanyNameByCode('2330.TW', { db, fetcher: mockFetcher });

      expect(result.success).toBe(true);
      expect(result.code).toBe('2330');
      expect(result.rawSymbol).toBe('2330.TW');
      expect(result.name).toBe('台積電');
      expect(result.market).toBe('上市');
      expect(mockFetcher).toHaveBeenCalledTimes(2);

      // 驗證 DB 確實已存入資料
      const dbRow = await getCompanyNameFromDB(db, '2330');
      expect(dbRow).not.toBeNull();
      expect(dbRow.name).toBe('台積電');

      // 第二次呼叫，直接命中 DB，不發起網路請求
      const resultCached = await getCompanyNameByCode('2603', { db, fetcher: mockFetcher });
      expect(resultCached.success).toBe(true);
      expect(resultCached.name).toBe('長榮');
      expect(mockFetcher).toHaveBeenCalledTimes(2); // 維持 2 次
    });

    test('無效或不存在的股票代碼應早期退出 (無窮迴圈預防機制)', async () => {
      const result = await getCompanyNameByCode('9999', { db, fetcher: mockFetcher });

      expect(result.success).toBe(false);
      expect(result.message).toContain('找不到代碼為 9999 的股票');

      // 驗證 DB 中沒有寫入無效資料
      const dbRow = await getCompanyNameFromDB(db, '9999');
      expect(dbRow).toBeNull();
    });

    test('處理無效代碼 (null 或空字串)', async () => {
      const result = await getCompanyNameByCode(null, { db, fetcher: mockFetcher });
      expect(result.success).toBe(false);
      expect(result.message).toBe('無效的股票代碼');
    });
  });

  describe('getCodeByCompanyName', () => {
    test('能由公司名稱查出代號並附帶市場後綴 (DB miss -> API sync)', async () => {
      const res = await getCodeByCompanyName('富邦媒', { db, fetcher: mockFetcher });

      expect(res.success).toBe(true);
      expect(res.code).toBe('8454');
      expect(res.symbolWithSuffix).toBe('8454.TWO');
      expect(res.name).toBe('富邦媒');
      expect(res.market).toBe('上櫃');
      expect(mockFetcher).toHaveBeenCalledTimes(2);

      // 第二次查詢 DB hit
      const resCached = await getCodeByCompanyName('台積電', { db, fetcher: mockFetcher });
      expect(resCached.success).toBe(true);
      expect(resCached.code).toBe('2330');
      expect(resCached.symbolWithSuffix).toBe('2330.TW');
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    test('不存在的公司名稱應早期退出', async () => {
      const res = await getCodeByCompanyName('不存在的公司', { db, fetcher: mockFetcher });

      expect(res.success).toBe(false);
      expect(res.message).toContain('找不到名稱為 不存在的公司 的台股代碼');
    });

    test('處理無效公司名稱 (null 或空字串)', async () => {
      const res = await getCodeByCompanyName('', { db, fetcher: mockFetcher });
      expect(res.success).toBe(false);
      expect(res.message).toBe('無效的公司名稱');
    });
  });
});
