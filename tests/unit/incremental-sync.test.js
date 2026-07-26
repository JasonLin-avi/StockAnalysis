jest.mock('../../src/external/data-fetcher/yahoo-finance', () => ({
  fetchHistoricalData: jest.fn().mockImplementation((symbol, period) => {
    return Promise.resolve({
      symbol,
      period,
      data: [
        { date: '2026-07-16', open: 150, high: 155, low: 148, close: 152, volume: 1000000 }
      ]
    });
  })
}));

import { getLocal3YearPrices }  from '../../src/external/data-fetcher';
import { syncStockPrices }  from '../../src/services/data-sync.service';
import { connectToDatabase }  from '../../src/external/database/connection';

describe('Incremental Price Sync Tests', () => {
  let db;
  beforeEach(async () => {
    db = await connectToDatabase(':memory:');
    // 預先寫入一檔股票
    await new Promise((resolve) => {
      db.run("INSERT INTO stocks (symbol, market) VALUES ('AAPL', 'US');", resolve);
    });
  });

  afterEach((done) => {
    db.close(done);
  });

  test('should sync data incrementally and fetch from local database', async () => {
    // 測試同步程序
    const success = await syncStockPrices(db, 1, 'AAPL');
    expect(success).toBe(true);

    const prices = await getLocal3YearPrices(db, 1);
    expect(prices.length).toBeGreaterThan(0);
    expect(prices[0]).toHaveProperty('close');
  });
});
