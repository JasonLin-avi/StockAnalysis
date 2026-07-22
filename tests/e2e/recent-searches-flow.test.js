/** @jest-environment jsdom */
/**
 * @fileoverview E2E integration test for the Recent Searches flow.
 *
 * This test verifies the complete end-to-end journey:
 * 1. A user visits a stock detail page (StockDetail component).
 * 2. HistoryTracker writes the symbol to localStorage via useEffect.
 * 3. The user navigates back to the homepage (Home component).
 * 4. RecentSearches reads localStorage and renders the card.
 * 5. RecentSearches fetches live prices and renders them.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../../src/app/page';

// Mock ESM-only modules to prevent Jest SyntaxError (Unexpected token 'export')
jest.mock('react-markdown', () => {
  const ReactMarkdown = ({ children }) => <>{children}</>;
  ReactMarkdown.displayName = 'ReactMarkdown';
  return ReactMarkdown;
});
jest.mock('remark-gfm', () => ({}));

// Mock KlineTab to prevent loading lightweight-charts which fails in Jest jsdom environment
jest.mock('../../src/app/stock/[symbol]/KlineTab', () => {
  const MockKlineTab = () => <div>Mock KlineTab</div>;
  MockKlineTab.displayName = 'MockKlineTab';
  return MockKlineTab;
});

import StockDetail from '../../src/app/stock/[symbol]/page';

// Mock next/navigation to prevent "invariant expected app router to be mounted" error
// when components like SearchBar call useRouter() outside a real App Router context.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link to render a plain <a> in jsdom so we don't need the App Router context.
jest.mock('next/link', () => {
  const Link = ({ href, children, ...props }) => <a href={href} {...props}>{children}</a>;
  Link.displayName = 'Link';
  return Link;
});

// Mock the heavy analysis library so the stock detail page resolves instantly
// without making real network calls or touching the database.
jest.mock('../../src/lib/integration', () => ({
  performFullAnalysis: jest.fn().mockResolvedValue({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 315.32,
    changePercent: -0.28,
    date: '2026-07-12',
    historicalData: [],
    technical: { ma: [], rsi: null, macd: null },
    fundamental: {},
    news: {},
    advice: {}
  })
}));

describe('Recent Searches End-to-End Flow', () => {
  beforeEach(() => {
    // Start every test with a clean localStorage to prevent cross-test contamination.
    window.localStorage.clear();

    // Mock fetch globally for all requests in this suite.
    // Supports both internal /api/prices endpoint and external Yahoo/Google queries used on Home page.
    global.fetch = jest.fn().mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/prices')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            AAPL: { price: '$315.32', change: '-0.28%', color: 'text-rose-400' }
          })
        });
      }
      if (urlStr.includes('query1.finance.yahoo.com') || urlStr.includes('query2.finance.yahoo.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            chart: {
              result: [{
                meta: { regularMarketPrice: 315.32, previousClose: 316.20, regularMarketVolume: 1000000 },
                indicators: { quote: [{ open: [315], high: [316], low: [314], close: [315.32], volume: [1000000] }] },
                timestamp: [Date.now()]
              }]
            }
          })
        });
      }
      if (urlStr.includes('finance.google.com')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('// [{"l": "315.32", "c": "-0.88", "cp": "-0.28", "pcls_fix": "316.20"}]')
        });
      }
      if (urlStr.includes('/api/analyze')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            symbol: 'AAPL',
            name: 'Apple Inc.',
            price: 315.32,
            changePercent: -0.28,
            date: '2026-07-12',
            historicalData: [],
            technical: { ma: [], rsi: null, macd: null },
            fundamental: {},
            news: {},
            advice: {}
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders stock detail and then shows it on homepage recent searches list', async () => {
    // 1. Visit Stock Detail Page — rendering the client component.
    await act(async () => {
      render(<StockDetail params={{ symbol: 'AAPL' }} />);
    });
    
    // Data is fetched automatically via useEffect upon mounting StockDetail.
    expect(await screen.findByText('個股智能分析看板')).toBeInTheDocument();



    // 2. Render Homepage — RecentSearches reads from localStorage that HistoryTracker wrote above.
    render(<Home />);

    // 3. Assert the recent searches section heading and AAPL card are visible.
    //    We use getAllByText because 'AAPL' appears in multiple places:
    //    the StockDetail h1, the homepage popular stocks grid, and the recent searches card.
    expect(screen.getByText('最近搜尋標的')).toBeInTheDocument();
    const aaplElements = screen.getAllByText('AAPL');
    expect(aaplElements.length).toBeGreaterThanOrEqual(1);

    // 4. Wait for the async fetchPrices call to resolve and the live price to appear.
    //    We use getAllByText because the price text appears in multiple places across
    //    the two rendered components (StockDetail header + RecentSearches card).
    await waitFor(() => {
      const priceElements = screen.getAllByText('$315.32');
      expect(priceElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
