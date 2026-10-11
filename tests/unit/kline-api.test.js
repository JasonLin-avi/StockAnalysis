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

    // Interval and KD checks
    expect(body.interval).toBe('1d');
    expect(body.kd).toBeDefined();
    expect(body.kd.k.length).toBe(70);
    expect(body.kd.d.length).toBe(70);
    expect(body.kd.k[0]).toHaveProperty('time');
    expect(body.kd.k[0]).toHaveProperty('value');
    expect(body.kd.d[0]).toHaveProperty('time');
    expect(body.kd.d[0]).toHaveProperty('value');

    // Technical indicator KD checks in summary
    expect(body.summary.technical_indicators).toHaveProperty('KD_K');
    expect(body.summary.technical_indicators).toHaveProperty('KD_D');
    expect(body.summary.technical_indicators).toHaveProperty('KD_status');
  });

  test('aggregates candles by weekly interval (?interval=1w)', async () => {
    const mockPrices = generatePrices(70);
    mockGetHistoricalPricesFromDB.mockResolvedValue(mockPrices);

    const req = {
      url: 'http://localhost/api/stock/AAPL/kline?range=3Y&interval=1w'
    };
    const context = { params: Promise.resolve({ symbol: 'AAPL' }) };

    const response = await GET(req, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.interval).toBe('1w');
    // 70 consecutive calendar days span ~10-11 weeks
    expect(body.candles.length).toBeLessThan(15);
    expect(body.candles.length).toBeGreaterThan(5);
    expect(body.kd.k.length).toBe(body.candles.length);
    expect(body.kd.d.length).toBe(body.candles.length);
  });

  test('handles case-insensitive interval and falls back to 1d for invalid interval', async () => {
    const mockPrices = generatePrices(70);
    mockGetHistoricalPricesFromDB.mockResolvedValue(mockPrices);

    // Case-insensitive test
    const reqUpper = {
      url: 'http://localhost/api/stock/AAPL/kline?range=3Y&interval=1W'
    };
    const context = { params: Promise.resolve({ symbol: 'AAPL' }) };
    const resUpper = await GET(reqUpper, context);
    const bodyUpper = await resUpper.json();
    expect(bodyUpper.interval).toBe('1w');

    // Fallback test
    const reqInvalid = {
      url: 'http://localhost/api/stock/AAPL/kline?range=3Y&interval=invalid'
    };
    const resInvalid = await GET(reqInvalid, context);
    const bodyInvalid = await resInvalid.json();
    expect(bodyInvalid.interval).toBe('1d');
    expect(bodyInvalid.candles.length).toBe(70);
  });

  test('returns empty kd structure and interval when price data is empty', async () => {
    mockGetHistoricalPricesFromDB.mockResolvedValue([]);

    const req = {
      url: 'http://localhost/api/stock/AAPL/kline?range=1Y&interval=1mo'
    };
    const context = { params: Promise.resolve({ symbol: 'AAPL' }) };

    const response = await GET(req, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.candles).toEqual([]);
    expect(body.volume).toEqual([]);
    expect(body.ma5).toEqual([]);
    expect(body.ma20).toEqual([]);
    expect(body.ma60).toEqual([]);
    expect(body.kd).toEqual({ k: [], d: [] });
    expect(body.summary).toBeNull();
    expect(body.interval).toBe('1mo');
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
