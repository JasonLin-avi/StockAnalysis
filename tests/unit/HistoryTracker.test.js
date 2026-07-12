/** @jest-environment jsdom */
/**
 * @fileoverview Unit tests for the HistoryTracker component.
 * 
 * We use these tests to ensure that the user's recently searched/viewed stocks
 * are stored correctly in localStorage with proper limits and ordering.
 */

import React from 'react';
import { render } from '@testing-library/react';
import HistoryTracker from '../../src/components/HistoryTracker';

describe('HistoryTracker', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure test isolation and
    // avoid state bleeding between test cases.
    window.localStorage.clear();
  });

  test('adds symbol and name to localStorage on mount', () => {
    render(<HistoryTracker symbol="AAPL" name="Apple Inc." />);
    
    const stored = JSON.parse(window.localStorage.getItem('antigravity_recent_stocks'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual({ symbol: 'AAPL', name: 'Apple Inc.' });
  });

  test('moves existing stock to front of array', () => {
    // Pre-populate history to simulate an existing user state.
    window.localStorage.setItem('antigravity_recent_stocks', JSON.stringify([
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'AAPL', name: 'Apple Inc.' }
    ]));

    render(<HistoryTracker symbol="AAPL" name="Apple Inc." />);
    
    const stored = JSON.parse(window.localStorage.getItem('antigravity_recent_stocks'));
    expect(stored).toHaveLength(2);
    // The duplicated stock must be moved to the front to represent the most
    // recently accessed status.
    expect(stored[0].symbol).toBe('AAPL');
    expect(stored[1].symbol).toBe('TSLA');
  });

  test('caps localStorage list to maximum 8 entries', () => {
    // Simulate a full history list of 8 items to test the capacity limit.
    const list = Array.from({ length: 8 }, (_, i) => ({ symbol: `S${i}`, name: `Stock ${i}` }));
    window.localStorage.setItem('antigravity_recent_stocks', JSON.stringify(list));

    render(<HistoryTracker symbol="NEW" name="New Stock" />);
    
    const stored = JSON.parse(window.localStorage.getItem('antigravity_recent_stocks'));
    // We cap the size at 8 to prevent localStorage from growing indefinitely
    // and to optimize the rendering performance of the history UI.
    expect(stored).toHaveLength(8);
    expect(stored[0].symbol).toBe('NEW');
    expect(stored[7].symbol).toBe('S6'); // FIFO popped S7
  });
});
