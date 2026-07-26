/**
 * @fileoverview Unit tests for the batch price API endpoint.
 * We mock yahoo-finance data fetcher to isolate the API logic and avoid network calls.
 */

import { GET }  from '../../src/app/api/prices/route';

const mockFetchStockData = jest.fn();

// Why: Mock yahoo-finance module explicitly so we can control mock behavior in individual test blocks.
jest.mock('../../src/external/data-fetcher/yahoo-finance', () => ({
  __esModule: true,
  default: {
    fetchStockData: (symbol) => mockFetchStockData(symbol)
  },
  fetchStockData: (symbol) => mockFetchStockData(symbol)
}));

describe('GET /api/prices', () => {
  beforeEach(() => {
    mockFetchStockData.mockReset();
    // Why: Establish default successful mock responses for normal stock symbols.
    mockFetchStockData.mockImplementation((symbol) => Promise.resolve({
      symbol,
      name: symbol === 'AAPL' ? 'Apple Inc.' : 'Tesla Inc.',
      price: symbol === 'AAPL' ? 315.32 : 248.50,
      changePercent: symbol === 'AAPL' ? -0.28 : 2.45
    }));
  });

  test('returns batch stock prices for symbols query', async () => {
    // Why: Simulate a Next.js Request object with URL parameter to test price retrieval logic.
    const req = {
      url: 'http://localhost/api/prices?symbols=AAPL,TSLA'
    };
    const response = await GET(req);
    const body = await response.json();
    
    expect(response.status).toBe(200);
    expect(body.AAPL.price).toBe('$315.32');
    expect(body.AAPL.change).toBe('-0.28%');
    expect(body.AAPL.color).toBe('text-rose-400');
    expect(body.TSLA.price).toBe('$248.50');
    expect(body.TSLA.change).toBe('+2.45%');
    expect(body.TSLA.color).toBe('text-emerald-400');
  });

  test('returns empty object when symbols query parameter is empty', async () => {
    // Why: Simulate an empty symbols parameter to ensure the API handles it gracefully and returns an empty dataset.
    const req = {
      url: 'http://localhost/api/prices?symbols='
    };
    const response = await GET(req);
    const body = await response.json();
    
    expect(response.status).toBe(200);
    expect(body).toEqual({});
  });

  test('returns empty object when symbols query parameter is missing', async () => {
    // Why: Verify behavior when the symbols query string is completely missing from the request URL.
    const req = {
      url: 'http://localhost/api/prices'
    };
    const response = await GET(req);
    const body = await response.json();
    
    expect(response.status).toBe(200);
    expect(body).toEqual({});
  });

  test('returns 200 and successful stock details if one stock fetch throws an error', async () => {
    // Why: Ensure the API isolates fetch errors per stock symbol, returning results for the functional symbols.
    mockFetchStockData.mockImplementation((symbol) => {
      if (symbol === 'TSLA') {
        return Promise.reject(new Error('Network failure fetching TSLA'));
      }
      return Promise.resolve({
        symbol,
        name: 'Apple Inc.',
        price: 315.32,
        changePercent: -0.28
      });
    });

    const req = {
      url: 'http://localhost/api/prices?symbols=AAPL,TSLA'
    };
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    // Why: Confirm AAPL details are correctly included.
    expect(body.AAPL).toBeDefined();
    expect(body.AAPL.price).toBe('$315.32');
    
    // Why: Confirm TSLA details are omitted because of the fetch error.
    expect(body.TSLA).toBeUndefined();
  });
});
