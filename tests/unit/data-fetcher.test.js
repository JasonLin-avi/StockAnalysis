const { fetchStockData, fetchHistoricalData } = require('../../src/lib/data-fetcher');

// ============================================================
// Mock Yahoo Finance responses
// ============================================================
const mockYahooStockResponse = {
  chart: {
    result: [{
      meta: {
        regularMarketPrice: 150.25,
        previousClose: 148.50,
        regularMarketVolume: 85231400,
        regularMarketDayHigh: 151.80,
        regularMarketDayLow: 148.90,
        regularMarketOpen: 149.10,
        chartPreviousClose: 148.50
      },
      timestamp: [1721300000],
      indicators: {
        quote: [{
          open: [149.10],
          high: [151.80],
          low: [148.90],
          close: [150.25],
          volume: [85231400]
        }]
      }
    }],
    error: null
  }
};

const mockYahooHistoricalResponse = {
  chart: {
    result: [{
      timestamp: [1721200000, 1721286400, 1721372800],
      indicators: {
        quote: [{
          open: [148.00, 149.50, 150.00],
          high: [149.80, 151.20, 151.50],
          low: [147.50, 148.80, 149.20],
          close: [149.20, 150.75, 150.25],
          volume: [80000000, 82000000, 85231400]
        }],
        adjclose: [{
          adjclose: [149.00, 150.55, 150.05]
        }]
      }
    }],
    error: null
  }
};

// ============================================================
// Mock Google Finance responses
// ============================================================
const mockGoogleStockResponse = '// [{"id": "694653","t": "AAPL","e": "NASDAQ","l": "150.25","l_fix": "150.25","l_cur": "150.25","s": "0","ltt": "4:00PM EDT","lt": "Jul 17, 2024","c": "+1.75","c_fix": "1.75","cp": "1.18","cp_fix": "1.18","ccol": "chg","pcls_fix": "148.50","vo": "85231400","hi": "151.80","lo": "148.90","op": "149.10"}]';

const mockGoogleHistoricalCsv = 'TIMEZONE_OFFSET=-240\nCOLUMNS=DATE,OPEN,HIGH,LOW,CLOSE,VOLUME\nDATA=\na1721200000,148.00,149.80,147.50,149.20,80000000\n1,149.50,151.20,148.80,150.75,82000000\n2,150.00,151.50,149.20,150.25,85231400';

// ============================================================
// Helper: create a mock fetch implementation
// ============================================================
function createMockFetch(options = {}) {
  const {
    yahooStockOk = true,
    yahooHistoricalOk = true,
    googleStockOk = true,
    googleHistoricalOk = true,
    yahooStockResponse = mockYahooStockResponse,
    yahooHistoricalResponse = mockYahooHistoricalResponse,
    googleStockResponse = mockGoogleStockResponse,
    googleHistoricalResponse = mockGoogleHistoricalCsv
  } = options;

  return jest.fn((url) => {
    if (url.includes('query1.finance.yahoo.com')) {
      if (url.includes('range=1d')) {
        if (!yahooStockOk) {
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            text: () => Promise.resolve('Forbidden')
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(yahooStockResponse)
        });
      }
      if (!yahooHistoricalOk) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: () => Promise.resolve('Not Found')
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(yahooHistoricalResponse)
      });
    }

    if (url.includes('finance.google.com')) {
      if (url.includes('/info?')) {
        if (!googleStockOk) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: () => Promise.resolve('Too Many Requests')
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(googleStockResponse)
        });
      }
      if (!googleHistoricalOk) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: () => Promise.resolve('Not Found')
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(googleHistoricalResponse)
      });
    }

    return Promise.reject(new Error('Unknown URL: ' + url));
  });
}

// ============================================================
// Tests
// ============================================================
describe('Data Fetcher Module', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ----------------------------------------------------------
  // Stock Data Tests
  // ----------------------------------------------------------
  describe('fetchStockData', () => {
    test('returns standardized format from Yahoo Finance (primary source)', async () => {
      global.fetch = createMockFetch({});
      const result = await fetchStockData('AAPL');

      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('price', 150.25);
      expect(result).toHaveProperty('change', 1.75);
      expect(result).toHaveProperty('changePercent', expect.any(Number));
      expect(result).toHaveProperty('volume', 85231400);
      expect(result).toHaveProperty('high', 151.80);
      expect(result).toHaveProperty('low', 148.90);
      expect(result).toHaveProperty('open', 149.10);
      expect(result).toHaveProperty('previousClose', 148.50);
      expect(result).toHaveProperty('timestamp', expect.any(Number));

      const calls = global.fetch.mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toContain('query1.finance.yahoo.com');
    });

    test('falls back to Google Finance when Yahoo fails', async () => {
      global.fetch = createMockFetch({ yahooStockOk: false });

      const result = await fetchStockData('AAPL');

      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('price', 150.25);
      expect(result).toHaveProperty('change', 1.75);
      expect(result).toHaveProperty('volume', 85231400);

      const calls = global.fetch.mock.calls;
      expect(calls.length).toBe(2);
      expect(calls[0][0]).toContain('query1.finance.yahoo.com');
      expect(calls[1][0]).toContain('finance.google.com');
    });

    test('throws error when both sources fail', async () => {
      global.fetch = createMockFetch({
        yahooStockOk: false,
        googleStockOk: false
      });

      await expect(fetchStockData('INVALID')).rejects.toThrow(
        /Failed to fetch stock data for INVALID/
      );
    });

    test('handles malformed Yahoo response (empty result)', async () => {
      global.fetch = createMockFetch({
        yahooStockResponse: { chart: { result: [] } }
      });

      const result = await fetchStockData('AAPL');
      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('price', 150.25);
    });

    test('handles malformed Google response (invalid JSON)', async () => {
      global.fetch = createMockFetch({
        yahooStockOk: false,
        googleStockResponse: 'not valid json'
      });

      await expect(fetchStockData('INVALID')).rejects.toThrow(
        /Failed to fetch stock data/
      );
    });

    test('computed changePercent is correct', async () => {
      global.fetch = createMockFetch({});

      const result = await fetchStockData('AAPL');
      const expectedChangePercent = ((150.25 - 148.50) / 148.50) * 100;
      expect(result.changePercent).toBeCloseTo(expectedChangePercent, 1);
    });
  });

  // ----------------------------------------------------------
  // Historical Data Tests
  // ----------------------------------------------------------
  describe('fetchHistoricalData', () => {
    test('returns standardized format from Yahoo Finance', async () => {
      global.fetch = createMockFetch({});

      const result = await fetchHistoricalData('AAPL', '1mo');

      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('period', '1mo');
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(3);

      const point = result.data[0];
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('open', 148.00);
      expect(point).toHaveProperty('high', 149.80);
      expect(point).toHaveProperty('low', 147.50);
      expect(point).toHaveProperty('close', 149.20);
      expect(point).toHaveProperty('volume', 80000000);

      const calls = global.fetch.mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toContain('query1.finance.yahoo.com');
    });

    test('falls back to Google Finance when Yahoo fails', async () => {
      global.fetch = createMockFetch({ yahooHistoricalOk: false });

      const result = await fetchHistoricalData('AAPL', '1mo');

      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('period', '1mo');
      expect(result).toHaveProperty('data');
      expect(result.data.length).toBe(3);

      expect(result.data[0]).toHaveProperty('open', 148.00);
      expect(result.data[0]).toHaveProperty('close', 149.20);

      const calls = global.fetch.mock.calls;
      expect(calls.length).toBe(2);
      expect(calls[0][0]).toContain('query1.finance.yahoo.com');
      expect(calls[1][0]).toContain('finance.google.com');
    });

    test('throws error when both sources fail', async () => {
      global.fetch = createMockFetch({
        yahooHistoricalOk: false,
        googleHistoricalOk: false
      });

      await expect(fetchHistoricalData('INVALID', '1mo')).rejects.toThrow(
        /Failed to fetch historical data/
      );
    });

    test('defaults period to 1mo', async () => {
      global.fetch = createMockFetch({});

      const result = await fetchHistoricalData('AAPL');

      expect(result.period).toBe('1mo');

      const calls = global.fetch.mock.calls;
      expect(calls[0][0]).toContain('range=1mo');
    });

    test('handles empty data from Yahoo with fallback also failing', async () => {
      global.fetch = createMockFetch({
        yahooHistoricalOk: false,
        googleHistoricalOk: false,
        yahooHistoricalResponse: {
          chart: {
            result: [{
              timestamp: [],
              indicators: { quote: [{ open: [], high: [], low: [], close: [], volume: [] }] }
            }],
            error: null
          }
        }
      });

      await expect(fetchHistoricalData('EMPTY', '1mo')).rejects.toThrow(
        /Failed to fetch historical data/
      );
    });
  });
});

