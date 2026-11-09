/**
 * @fileoverview Live integration test for Popular Stocks data fetching and Taiwan stock name mapping.
 * Why this file exists:
 * - Tests actual live connectivity with Yahoo Finance and stock-map resolution for live symbols (e.g. 2330.TW).
 * - Kept in tests/integration/external/ so developers can diagnose live external API health without re-implementing live tests.
 * - Isolated from unit tests to guarantee fast, offline, and reliable CI test runs.
 */

import { getLatestPricesAndBacktest } from '@/services/analysis.service';

describe('PopularStocks Live External API Integration Test', () => {
  // Allow up to 30s for external network roundtrips and retry fallbacks
  test('fetches live stock data for 2330.TW and resolves Chinese stock name via stock-map', async () => {
    const results = await getLatestPricesAndBacktest(['2330.TW']);
    
    expect(results['2330.TW']).toBeDefined();
    expect(results['2330.TW'].name).toBe('台積電');
    expect(typeof results['2330.TW'].price).toBe('string');
    expect(results['2330.TW'].market).toBe('上市');
  }, 30000);
});
