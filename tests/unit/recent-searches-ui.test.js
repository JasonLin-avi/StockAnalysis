/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecentSearches from '@/components/RecentSearches';

describe('RecentSearches Component Visual Styling Test', () => {
  beforeEach(() => {
    const mockRecentStocks = [
      { symbol: '2330.TW', name: '台積電', market: '台股' },
      { symbol: 'AAPL', name: 'Apple Inc.', market: '美股' }
    ];
    localStorage.setItem('antigravity_recent_stocks', JSON.stringify(mockRecentStocks));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        '2330.TW': { name: '台積電', market: '上市', price: '$950.00', change: '+2.0%', color: 'text-emerald-400' },
        'AAPL': { name: 'Apple Inc.', market: '美股', price: '$220.00', change: '+1.0%', color: 'text-emerald-400' }
      })
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  test('renders RecentSearches cards with PopularStocks design structure', async () => {
    render(<RecentSearches />);

    await waitFor(() => {
      expect(screen.getByText('最近搜尋標的 (Recent Searches)')).toBeInTheDocument();
      expect(screen.getByText('台積電')).toBeInTheDocument();
      expect(screen.getByText('2330.TW')).toBeInTheDocument();
      expect(screen.getByText('$950.00')).toBeInTheDocument();
    });
  });
});
