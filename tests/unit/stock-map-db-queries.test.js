/**
 * Unit tests for Stock Map Database Queries.
 * Verifies batchUpsertStocks, getCompanyNameFromDB, and getCodeFromDB.
 */

import { connectToDatabase } from '../../src/external/database/connection';
import { getCompanyNameFromDB, getCodeFromDB, batchUpsertStocks } from '../../src/external/database/queries';

describe('Stock Map DB Queries', () => {
  let db;

  beforeEach(async () => {
    db = await connectToDatabase(':memory:');
  });

  afterEach((done) => {
    if (db) {
      db.close(done);
    } else {
      done();
    }
  });

  test('batchUpsertStocks 成功批次寫入並自動包含 created_at', async () => {
    const mockList = [
      { symbol: '2330', name: '台積電', market: '上市' },
      { symbol: '8454', name: '富邦媒', market: '上櫃' }
    ];

    await batchUpsertStocks(db, mockList);

    const tsmc = await getCompanyNameFromDB(db, '2330');
    expect(tsmc).not.toBeNull();
    expect(tsmc.name).toBe('台積電');
    expect(tsmc.market).toBe('上市');
    expect(tsmc.created_at).toBeDefined();

    const fubon = await getCodeFromDB(db, '富邦媒');
    expect(fubon).not.toBeNull();
    expect(fubon.symbol).toBe('8454');
    expect(fubon.market).toBe('上櫃');
  });

  test('batchUpsertStocks 在衝突時進行更新 (ON CONFLICT DO UPDATE)', async () => {
    const initialList = [
      { symbol: '2330', name: '台積電舊名', market: '上市' }
    ];
    await batchUpsertStocks(db, initialList);

    const updatedList = [
      { symbol: '2330', name: '台積電', market: '上市' }
    ];
    await batchUpsertStocks(db, updatedList);

    const tsmc = await getCompanyNameFromDB(db, '2330');
    expect(tsmc).not.toBeNull();
    expect(tsmc.name).toBe('台積電');
  });

  test('getCompanyNameFromDB 與 getCodeFromDB 查無資料時回傳 null', async () => {
    const nonExistentCode = await getCompanyNameFromDB(db, '9999');
    expect(nonExistentCode).toBeNull();

    const nonExistentName = await getCodeFromDB(db, '不存在的公司');
    expect(nonExistentName).toBeNull();
  });
});
