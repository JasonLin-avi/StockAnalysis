/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PopularStocks from '@/components/PopularStocks';

describe('PopularStocks Component ReferenceError Regression Test', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        '2330.TW': { name: '2330.TW', market: '台股', price: '$950.00', change: '+2.0%' },
        'AAPL': { name: 'Apple Inc.', market: '美股', price: '$220.00', change: '+1.0%' }
      })
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders PopularStocks without throwing ReferenceError', async () => {
    expect(() => render(<PopularStocks />)).not.toThrow();
    
    await waitFor(() => {
      expect(screen.getByText('台積電')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });
  });
});
