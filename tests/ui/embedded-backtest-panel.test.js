/** @jest-environment jsdom */
/**
 * @fileoverview Unit tests for EmbeddedBacktestPanel component.
 *
 * Verifies rendering of EmbeddedBacktestPanel without stock symbol input, cutoff date picker,
 * prediction horizon dropdown, custom days input behavior, and API submit/reveal workflow.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmbeddedBacktestPanel from '../../src/components/backtest/EmbeddedBacktestPanel';

jest.mock('react-markdown', () => {
  const MockMarkdown = ({ children }) => <div>{children}</div>;
  MockMarkdown.displayName = 'MockMarkdown';
  return MockMarkdown;
});
jest.mock('remark-gfm', () => ({}));

// Mock global fetch to simulate API responses for predict and evaluate
global.fetch = jest.fn((url) => {
  if (url === '/api/backtest/predict') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          cutoffDate: '2024-03-01',
          actualDate: '2024-03-01',
          symbol: '2330.TW',
          basePrice: 880,
          lookbackDays: 60,
          predictionDays: 20,
          forecast: {
            trend: 'BULLISH',
            confidence: 9,
            targetPriceRange: [900, 950],
            stopLossPrice: 840,
            keySupport: 850,
            keyResistance: 920,
            rationale: '多頭格局強烈，看好持續突破。'
          }
        })
    });
  }
  if (url === '/api/backtest/evaluate') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          evaluation: {
            accuracyScore: 92,
            directionCorrect: true,
            priceRangeHit: true,
            actualReturnPct: 8.5,
            evaluationSummary: '實際漲幅達 8.5%，精準符合多頭看漲預測。'
          }
        })
    });
  }
  return Promise.reject(new Error('Unknown URL: ' + url));
});

describe('EmbeddedBacktestPanel Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders cutoff date picker and prediction horizon dropdown without stock symbol input', () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    expect(screen.queryByLabelText(/股票代碼/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/歷史基準日/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/預測展望時間/i)).toBeInTheDocument();
  });

  test('shows custom days input field when "custom" option is selected', () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    const select = screen.getByLabelText(/預測展望時間/i);
    fireEvent.change(select, { target: { value: 'custom' } });

    expect(screen.getByPlaceholderText(/輸入天數/i)).toBeInTheDocument();
  });

  test('hides custom days input field when fixed horizon is selected', () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    const select = screen.getByLabelText(/預測展望時間/i);
    fireEvent.change(select, { target: { value: 'custom' } });
    expect(screen.getByPlaceholderText(/輸入天數/i)).toBeInTheDocument();

    fireEvent.change(select, { target: { value: '20' } });
    expect(screen.queryByPlaceholderText(/輸入天數/i)).not.toBeInTheDocument();
  });

  test('triggers predict and evaluate API calls upon user interaction', async () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    const submitBtn = screen.getByRole('button', { name: /開始歷史時點回測/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/backtest/predict',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"symbol":"2330.TW"')
        })
      );
      expect(screen.getByText('🟢 多頭看漲')).toBeInTheDocument();
    });

    const revealBtn = screen.getByRole('button', { name: /揭曉未來走勢與自動對比評分/i });
    fireEvent.click(revealBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/backtest/evaluate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"symbol":"2330.TW"')
        })
      );
      expect(screen.getByText('92')).toBeInTheDocument();
    });
  });

  test('renders historical lookback dropdown and handles custom lookback days input', () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    expect(screen.getByLabelText(/歷史參考長度/i)).toBeInTheDocument();

    const lookbackSelect = screen.getByLabelText(/歷史參考長度/i);
    expect(lookbackSelect.value).toBe('60');

    fireEvent.change(lookbackSelect, { target: { value: 'custom' } });

    expect(screen.getByPlaceholderText(/參考天數/i)).toBeInTheDocument();
  });

  test('passes active lookbackDays in predict API request payload', async () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    const lookbackSelect = screen.getByLabelText(/歷史參考長度/i);
    fireEvent.change(lookbackSelect, { target: { value: '20' } });

    const submitBtn = screen.getByRole('button', { name: /開始歷史時點回測/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/backtest/predict',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"lookbackDays":20')
        })
      );
    });
  });

  test('defaults cutoff date to today and provides today quick preset button', () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    const todayStr = new Date().toISOString().split('T')[0];
    const dateInput = screen.getByLabelText(/歷史基準日/i);
    expect(dateInput.value).toBe(todayStr);

    const todayBtn = screen.getByRole('button', { name: /今日/i });
    expect(todayBtn).toBeInTheDocument();

    // Change date to something else, then click 今日 button
    fireEvent.change(dateInput, { target: { value: '2023-01-01' } });
    expect(dateInput.value).toBe('2023-01-01');

    fireEvent.click(todayBtn);
    expect(dateInput.value).toBe(todayStr);
  });

  test('passes predictionDays in predict API payload and renders baseline date & price in ResultCards', async () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    const submitBtn = screen.getByRole('button', { name: /開始歷史時點回測/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/backtest/predict',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"predictionDays":20')
        })
      );
      // Verify point-in-time context banner is rendered
      expect(screen.getAllByText(/歷史基準日期/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('基準日收盤價')).toBeInTheDocument();
      expect(screen.getByText(/NT\$880/i)).toBeInTheDocument();
      expect(screen.getByText('2024-03-01')).toBeInTheDocument();
    });
  });
});
