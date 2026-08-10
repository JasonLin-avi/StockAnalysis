/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Why: Mock database dependencies to isolate UI component and helper function tests from SQLite/libsql drivers.
jest.mock('@/external/database/connection', () => ({
  connectToDatabase: jest.fn()
}));
jest.mock('@/external/database/queries', () => ({
  getCompanyNameFromDB: jest.fn(),
  getCodeFromDB: jest.fn(),
  batchUpsertStocks: jest.fn()
}));

import { formatStockName } from '@/lib/stock-map';
import WatchlistTable from '@/components/hub/WatchlistTable';
import LeaderboardPanel from '@/components/hub/LeaderboardPanel';
import PopularStocks from '@/components/PopularStocks';

// Why: Mock Next.js Link component to prevent router context missing errors during JSDOM rendering.
jest.mock('next/link', () => {
  return ({ children, href }) => <a href={href}>{children}</a>;
});

// Why: Mock watchlist store to provide static test symbols for WatchlistTable assertions.
jest.mock('@/lib/watchlist-store', () => ({
  getWatchlist: jest.fn().mockReturnValue(['2330.TW', 'AAPL'])
}));

describe('UI Stock Name Display Formatting', () => {
  describe('formatStockName helper function', () => {
    test('formats company name with symbol when name is distinct from symbol', () => {
      expect(formatStockName('台積電', '2330.TW')).toBe('台積電 (2330.TW)');
      expect(formatStockName('Apple Inc.', 'AAPL')).toBe('Apple Inc. (AAPL)');
    });

    test('returns only symbol when name is identical to symbol or falsy', () => {
      expect(formatStockName('AAPL', 'AAPL')).toBe('AAPL');
      expect(formatStockName(undefined, '2330.TW')).toBe('2330.TW');
      expect(formatStockName(null, 'NVDA')).toBe('NVDA');
      expect(formatStockName('', 'MSFT')).toBe('MSFT');
    });

    test('handles fallback when symbol is missing', () => {
      expect(formatStockName('Tesla', '')).toBe('Tesla');
      expect(formatStockName('', '')).toBe('');
    });
  });

  describe('WatchlistTable stock label formatting', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          '2330.TW': { name: '台積電', price: '$950.00', change: '+2.5%', color: 'text-emerald-400', winRate20d: 0.8 },
          'AAPL': { name: 'AAPL', price: '$220.00', change: '+0.5%', color: 'text-emerald-400', winRate20d: 0.7 }
        })
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    test('renders company name alongside symbol for TWSE stock and only symbol when name equals symbol', async () => {
      render(<WatchlistTable />);

      await waitFor(() => {
        expect(screen.getByText('台積電 (2330.TW)')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });
  });

  describe('LeaderboardPanel symbol line formatting', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ([
          { symbol: '2330.TW', name: '台積電', rate: 0.85, ret: '12.4' },
          { symbol: 'NVDA', rate: 0.78, ret: '9.2' }
        ])
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    test('renders leader.name (leader.symbol) when leader.name exists, or symbol only as fallback', async () => {
      render(<LeaderboardPanel />);

      await waitFor(() => {
        expect(screen.getByText('台積電 (2330.TW)')).toBeInTheDocument();
        expect(screen.getByText('NVDA')).toBeInTheDocument();
      });
    });
  });

  describe('PopularStocks card header display', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          '2330.TW': { name: '台灣積體電路', market: '台股', price: '$950.00', change: '+2.0%' },
          'AAPL': { name: 'Apple Inc.', market: '美股', price: '$220.00', change: '+1.0%' }
        })
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    test('displays dynamic company name alongside stock symbol in card header', async () => {
      render(<PopularStocks />);

      await waitFor(() => {
        expect(screen.getByText('台灣積體電路')).toBeInTheDocument();
        expect(screen.getByText('2330.TW')).toBeInTheDocument();
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });
  });
});
