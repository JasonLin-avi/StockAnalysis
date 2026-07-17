const { syncStockPricesIncremental, getLocal3YearPrices } = require('../../src/lib/data-fetcher');
const { connectToDatabase } = require('../../src/lib/database/connection');

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
    const success = await syncStockPricesIncremental(db, 1, 'AAPL');
    expect(success).toBe(true);

    const prices = await getLocal3YearPrices(db, 1);
    expect(prices.length).toBeGreaterThan(0);
    expect(prices[0]).toHaveProperty('close');
  });
});
