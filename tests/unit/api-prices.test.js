/**
 * @fileoverview Unit tests for the batch price API endpoint.
 * We mock yahoo-finance data fetcher to isolate the API logic and avoid network calls.
 */

const { GET } = require('../../src/app/api/prices/route');

jest.mock('../../src/lib/data-fetcher/yahoo-finance', () => ({
  fetchStockData: jest.fn().mockImplementation((symbol) => Promise.resolve({
    symbol,
    name: symbol === 'AAPL' ? 'Apple Inc.' : 'Tesla Inc.',
    price: symbol === 'AAPL' ? 315.32 : 248.50,
    changePercent: symbol === 'AAPL' ? -0.28 : 2.45
  }))
}));

describe('GET /api/prices', () => {
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
});
