/** @jest-environment jsdom */
/**
 * @fileoverview Unit test for KlineTab frontend component
 * 
 * Why this test is designed:
 * - Validates that KlineTab renders dark-themed TradingView lightweight-charts with range selector.
 * - Verifies API call formatting (/api/stock/${symbol}/kline?range=${range}).
 * - Confirms series setup (candlestick, MA5, MA20, MA60, volume histogram) and chart cleanup on unmount.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import KlineTab from '../../src/app/stock/[symbol]/KlineTab';
import * as lightweightCharts from 'lightweight-charts';

// Mock lightweight-charts module
jest.mock('lightweight-charts', () => {
  return {
    createChart: jest.fn(),
    CandlestickSeries: { type: 'Candlestick' },
    LineSeries: { type: 'Line' },
    HistogramSeries: { type: 'Histogram' },
    ColorType: { Solid: 'solid' },
  };
}, { virtual: true });

describe('KlineTab Component', () => {
  let mockChart;
  let mockCandlestickSeries;
  let mockMaSeries;
  let mockVolumeSeries;

  const sampleKlineResponse = {
    candles: [
      { time: '2026-01-01', open: 150, high: 155, low: 149, close: 154 },
      { time: '2026-01-02', open: 154, high: 158, low: 153, close: 157 }
    ],
    volume: [
      { time: '2026-01-01', value: 10000, color: '#26a69a' },
      { time: '2026-01-02', value: 12000, color: '#26a69a' }
    ],
    ma5: [{ time: '2026-01-01', value: 151 }],
    ma20: [{ time: '2026-01-01', value: 148 }],
    ma60: [{ time: '2026-01-01', value: 140 }]
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCandlestickSeries = { setData: jest.fn() };
    mockMaSeries = { setData: jest.fn() };
    mockVolumeSeries = { setData: jest.fn() };

    mockChart = {
      addSeries: jest.fn((type, options) => {
        if (options?.upColor === '#22C55E') return mockCandlestickSeries;
        if (options?.priceFormat?.type === 'volume') return mockVolumeSeries;
        return mockMaSeries;
      }),
      addCandlestickSeries: jest.fn(() => mockCandlestickSeries),
      addLineSeries: jest.fn(() => mockMaSeries),
      addHistogramSeries: jest.fn(() => mockVolumeSeries),
      priceScale: jest.fn().mockReturnValue({ applyOptions: jest.fn() }),
      timeScale: jest.fn().mockReturnValue({ fitContent: jest.fn() }),
      applyOptions: jest.fn(),
      remove: jest.fn()
    };

    lightweightCharts.createChart.mockReturnValue(mockChart);

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sampleKlineResponse)
      })
    );
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('renders header title, symbol badge and range selector buttons', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    expect(screen.getByText(/K線技術圖表 \(TradingView\)/i)).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('3M')).toBeInTheDocument();
    expect(screen.getByText('6M')).toBeInTheDocument();
    expect(screen.getByText('1Y')).toBeInTheDocument();
    expect(screen.getByText('3Y')).toBeInTheDocument();
  });

  test('fetches default range (1Y) data and initializes dark theme chart', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/kline?range=1Y');

    await waitFor(() => {
      expect(lightweightCharts.createChart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          layout: expect.objectContaining({
            background: expect.objectContaining({ color: '#0B0F19' }),
            textColor: '#94A3B8'
          }),
          grid: expect.objectContaining({
            vertLines: { color: '#1E293B' },
            horzLines: { color: '#1E293B' }
          })
        })
      );
    });

    expect(mockCandlestickSeries.setData).toHaveBeenCalledWith(sampleKlineResponse.candles);
    expect(mockVolumeSeries.setData).toHaveBeenCalledWith(sampleKlineResponse.volume);
  });

  test('switches range state when range button is clicked and refetches data', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    const button3M = screen.getByText('3M');

    await act(async () => {
      fireEvent.click(button3M);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/kline?range=3M');
  });

  test('cleans up chart instance on unmount', async () => {
    let unmount;
    await act(async () => {
      const rendered = render(<KlineTab symbol="AAPL" />);
      unmount = rendered.unmount;
    });

    await waitFor(() => {
      expect(lightweightCharts.createChart).toHaveBeenCalled();
    });

    act(() => {
      unmount();
    });

    expect(mockChart.remove).toHaveBeenCalled();
  });
});
