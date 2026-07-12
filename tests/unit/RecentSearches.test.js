/** @jest-environment jsdom */
/**
 * @fileoverview Unit tests for the RecentSearches component.
 * 
 * We mock window.fetch to isolate our component tests from real network requests,
 * ensuring fast and predictable test execution.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecentSearches from '../../src/components/RecentSearches';

// Mock global fetch to simulate live prices API response without performing actual HTTP requests.
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      AAPL: { price: '$315.32', change: '-0.28%', color: 'text-rose-400' }
    })
  })
);

describe('RecentSearches', () => {
  beforeEach(() => {
    // Clear localStorage before each test run to ensure strict isolation
    // and prevent test failures caused by dirty state leakage.
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  test('returns null when localStorage is empty', () => {
    // If a user has no prior search history, the component should completely
    // hide its section (return null) to keep the dashboard uncluttered.
    const { container } = render(<RecentSearches />);
    expect(container.firstChild).toBeNull();
  });

  test('renders cards list and fetches live prices when data exists', async () => {
    // Populate localStorage with initial search history to test the active rendering state.
    window.localStorage.setItem('antigravity_recent_stocks', JSON.stringify([
      { symbol: 'AAPL', name: 'Apple Inc.' }
    ]));

    render(<RecentSearches />);
    
    // Assert static text from local storage is rendered immediately.
    expect(screen.getByText('最近搜尋標的')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();

    // Verify async price fetching resolves and renders correctly.
    await waitFor(() => {
      expect(screen.getByText('$315.32')).toBeInTheDocument();
      expect(screen.getByText('-0.28%')).toBeInTheDocument();
    });
  });
});
