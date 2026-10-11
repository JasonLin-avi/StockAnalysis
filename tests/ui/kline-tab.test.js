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

// Mock react-markdown and remark-gfm modules for Jest ESM compatibility
jest.mock('react-markdown', () => {
  const MockMarkdown = ({ children }) => <div>{children}</div>;
  MockMarkdown.displayName = 'MockMarkdown';
  return MockMarkdown;
});
jest.mock('remark-gfm', () => ({}));

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
  let mockMainChart;
  let mockKdChart;
  let mockCandlestickSeries;
  let mockMaSeries;
  let mockVolumeSeries;
  let mockKSeries;
  let mockDSeries;
  let mockTimeScale;

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
    ma60: [{ time: '2026-01-01', value: 140 }],
    kd: {
      k: [{ time: '2026-01-01', value: 50 }, { time: '2026-01-02', value: 65.4 }],
      d: [{ time: '2026-01-01', value: 50 }, { time: '2026-01-02', value: 70.2 }]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCandlestickSeries = { setData: jest.fn(), createPriceLine: jest.fn() };
    mockMaSeries = { setData: jest.fn(), createPriceLine: jest.fn() };
    mockVolumeSeries = { setData: jest.fn(), createPriceLine: jest.fn() };
    mockKSeries = { setData: jest.fn(), createPriceLine: jest.fn() };
    mockDSeries = { setData: jest.fn(), createPriceLine: jest.fn() };

    mockTimeScale = {
      fitContent: jest.fn(),
      subscribeVisibleLogicalRangeChange: jest.fn(),
      unsubscribeVisibleLogicalRangeChange: jest.fn(),
      setVisibleLogicalRange: jest.fn()
    };

    mockMainChart = {
      addSeries: jest.fn((type, options) => {
        if (options?.upColor === '#22C55E') return mockCandlestickSeries;
        if (options?.priceFormat?.type === 'volume') return mockVolumeSeries;
        return mockMaSeries;
      }),
      addCandlestickSeries: jest.fn(() => mockCandlestickSeries),
      addLineSeries: jest.fn(() => mockMaSeries),
      addHistogramSeries: jest.fn(() => mockVolumeSeries),
      priceScale: jest.fn().mockReturnValue({ applyOptions: jest.fn() }),
      timeScale: jest.fn().mockReturnValue(mockTimeScale),
      applyOptions: jest.fn(),
      subscribeCrosshairMove: jest.fn(),
      unsubscribeCrosshairMove: jest.fn(),
      remove: jest.fn()
    };

    mockKdChart = {
      addSeries: jest.fn((type, options) => {
        if (options?.title === 'K' || options?.color === '#F59E0B') return mockKSeries;
        if (options?.title === 'D' || options?.color === '#818CF8') return mockDSeries;
        return mockKSeries;
      }),
      addLineSeries: jest.fn((options) => {
        if (options?.title === 'K' || options?.color === '#F59E0B') return mockKSeries;
        if (options?.title === 'D' || options?.color === '#818CF8') return mockDSeries;
        return mockKSeries;
      }),
      priceScale: jest.fn().mockReturnValue({ applyOptions: jest.fn() }),
      timeScale: jest.fn().mockReturnValue(mockTimeScale),
      applyOptions: jest.fn(),
      subscribeCrosshairMove: jest.fn(),
      unsubscribeCrosshairMove: jest.fn(),
      remove: jest.fn()
    };

    mockChart = mockMainChart;

    lightweightCharts.createChart.mockImplementation((container, options) => {
      if (options?.height === 140) {
        return mockKdChart;
      }
      return mockMainChart;
    });

    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('/technical-ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            symbol: 'AAPL',
            markdown: '### 🤖 15年資深量化專家 AI 深度診斷\n\n- **長線波段佈局**: 趨勢向上'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sampleKlineResponse)
      });
    });
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

    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/kline?range=1Y&interval=1d');

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

    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/kline?range=3M&interval=1d');
  });

  test('renders timeframe interval buttons (日K, 週K, 月K) and switching interval triggers fetch with &interval=1w', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    expect(screen.getByRole('button', { name: '日K' })).toBeInTheDocument();
    const weekButton = screen.getByRole('button', { name: '週K' });
    expect(weekButton).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '月K' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(weekButton);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/kline?range=1Y&interval=1w');
  });

  test('renders KD subchart title, legend, and creates KD series with price lines', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    await waitFor(() => {
      expect(screen.getByText(/KD\(9, 3, 3\)/i)).toBeInTheDocument();
    });

    // Check KD legends
    expect(screen.getByText('K')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();

    // Verify KD sub-chart was initialized with height 140
    expect(lightweightCharts.createChart).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        height: 140
      })
    );

    // Verify KD series received data
    expect(mockKSeries.setData).toHaveBeenCalled();
    expect(mockDSeries.setData).toHaveBeenCalled();

    // Verify overbought (80) and oversold (20) price lines were configured
    expect(mockKSeries.createPriceLine).toHaveBeenCalledWith(
      expect.objectContaining({ price: 80 })
    );
    expect(mockKSeries.createPriceLine).toHaveBeenCalledWith(
      expect.objectContaining({ price: 20 })
    );
  });

  test('opens ⚙️ settings popover and updates KD parameters on client side', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /⚙️|設定/i })).toBeInTheDocument();
    });

    const settingsBtn = screen.getByRole('button', { name: /⚙️|設定/i });
    await act(async () => {
      fireEvent.click(settingsBtn);
    });

    // Popover elements should now be visible
    const periodInput = screen.getByLabelText(/RSV 週期/i);
    const smoothKInput = screen.getByLabelText(/K 平滑/i);
    const smoothDInput = screen.getByLabelText(/D 平滑/i);
    const resetBtn = screen.getByRole('button', { name: /重設 \(9, 3, 3\)/i });

    expect(periodInput).toHaveValue(9);
    expect(smoothKInput).toHaveValue(3);
    expect(smoothDInput).toHaveValue(3);

    // Change RSV period to 14
    mockKSeries.setData.mockClear();
    await act(async () => {
      fireEvent.change(periodInput, { target: { value: '14' } });
    });

    // Should immediately call setData on series without server refetch
    expect(mockKSeries.setData).toHaveBeenCalled();

    // Click reset button
    await act(async () => {
      fireEvent.click(resetBtn);
    });

    expect(periodInput).toHaveValue(9);
    expect(smoothKInput).toHaveValue(3);
    expect(smoothDInput).toHaveValue(3);
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

  test('renders quantitative technical diagnosis summary panel when summary data is present', async () => {
    const responseWithSummary = {
      ...sampleKlineResponse,
      summary: {
        date: '2026-07-20',
        price_action: {
          current_close: 157,
          change_from_prev: 3,
          change_pct: 1.95,
          support_level_20d: 148,
          resistance_level_20d: 160,
          support_level_60d: 135,
          resistance_level_60d: 165
        },
        technical_indicators: {
          MA5: 155.2,
          MA20: 150.1,
          MA60: 142.5,
          trend_short_term: '多頭排列 (短均高於長均)',
          trend_long_term: '長線多頭結構 (價格在季線上方且季線走揚)',
          RSI_14: 62.4,
          KD_K: 68.5,
          KD_D: 72.1,
          KD_status: '多方控盤 (K > D)',
          MACD_status: 'DIF在訊號線上方，柱狀體擴張 (多方動能增強)'
        },
        volume_analysis: {
          current_volume: 12000,
          volume_vs_5d_avg: '爆量'
        }
      }
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responseWithSummary)
      })
    );

    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    expect(screen.getByText('🧠 量化技術診斷')).toBeInTheDocument();
    expect(screen.getByText('2026-07-20')).toBeInTheDocument();
    expect(screen.getByText('157')).toBeInTheDocument();
    expect(screen.getByText(/155.2/)).toBeInTheDocument();
    expect(screen.getByText(/150.1/)).toBeInTheDocument();
    expect(screen.getByText(/142.5/)).toBeInTheDocument();
    expect(screen.getByText(/62.4/)).toBeInTheDocument();
    expect(screen.getAllByText(/68.5/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/72.1/)[0]).toBeInTheDocument();
    expect(screen.getByText(/多方控盤/)).toBeInTheDocument();
    expect(screen.getByText(/多頭排列/)).toBeInTheDocument();
    expect(screen.getByText(/長線多頭結構/)).toBeInTheDocument();
  });

  test('does not fetch technical AI on mount until trigger button is clicked with default 30 days', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    // Verify technical-ai fetch was NOT called on mount
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/technical-ai'));

    // Select dropdown should have default value 30
    const select = screen.getByRole('combobox', { name: /參考天數/i });
    expect(select).toHaveValue('30');

    // Click trigger button
    const triggerBtn = screen.getByRole('button', { name: /🤖 執行 15年專家 AI 診斷/i });
    await act(async () => {
      fireEvent.click(triggerBtn);
    });

    // Should fetch with ?days=30
    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/technical-ai?days=30');

    await waitFor(() => {
      expect(screen.getByText(/長線波段佈局/)).toBeInTheDocument();
    });
  });

  test('supports preset dropdown selection (15 days) and triggers fetch with ?days=15', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    const select = screen.getByRole('combobox', { name: /參考天數/i });
    await act(async () => {
      fireEvent.change(select, { target: { value: '15' } });
    });

    const triggerBtn = screen.getByRole('button', { name: /🤖 執行 15年專家 AI 診斷/i });
    await act(async () => {
      fireEvent.click(triggerBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/technical-ai?days=15');
  });

  test('supports custom days input with clamping (5-120)', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    const select = screen.getByRole('combobox', { name: /參考天數/i });
    await act(async () => {
      fireEvent.change(select, { target: { value: 'custom' } });
    });

    // Custom input should be visible
    const input = screen.getByRole('spinbutton', { name: /自訂天數/i });
    expect(input).toBeInTheDocument();

    // Type 45 days
    await act(async () => {
      fireEvent.change(input, { target: { value: '45' } });
    });

    const triggerBtn = screen.getByRole('button', { name: /🤖 執行 15年專家 AI 診斷/i });
    await act(async () => {
      fireEvent.click(triggerBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/technical-ai?days=45');

    // Test clamped value below 5 (e.g. 2 -> clamped to 5)
    await act(async () => {
      fireEvent.change(input, { target: { value: '2' } });
    });
    await act(async () => {
      fireEvent.click(triggerBtn);
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/technical-ai?days=5');

    // Test clamped value above 120 (e.g. 200 -> clamped to 120)
    await act(async () => {
      fireEvent.change(input, { target: { value: '200' } });
    });
    await act(async () => {
      fireEvent.click(triggerBtn);
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/stock/AAPL/technical-ai?days=120');
  });

  test('renders sub-tabs and switches between AI technical summary and embedded backtest sandbox panel', async () => {
    await act(async () => {
      render(<KlineTab symbol="AAPL" />);
    });

    // Verify sub-tab buttons render
    const aiSummaryTabBtn = screen.getByRole('button', { name: /當前 AI 技術面解讀/i });
    const backtestSandboxTabBtn = screen.getByRole('button', { name: /歷史時點模擬與回測沙盒/i });
    expect(aiSummaryTabBtn).toBeInTheDocument();
    expect(backtestSandboxTabBtn).toBeInTheDocument();

    // Default active tab should show TechnicalAISummaryPanel content
    expect(screen.getAllByText(/15年資深量化專家 AI 深度診斷/i)[0]).toBeInTheDocument();
    expect(screen.queryByText(/歷史時點 AI 技術回測沙盒/i)).not.toBeInTheDocument();

    // Switch to backtest sandbox tab
    await act(async () => {
      fireEvent.click(backtestSandboxTabBtn);
    });

    // Backtest sandbox panel content should now be rendered
    expect(screen.getByText(/歷史時點 AI 技術回測沙盒 \(AAPL\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/歷史基準日/i)).toBeInTheDocument();

    // Switch back to AI summary tab
    await act(async () => {
      fireEvent.click(aiSummaryTabBtn);
    });

    expect(screen.getAllByText(/15年資深量化專家 AI 深度診斷/i)[0]).toBeInTheDocument();
  });
});




