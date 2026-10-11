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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmbeddedBacktestPanel from '../../../components/backtest/EmbeddedBacktestPanel';
import { calculateKD } from '../../../lib/technical-analysis/kd';


/**
 * SummaryPanel Sub-Component
 *
 * Why: Renders a quantitative technical diagnosis panel beside the K-Line chart,
 * providing at-a-glance insights on price, moving averages, momentum, and volume.
 *
 * @param {Object} props
 * @param {Object|null} props.summary - The summary data object from the API
 * @param {boolean} props.isLoading - Whether K-Line data is still being fetched
 * @param {Object|null} props.kdLatest - Latest KD indicator metrics { k, d, status }
 * @param {Object|null} props.kdParams - Active KD parameters { period, smoothK, smoothD }
 */
function SummaryPanel({ summary, isLoading, kdLatest, kdParams }) {
  // Why: Show a pulse skeleton while the parent data fetch is in progress.
  if (isLoading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-5 flex items-center justify-center min-h-[480px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
          <span className="text-sm text-slate-400 animate-pulse">計算技術指標中...</span>
        </div>
      </div>
    );
  }

  // Why: Gracefully handle missing or insufficient data from the API.
  if (!summary) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-5 flex items-center justify-center min-h-[480px]">
        <span className="text-sm text-slate-500">數據不足，無法生成技術診斷</span>
      </div>
    );
  }

  // Why: Helper to map trend keywords to consistent color classes.
  const trendColor = (trend) => {
    if (!trend) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    if (trend.includes('多頭')) return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (trend.includes('空頭')) return 'text-red-400 bg-red-400/10 border-red-400/20';
    return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  };

  // Why: Color-code RSI by over-bought (>70) / over-sold (<30) convention.
  const rsiColor = (rsi) => {
    if (rsi == null) return 'text-slate-400';
    if (rsi > 70) return 'text-red-400';
    if (rsi < 30) return 'text-green-400';
    return 'text-slate-300';
  };

  // Why: Color-code KD status badge based on momentum signals.
  const kdStatusBadgeColor = (status) => {
    if (!status) return 'text-slate-400 bg-slate-800/60 border-slate-700';
    if (status.includes('黃金交叉') || status.includes('多方')) {
      return 'text-green-400 bg-green-400/10 border-green-400/20';
    }
    if (status.includes('死亡交叉') || status.includes('空方')) {
      return 'text-red-400 bg-red-400/10 border-red-400/20';
    }
    if (status.includes('超買')) {
      return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    }
    if (status.includes('超賣')) {
      return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
    }
    return 'text-slate-400 bg-slate-800/60 border-slate-700';
  };

  // Why: Volume comparison badge to highlight abnormal trading volume (supports both number ratios and status strings).
  const volumeBadge = (val) => {
    if (val == null) return null;
    if (typeof val === 'string') {
      const isSurge = val.includes('爆量');
      return (
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
          isSurge 
            ? 'bg-red-400/10 text-red-400 border-red-400/20 font-semibold' 
            : 'bg-slate-700/60 text-slate-400 border-slate-700'
        }`}>
          {val}
        </span>
      );
    }
    if (val >= 1.5) {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20 font-semibold">爆量</span>;
    }
    return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-700 font-medium">量能平穩</span>;
  };

  // Why: Normalize fields whether summary is returned in a nested structure (price_action, technical_indicators, volume_analysis) or flat structure.
  const priceAction = summary.price_action || {};
  const techIndicators = summary.technical_indicators || {};
  const volumeAnalysis = summary.volume_analysis || {};

  const currentClose = priceAction.current_close ?? summary.current_close;
  const changeFromPrev = priceAction.change_from_prev ?? summary.change_from_prev;
  const changePct = priceAction.change_pct ?? summary.change_pct;
  const support20d = priceAction.support_level_20d ?? summary.support_20d;
  const resistance20d = priceAction.resistance_level_20d ?? summary.resistance_20d;
  const support60d = priceAction.support_level_60d ?? summary.support_60d;
  const resistance60d = priceAction.resistance_level_60d ?? summary.resistance_60d;

  const ma5Value = techIndicators.MA5 ?? summary.ma5_value;
  const ma20Value = techIndicators.MA20 ?? summary.ma20_value;
  const ma60Value = techIndicators.MA60 ?? summary.ma60_value;
  const shortTermTrend = techIndicators.trend_short_term ?? summary.short_term_trend;
  const longTermTrend = techIndicators.trend_long_term ?? summary.long_term_trend;
  const rsi14 = techIndicators.RSI_14 ?? summary.rsi_14;
  const macdStatus = techIndicators.MACD_status ?? summary.macd_status;

  const isCustomized = Boolean(kdParams?.isCustomized);
  const kdK = (isCustomized ? kdLatest?.k : (techIndicators.KD_K ?? kdLatest?.k)) ?? summary.kd_k;
  const kdD = (isCustomized ? kdLatest?.d : (techIndicators.KD_D ?? kdLatest?.d)) ?? summary.kd_d;
  const kdStatus = (isCustomized ? kdLatest?.status : (techIndicators.KD_status ?? kdLatest?.status)) ?? summary.kd_status;
  const kdPeriod = kdParams?.period ?? 9;
  const kdSmoothK = kdParams?.smoothK ?? 3;
  const kdSmoothD = kdParams?.smoothD ?? 3;

  const currentVolume = volumeAnalysis.current_volume ?? summary.current_volume;
  const volumeVs5dAvg = volumeAnalysis.volume_vs_5d_avg ?? summary.volume_vs_5d_avg;

  const changeColor = changePct > 0 ? 'text-green-400' : changePct < 0 ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-5 space-y-5 min-h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
          🧠 量化技術診斷
        </h4>
        {summary.date && (
          <span className="text-[11px] text-slate-500 font-mono">{summary.date}</span>
        )}
      </div>

      {/* Section A: 收盤價 & 支撐壓力 */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">收盤價 & 支撐壓力</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100">{currentClose != null ? currentClose.toLocaleString() : '—'}</span>
          {changeFromPrev != null && (
            <span className={`text-sm font-semibold ${changeColor}`}>
              {changeFromPrev > 0 ? '+' : ''}{changeFromPrev?.toFixed(2)}
              {changePct != null && (
                <span className="ml-1 text-xs">({changePct > 0 ? '+' : ''}{changePct?.toFixed(2)}%)</span>
              )}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-slate-500 mb-0.5">20日支撐</div>
            <div className="text-slate-200 font-semibold">{support20d != null ? support20d.toLocaleString() : '—'}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-slate-500 mb-0.5">20日壓力</div>
            <div className="text-slate-200 font-semibold">{resistance20d != null ? resistance20d.toLocaleString() : '—'}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-slate-500 mb-0.5">60日支撐</div>
            <div className="text-slate-200 font-semibold">{support60d != null ? support60d.toLocaleString() : '—'}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-slate-500 mb-0.5">60日壓力</div>
            <div className="text-slate-200 font-semibold">{resistance60d != null ? resistance60d.toLocaleString() : '—'}</div>
          </div>
        </div>
      </div>

      {/* Section B: 均線與趨勢 */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">均線與趨勢</div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAB308]/10 text-[#EAB308] border border-[#EAB308]/20 font-semibold">
            MA5: {ma5Value != null ? ma5Value.toFixed(2) : '—'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 font-semibold">
            MA20: {ma20Value != null ? ma20Value.toFixed(2) : '—'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20 font-semibold">
            MA60: {ma60Value != null ? ma60Value.toFixed(2) : '—'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {shortTermTrend && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${trendColor(shortTermTrend)}`}>
              短期: {shortTermTrend}
            </span>
          )}
          {longTermTrend && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${trendColor(longTermTrend)}`}>
              長期: {longTermTrend}
            </span>
          )}
        </div>
      </div>

      {/* Section C: 動能指標 */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">動能指標</div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div>
            <span className="text-slate-500 text-xs mr-1">RSI(14):</span>
            <span className={`font-bold ${rsiColor(rsi14)}`}>
              {rsi14 != null ? rsi14.toFixed(1) : '—'}
            </span>
          </div>
          {(kdK != null || techIndicators.KD_K != null) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 text-xs">KD({kdPeriod}, {kdSmoothK}, {kdSmoothD}):</span>
              <span className="font-bold text-[#F59E0B]">
                K {Number(kdK ?? techIndicators.KD_K).toFixed(1)}
              </span>
              <span className="text-slate-500">/</span>
              <span className="font-bold text-[#818CF8]">
                D {Number(kdD ?? techIndicators.KD_D).toFixed(1)}
              </span>
            </div>
          )}
        </div>
        {kdStatus && (
          <div className="flex items-center gap-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${kdStatusBadgeColor(kdStatus)}`}>
              {kdStatus}
            </span>
          </div>
        )}
        {macdStatus && (
          <div className="text-xs text-slate-400">
            <span className="text-slate-500 mr-1">MACD:</span>
            {macdStatus}
          </div>
        )}
      </div>

      {/* Section D: 量能分析 */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">量能分析</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-200 font-semibold">
            {currentVolume != null ? currentVolume.toLocaleString() : '—'}
          </span>
          {volumeBadge(volumeVs5dAvg)}
        </div>
      </div>
    </div>
  );
}

/**
 * KlineTab Component
 * 
 * @param {Object} props
 * @param {string} props.symbol - Stock symbol ticker (e.g. 'AAPL', '2330.TW')
 */
export default function KlineTab({ symbol }) {
  const [range, setRange] = useState('1Y');
  const [interval, setInterval] = useState('1d'); // '1d' | '1w' | '1mo'
  const [middleTab, setMiddleTab] = useState('ai_summary'); // 'ai_summary' | 'backtest_sandbox'
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // KD parameters & interactive states
  const [kdPeriod, setKdPeriod] = useState(9);
  const [kdSmoothK, setKdSmoothK] = useState(3);
  const [kdSmoothD, setKdSmoothD] = useState(3);
  const [showKdSettings, setShowKdSettings] = useState(false);
  const [hoverKd, setHoverKd] = useState(null);
  const [kdLatest, setKdLatest] = useState(null);

  const mainChartContainerRef = useRef(null);
  const kdChartContainerRef = useRef(null);
  const mainChartInstanceRef = useRef(null);
  const kdChartInstanceRef = useRef(null);
  const kSeriesRef = useRef(null);
  const dSeriesRef = useRef(null);
  const isSyncingRef = useRef(false);
  const kdMapRef = useRef(new Map());

  // Why: Fetch K-Line data whenever symbol, range, or interval selection changes.
  useEffect(() => {
    let isMounted = true;
    const fetchKlineData = async () => {
      if (!symbol) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/stock/${symbol}/kline?range=${range}&interval=${interval}`);
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
  }, [symbol, range, interval]);

  // Why: Render and synchronize Main Chart (Height 380px) and KD Sub-Chart (Height 140px).
  useEffect(() => {
    if (
      !mainChartContainerRef.current ||
      !kdChartContainerRef.current ||
      !data ||
      !data.candles ||
      data.candles.length === 0
    ) {
      return;
    }

    // Why: Clean up previous chart instances before rendering new data series.
    if (mainChartInstanceRef.current) {
      mainChartInstanceRef.current.remove();
      mainChartInstanceRef.current = null;
    }
    if (kdChartInstanceRef.current) {
      kdChartInstanceRef.current.remove();
      kdChartInstanceRef.current = null;
    }

    const mainContainer = mainChartContainerRef.current;
    const kdContainer = kdChartContainerRef.current;

    // Why: Dark theme styling options matching requirements (#0B0F19 background, #94A3B8 text, #1E293B grid).
    const mainChart = createChart(mainContainer, {
      width: mainContainer.clientWidth,
      height: 380,
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
    mainChartInstanceRef.current = mainChart;

    const kdChart = createChart(kdContainer, {
      width: kdContainer.clientWidth,
      height: 140,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0F19' },
        textColor: '#94A3B8',
      },
      grid: {
        vertLines: { color: '#1E293B' },
        horzLines: { color: '#1E293B' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: false,
      },
    });
    kdChartInstanceRef.current = kdChart;

    // Why: Support lightweight-charts v4/v5 API gracefully across both chart panes.
    const addSeriesHelper = (chart, seriesType, options) => {
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

    // --- Main Chart Series ---
    const candlestickSeries = addSeriesHelper(mainChart, CandlestickSeries, {
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

    if (data.ma5 && data.ma5.length > 0) {
      const ma5Series = addSeriesHelper(mainChart, LineSeries, {
        color: '#EAB308',
        lineWidth: 1.5,
        title: 'MA5',
      });
      if (ma5Series) ma5Series.setData(data.ma5);
    }

    if (data.ma20 && data.ma20.length > 0) {
      const ma20Series = addSeriesHelper(mainChart, LineSeries, {
        color: '#3B82F6',
        lineWidth: 1.5,
        title: 'MA20',
      });
      if (ma20Series) ma20Series.setData(data.ma20);
    }

    if (data.ma60 && data.ma60.length > 0) {
      const ma60Series = addSeriesHelper(mainChart, LineSeries, {
        color: '#A855F7',
        lineWidth: 1.5,
        title: 'MA60',
      });
      if (ma60Series) ma60Series.setData(data.ma60);
    }

    if (data.volume && data.volume.length > 0) {
      const volumeSeries = addSeriesHelper(mainChart, HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // Overlay scale
      });

      if (volumeSeries) {
        if (typeof mainChart.priceScale === 'function') {
          mainChart.priceScale('').applyOptions({
            scaleMargins: {
              top: 0.8, // Position volume at the bottom 20%
              bottom: 0,
            },
          });
        }
        volumeSeries.setData(data.volume);
      }
    }

    // --- KD Sub-Chart Series ---
    const kSeries = addSeriesHelper(kdChart, LineSeries, {
      color: '#F59E0B',
      lineWidth: 1.5,
      title: 'K',
    });

    const dSeries = addSeriesHelper(kdChart, LineSeries, {
      color: '#818CF8',
      lineWidth: 1.5,
      title: 'D',
    });

    kSeriesRef.current = kSeries;
    dSeriesRef.current = dSeries;

    // Why: Add overbought (80) and oversold (20) horizontal reference lines.
    if (kSeries && typeof kSeries.createPriceLine === 'function') {
      kSeries.createPriceLine({
        price: 80,
        color: '#EF4444',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '80',
      });
      kSeries.createPriceLine({
        price: 20,
        color: '#22C55E',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '20',
      });
    }

    // Why: Calculate KD series over candles using active parameters.
    const p = Math.max(2, Math.min(60, Number(kdPeriod) || 9));
    const sk = Math.max(1, Math.min(20, Number(kdSmoothK) || 3));
    const sd = Math.max(1, Math.min(20, Number(kdSmoothD) || 3));
    const kdResult = calculateKD(data.candles, p, sk, sd);

    if (kSeries && typeof kSeries.setData === 'function') {
      kSeries.setData(kdResult.k);
    }
    if (dSeries && typeof dSeries.setData === 'function') {
      dSeries.setData(kdResult.d);
    }
    setKdLatest(kdResult.latest);

    // Why: Cache time -> KD values in ref Map for O(1) hover lookup.
    const map = new Map();
    for (let i = 0; i < kdResult.k.length; i++) {
      map.set(kdResult.k[i].time, {
        k: kdResult.k[i].value,
        d: kdResult.d[i]?.value ?? kdResult.k[i].value,
      });
    }
    kdMapRef.current = map;

    mainChart.timeScale().fitContent();
    kdChart.timeScale().fitContent();

    // Why: TimeScale bidirectional synchronization with isSyncingRef guard to prevent recursion.
    const mainTimeScale = mainChart.timeScale();
    const kdTimeScale = kdChart.timeScale();

    const syncMainToKd = (logicalRange) => {
      if (isSyncingRef.current || !logicalRange) return;
      isSyncingRef.current = true;
      if (typeof kdTimeScale.setVisibleLogicalRange === 'function') {
        kdTimeScale.setVisibleLogicalRange(logicalRange);
      }
      isSyncingRef.current = false;
    };

    const syncKdToMain = (logicalRange) => {
      if (isSyncingRef.current || !logicalRange) return;
      isSyncingRef.current = true;
      if (typeof mainTimeScale.setVisibleLogicalRange === 'function') {
        mainTimeScale.setVisibleLogicalRange(logicalRange);
      }
      isSyncingRef.current = false;
    };

    if (typeof mainTimeScale.subscribeVisibleLogicalRangeChange === 'function') {
      mainTimeScale.subscribeVisibleLogicalRangeChange(syncMainToKd);
    }
    if (typeof kdTimeScale.subscribeVisibleLogicalRangeChange === 'function') {
      kdTimeScale.subscribeVisibleLogicalRangeChange(syncKdToMain);
    }

    // Why: Synchronize crosshair hover display for real-time K/D value readout.
    const handleCrosshairMove = (param) => {
      if (!param || !param.time) {
        setHoverKd(null);
        return;
      }
      const timeStr = typeof param.time === 'string'
        ? param.time
        : (param.time.year ? `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day).padStart(2, '0')}` : String(param.time));
      const point = kdMapRef.current.get(timeStr);
      setHoverKd(point || null);
    };

    if (typeof mainChart.subscribeCrosshairMove === 'function') {
      mainChart.subscribeCrosshairMove(handleCrosshairMove);
    }
    if (typeof kdChart.subscribeCrosshairMove === 'function') {
      kdChart.subscribeCrosshairMove(handleCrosshairMove);
    }

    // Why: Add responsive window resize listener to maintain correct canvas width for both panes.
    const handleResize = () => {
      if (mainChartContainerRef.current && mainChartInstanceRef.current) {
        mainChartInstanceRef.current.applyOptions({
          width: mainChartContainerRef.current.clientWidth,
        });
      }
      if (kdChartContainerRef.current && kdChartInstanceRef.current) {
        kdChartInstanceRef.current.applyOptions({
          width: kdChartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Why: Ensure complete cleanup of chart instances, event listeners, and timeScale subscriptions.
    return () => {
      window.removeEventListener('resize', handleResize);
      if (typeof mainTimeScale.unsubscribeVisibleLogicalRangeChange === 'function') {
        mainTimeScale.unsubscribeVisibleLogicalRangeChange(syncMainToKd);
      }
      if (typeof kdTimeScale.unsubscribeVisibleLogicalRangeChange === 'function') {
        kdTimeScale.unsubscribeVisibleLogicalRangeChange(syncKdToMain);
      }
      if (typeof mainChart.unsubscribeCrosshairMove === 'function') {
        mainChart.unsubscribeCrosshairMove(handleCrosshairMove);
      }
      if (typeof kdChart.unsubscribeCrosshairMove === 'function') {
        kdChart.unsubscribeCrosshairMove(handleCrosshairMove);
      }
      if (mainChartInstanceRef.current) {
        mainChartInstanceRef.current.remove();
        mainChartInstanceRef.current = null;
      }
      if (kdChartInstanceRef.current) {
        kdChartInstanceRef.current.remove();
        kdChartInstanceRef.current = null;
      }
    };
  }, [data]);

  // Why: Instant client-side recalculation of KD series when parameters change (0ms latency).
  const updateKDData = (period, smoothK, smoothD) => {
    if (!data?.candles || data.candles.length === 0) return;
    const p = Math.max(2, Math.min(60, Number(period) || 9));
    const sk = Math.max(1, Math.min(20, Number(smoothK) || 3));
    const sd = Math.max(1, Math.min(20, Number(smoothD) || 3));

    const kdResult = calculateKD(data.candles, p, sk, sd);
    if (kSeriesRef.current && typeof kSeriesRef.current.setData === 'function') {
      kSeriesRef.current.setData(kdResult.k);
    }
    if (dSeriesRef.current && typeof dSeriesRef.current.setData === 'function') {
      dSeriesRef.current.setData(kdResult.d);
    }
    setKdLatest(kdResult.latest);

    const map = new Map();
    for (let i = 0; i < kdResult.k.length; i++) {
      map.set(kdResult.k[i].time, {
        k: kdResult.k[i].value,
        d: kdResult.d[i]?.value ?? kdResult.k[i].value,
      });
    }
    kdMapRef.current = map;
  };

  const handlePeriodChange = (e) => {
    const val = e.target.value;
    setKdPeriod(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      updateKDData(num, kdSmoothK, kdSmoothD);
    }
  };

  const handleSmoothKChange = (e) => {
    const val = e.target.value;
    setKdSmoothK(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      updateKDData(kdPeriod, num, kdSmoothD);
    }
  };

  const handleSmoothDChange = (e) => {
    const val = e.target.value;
    setKdSmoothD(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      updateKDData(kdPeriod, kdSmoothK, num);
    }
  };

  const handleResetKD = () => {
    setKdPeriod(9);
    setKdSmoothK(3);
    setKdSmoothD(3);
    updateKDData(9, 3, 3);
  };

  const intervals = [
    { label: '日K', value: '1d' },
    { label: '週K', value: '1w' },
    { label: '月K', value: '1mo' },
  ];
  const ranges = ['1M', '3M', '6M', '1Y', '3Y'];

  const isKdCustomized = Number(kdPeriod) !== 9 || Number(kdSmoothK) !== 3 || Number(kdSmoothD) !== 3;
  const defaultHeaderK = data?.summary?.technical_indicators?.KD_K ?? kdLatest?.k ?? 50;
  const defaultHeaderD = data?.summary?.technical_indicators?.KD_D ?? kdLatest?.d ?? 50;
  const displayK = hoverKd ? hoverKd.k : (isKdCustomized ? (kdLatest?.k ?? 50) : defaultHeaderK);
  const displayD = hoverKd ? hoverKd.d : (isKdCustomized ? (kdLatest?.d ?? 50) : defaultHeaderD);

  return (
    <div className="w-full space-y-4">
      {/* Full-width Header Card with Title, Legend & Interval/Range Selectors */}
      <div className="w-full bg-[#0B0F19] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

          {/* Timeframe Interval & Range Selector Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Interval Selector: 日K / 週K / 月K */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 border border-slate-800 rounded-xl">
              {intervals.map((it) => (
                <button
                  key={it.value}
                  type="button"
                  onClick={() => setInterval(it.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    interval === it.value
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>

            {/* Range Selector: 1M / 3M / 6M / 1Y / 3Y */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 border border-slate-800 rounded-xl">
              {ranges.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
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
        </div>
      </div>

      {/* 2:1 Grid — Chart (left) + Summary Panel (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Chart Container (2/3 width on lg) */}
        <div className="lg:col-span-2">
          <div className="relative w-full bg-[#0B0F19] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
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

            {/* Main TradingView lightweight-charts container target (Height 380px) */}
            <div ref={mainChartContainerRef} className="w-full h-[380px]" />

            {/* KD Sub-Chart Header with Title, Legends, Hover Display, and Settings Popover */}
            <div className="relative flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-900/80 border-t border-b border-slate-800 text-xs text-slate-300 gap-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-200">
                  KD({kdPeriod}, {kdSmoothK}, {kdSmoothD})
                </span>
                <span className="flex items-center gap-1 font-semibold text-[#F59E0B]">
                  <span className="w-2.5 h-0.5 bg-[#F59E0B]"></span> K
                </span>
                <span className="flex items-center gap-1 font-semibold text-[#818CF8]">
                  <span className="w-2.5 h-0.5 bg-[#818CF8]"></span> D
                </span>
                <span className="font-mono text-slate-400">
                  K: <span className="text-[#F59E0B] font-bold">{Number(displayK).toFixed(1)}</span>
                  {' | '}
                  D: <span className="text-[#818CF8] font-bold">{Number(displayD).toFixed(1)}</span>
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowKdSettings(!showKdSettings)}
                  aria-label="KD 設定"
                  title="KD 指標設定"
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  <span>⚙️</span> 設定
                </button>

                {showKdSettings && (
                  <div className="absolute right-0 top-7 z-30 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-2.5 min-w-[200px]">
                    <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 flex justify-between items-center">
                      <span>KD 參數設定</span>
                      <button
                        type="button"
                        onClick={() => setShowKdSettings(false)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="kd-period-input" className="text-slate-400">
                        RSV 週期
                      </label>
                      <input
                        id="kd-period-input"
                        type="number"
                        min={2}
                        max={60}
                        value={kdPeriod}
                        onChange={handlePeriodChange}
                        aria-label="RSV 週期"
                        className="w-16 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="kd-smoothk-input" className="text-slate-400">
                        K 平滑
                      </label>
                      <input
                        id="kd-smoothk-input"
                        type="number"
                        min={1}
                        max={20}
                        value={kdSmoothK}
                        onChange={handleSmoothKChange}
                        aria-label="K 平滑"
                        className="w-16 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="kd-smoothd-input" className="text-slate-400">
                        D 平滑
                      </label>
                      <input
                        id="kd-smoothd-input"
                        type="number"
                        min={1}
                        max={20}
                        value={kdSmoothD}
                        onChange={handleSmoothDChange}
                        aria-label="D 平滑"
                        className="w-16 bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleResetKD}
                      className="w-full mt-1 px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      重設 (9, 3, 3)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Aligned KD Sub-Chart target (Height 140px) */}
            <div ref={kdChartContainerRef} className="w-full h-[140px]" />
          </div>
        </div>

        {/* Right: Quant AI Summary Panel (1/3 width on lg) */}
        <div className="lg:col-span-1">
          <SummaryPanel
            summary={data?.summary}
            isLoading={isLoading}
            kdLatest={kdLatest}
            kdParams={{ period: kdPeriod, smoothK: kdSmoothK, smoothD: kdSmoothD, isCustomized: isKdCustomized }}
          />
        </div>
      </div>

      {/* Section 2: Sub-Tabs for Current AI Technical Interpretation & Backtest Sandbox */}
      <div className="space-y-4 mt-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setMiddleTab('ai_summary')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              middleTab === 'ai_summary'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>🤖</span> 當前 AI 技術面解讀
          </button>
          <button
            type="button"
            onClick={() => setMiddleTab('backtest_sandbox')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              middleTab === 'backtest_sandbox'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>⏳</span> 歷史時點模擬與回測沙盒
          </button>
        </div>

        {middleTab === 'ai_summary' ? (
          <TechnicalAISummaryPanel symbol={symbol} />
        ) : (
          <EmbeddedBacktestPanel symbol={symbol} />
        )}
      </div>
    </div>
  );
}

/**
 * TechnicalAISummaryPanel Sub-Component
 *
 * Why: Allows users to select reference days (15, 30, 60, custom 5-120) and manually
 * trigger LLM (Gemini) time-series AI technical diagnosis for the specified stock symbol.
 *
 * @param {Object} props
 * @param {string} props.symbol - Stock symbol ticker
 */
function TechnicalAISummaryPanel({ symbol }) {
  const [presetDays, setPresetDays] = useState('30');
  const [customDays, setCustomDays] = useState(30);
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState(null);

  // Why: Calculate active days clamped between 5 and 120.
  const getActiveDays = () => {
    if (presetDays !== 'custom') {
      return Number(presetDays);
    }
    const parsed = parseInt(customDays, 10);
    if (isNaN(parsed)) return 30;
    return Math.max(5, Math.min(120, parsed));
  };

  // Why: Fetch time-series AI technical summary on manual button click only.
  const handleTriggerAI = async () => {
    if (!symbol || isLoading) return;
    const activeDays = getActiveDays();
    setIsLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const response = await fetch(`/api/stock/${symbol}/technical-ai?days=${activeDays}`);
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: 無法獲取 AI 技術診斷報告`);
      }

      const json = await response.json();
      setMarkdown(json.markdown || '');
    } catch (err) {
      console.error(`[TechnicalAISummaryPanel] Fetch error for ${symbol}:`, err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-slate-900 bg-slate-900/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-lg font-bold text-slate-100">{symbol} 15年資深量化專家 AI 深度診斷</h3>
            <p className="text-xs text-slate-500">由 Google Gemini 結合長短線量化指標特徵分析生成</p>
          </div>
        </div>
        
        {/* Days Selector Controls & Manual Trigger Button */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <label htmlFor="days-select" className="text-xs text-slate-400 font-medium">
              參考天數
            </label>
            <select
              id="days-select"
              aria-label="參考天數"
              value={presetDays}
              onChange={(e) => setPresetDays(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="15">15 天</option>
              <option value="30">30 天 (預設)</option>
              <option value="60">60 天</option>
              <option value="custom">自訂</option>
            </select>

            {presetDays === 'custom' && (
              <input
                type="number"
                aria-label="自訂天數"
                min={5}
                max={120}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="5-120"
                className="w-16 bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>

          <button
            type="button"
            onClick={handleTriggerAI}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            🤖 執行 15年專家 AI 診斷
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-slate-400 font-medium animate-pulse">
            AI 量化專家正在對 {symbol} 進行 {getActiveDays()} 天時態數據與 K 線指標深度分析...
          </span>
        </div>
      )}

      {error && !isLoading && (
        <div className="border border-red-900/50 bg-red-950/20 rounded-2xl p-8 text-center">
          <div className="text-red-400 text-sm font-semibold mb-1">無法載入 AI 技術診斷報告</div>
          <div className="text-xs text-slate-400">{error}</div>
        </div>
      )}

      {!isLoading && !error && hasFetched && markdown && (
        <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed space-y-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      )}

      {!isLoading && !error && !hasFetched && (
        <div className="text-center py-10 text-slate-500 text-sm font-medium border border-dashed border-slate-800 rounded-xl">
          請選擇參考天數並點擊「🤖 執行 15年專家 AI 診斷」開始生成分析報告
        </div>
      )}
    </div>
  );
}

