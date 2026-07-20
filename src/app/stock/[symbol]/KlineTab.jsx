/**
 * @fileoverview K-Line Technical Chart Component (TradingView lightweight-charts)
 * 
 * Why this component is designed:
 * - Uses TradingView's lightweight-charts for high-performance canvas-based financial charting.
 * - Displays Candlesticks, MA5/MA20/MA60 moving average lines, and Volume histograms.
 * - Integrates dynamic range selection ('1M', '3M', '6M', '1Y', '3Y') with auto-fetching.
 * - Ensures dark theme consistency (#0B0F19) and responsive container resizing.
 * 
 * @module components/KlineTab
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, ColorType } from 'lightweight-charts';

/**
 * KlineTab Component
 * 
 * @param {Object} props
 * @param {string} props.symbol - Stock symbol ticker (e.g. 'AAPL', '2330.TW')
 */
export default function KlineTab({ symbol }) {
  const [range, setRange] = useState('1Y');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Why: Fetch K-Line data whenever symbol or range selection changes.
  useEffect(() => {
    let isMounted = true;
    const fetchKlineData = async () => {
      if (!symbol) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/stock/${symbol}/kline?range=${range}`);
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || `HTTP ${response.status}: Failed to fetch K-Line data`);
        }

        const json = await response.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        console.error(`[KlineTab] Fetch error for ${symbol}:`, err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchKlineData();

    return () => {
      isMounted = false;
    };
  }, [symbol, range]);

  // Why: Render and manage lightweight-charts instance when data or container changes.
  useEffect(() => {
    if (!chartContainerRef.current || !data || !data.candles || data.candles.length === 0) {
      return;
    }

    // Why: Clean up previous chart instance before rendering new data series.
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;

    // Why: Dark theme styling options matching requirements (#0B0F19 background, #94A3B8 text, #1E293B grid).
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0F19' },
        textColor: '#94A3B8',
      },
      grid: {
        vertLines: { color: '#1E293B' },
        horzLines: { color: '#1E293B' },
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
      },
      rightPriceScale: {
        borderColor: '#1E293B',
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartInstanceRef.current = chart;

    // Why: Support lightweight-charts v4/v5 API gracefully.
    const addSeriesHelper = (seriesType, options) => {
      if (typeof chart.addSeries === 'function') {
        return chart.addSeries(seriesType, options);
      }
      if (seriesType === CandlestickSeries && typeof chart.addCandlestickSeries === 'function') {
        return chart.addCandlestickSeries(options);
      }
      if (seriesType === LineSeries && typeof chart.addLineSeries === 'function') {
        return chart.addLineSeries(options);
      }
      if (seriesType === HistogramSeries && typeof chart.addHistogramSeries === 'function') {
        return chart.addHistogramSeries(options);
      }
      return null;
    };

    // Why: Add Candlestick Series with specified upColor (#22C55E) and downColor (#EF4444).
    const candlestickSeries = addSeriesHelper(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    if (candlestickSeries && data.candles) {
      candlestickSeries.setData(data.candles);
    }

    // Why: Add MA5, MA20, MA60 line series to display moving average overlays.
    if (data.ma5 && data.ma5.length > 0) {
      const ma5Series = addSeriesHelper(LineSeries, {
        color: '#EAB308',
        lineWidth: 1.5,
        title: 'MA5',
      });
      if (ma5Series) ma5Series.setData(data.ma5);
    }

    if (data.ma20 && data.ma20.length > 0) {
      const ma20Series = addSeriesHelper(LineSeries, {
        color: '#3B82F6',
        lineWidth: 1.5,
        title: 'MA20',
      });
      if (ma20Series) ma20Series.setData(data.ma20);
    }

    if (data.ma60 && data.ma60.length > 0) {
      const ma60Series = addSeriesHelper(LineSeries, {
        color: '#A855F7',
        lineWidth: 1.5,
        title: 'MA60',
      });
      if (ma60Series) ma60Series.setData(data.ma60);
    }

    // Why: Add Volume Histogram series mapped to a sub-pane at the bottom 20% of the chart.
    if (data.volume && data.volume.length > 0) {
      const volumeSeries = addSeriesHelper(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // Overlay scale
      });

      if (volumeSeries) {
        chart.priceScale('').applyOptions({
          scaleMargins: {
            top: 0.8, // Position volume at the bottom 20%
            bottom: 0,
          },
        });
        volumeSeries.setData(data.volume);
      }
    }

    // Why: Fit chart content horizontally to fill visible area.
    chart.timeScale().fitContent();

    // Why: Add responsive window resize listener to maintain correct canvas width.
    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Why: Ensure complete cleanup of chart instance and window resize listener on unmount or re-render.
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  const ranges = ['1M', '3M', '6M', '1Y', '3Y'];

  return (
    <div className="w-full bg-[#0B0F19] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
      {/* Dark Card Header with Title, Legend & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-xl">📈</span> K線技術圖表 (TradingView)
            </h3>
            <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
              {symbol}
            </span>
          </div>

          {/* Indicator Legends */}
          <div className="flex flex-wrap items-center gap-4 text-xs mt-2 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]"></span> 陽線
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> 陰線
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[#EAB308]">
              <span className="w-3 h-0.5 bg-[#EAB308]"></span> MA5
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[#3B82F6]">
              <span className="w-3 h-0.5 bg-[#3B82F6]"></span> MA20
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[#A855F7]">
              <span className="w-3 h-0.5 bg-[#A855F7]"></span> MA60
            </span>
          </div>
        </div>

        {/* Range Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 border border-slate-800 rounded-xl self-start sm:self-center">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                range === r
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas Container & Loading / Error States */}
      <div className="relative w-full min-h-[480px] bg-[#0B0F19] rounded-xl overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0B0F19]/80 backdrop-blur-sm space-y-3">
            <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs text-slate-400 font-medium">加載 {symbol} ({range}) K線數據中...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-red-400 text-sm font-semibold mb-2">無法載入 K線數據</div>
            <div className="text-xs text-slate-500 max-w-md">{error}</div>
          </div>
        )}

        {!isLoading && !error && data && data.candles?.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-slate-500 text-sm">
            無可用的 K線歷史數據
          </div>
        )}

        {/* TradingView lightweight-charts container target */}
        <div ref={chartContainerRef} className="w-full h-[480px]" />
      </div>
    </div>
  );
}
