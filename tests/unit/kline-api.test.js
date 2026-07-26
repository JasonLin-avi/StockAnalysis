/**
 * @fileoverview Unit tests for the K-Line API route.
 * Verifies incremental sync call, candlestick formatting, volume color assignment,
 * moving average calculation, and timeframe filtering.
 */

import { GET }  from '../../src/app/api/stock/[symbol]/kline/route';

// Mocks for DB and data-fetcher
const mockConnectToDatabase = jest.fn();
const mockSaveStock = jest.fn();
const mockGetHistoricalPricesFromDB = jest.fn();
const mockSyncStockPrices = jest.fn();

jest.mock('../../src/external/database/connection', () => ({
  connectToDatabase: () => mockConnectToDatabase()
}));

jest.mock('../../src/external/database/queries', () => ({
  saveStock: (db, stock) => mockSaveStock(db, stock),
  getHistoricalPricesFromDB: (db, stockId) => mockGetHistoricalPricesFromDB(db, stockId)
}));

jest.mock('../../src/services/data-sync.service', () => ({
  syncStockPrices: (db, stockId, symbol) => mockSyncStockPrices(db, stockId, symbol)
}));

describe('GET /api/stock/[symbol]/kline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue({});
    mockSaveStock.mockResolvedValue(1);
    mockSyncStockPrices.mockResolvedValue(true);
  });

  function generatePrices(count) {
    const prices = [];
    const startDate = new Date('2025-01-01');
    for (let i = 0; i < count; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const open = 100 + i;
      const close = i % 2 === 0 ? open + 5 : open - 3;
      prices.push({
        date: dateStr,
        open,
        high: Math.max(open, close) + 2,
        low: Math.min(open, close) - 2,
        close,
        volume: 1000 + i * 10
      });
    }
    return prices;
  }

  test('returns candles, volume, and moving averages for symbol', async () => {
    const mockPrices = generatePrices(70);
    mockGetHistoricalPricesFromDB.mockResolvedValue(mockPrices);

    const req = {
      url: 'http://localhost/api/stock/AAPL/kline?range=3Y'
    };
    const context = { params: Promise.resolve({ symbol: 'AAPL' }) };

    const response = await GET(req, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockSaveStock).toHaveBeenCalled();
    expect(mockSyncStockPrices).toHaveBeenCalledWith(expect.anything(), 1, 'AAPL');

    expect(body.candles.length).toBe(70);
    expect(body.volume.length).toBe(70);
    expect(body.candles[0]).toHaveProperty('time');
    expect(body.candles[0]).toHaveProperty('open');
    expect(body.candles[0]).toHaveProperty('high');
    expect(body.candles[0]).toHaveProperty('low');
    expect(body.candles[0]).toHaveProperty('close');

    // Volume colors: bullish green (#26a69a) and bearish red (#ef5350)
    expect(body.volume[0].color).toBe('#26a69a');
    expect(body.volume[1].color).toBe('#ef5350');

    // Moving averages checks
    expect(body.ma5.length).toBe(66); // 70 - 4
    expect(body.ma20.length).toBe(51); // 70 - 19
    expect(body.ma60.length).toBe(11); // 70 - 59
  });

  test('filters dataset according to range parameter', async () => {
    const mockPrices = generatePrices(365);
    mockGetHistoricalPricesFromDB.mockResolvedValue(mockPrices);

    const req = {
      url: 'http://localhost/api/stock/2330.TW/kline?range=1M'
    };
    const context = { params: Promise.resolve({ symbol: '2330.TW' }) };

    const response = await GET(req, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    // 1M should filter to roughly ~30-31 days
    expect(body.candles.length).toBeGreaterThan(25);
    expect(body.candles.length).toBeLessThan(35);
  });

  test('returns 400 error if symbol parameter is missing', async () => {
    const req = {
      url: 'http://localhost/api/stock//kline'
    };
    const context = { params: Promise.resolve({}) };

    const response = await GET(req, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });
});
