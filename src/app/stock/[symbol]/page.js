'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';
import FundamentalAnalysisChart from '../../../components/FundamentalAnalysisChart';
import NewsSentimentChart from '../../../components/NewsSentimentChart';
import FundamentalTab from './FundamentalTab';
import FinancialTrendTab from './FinancialTrendTab';
// Why: KlineTab provides TradingView interactive candlestick charts, KD indicator, and backtest sandbox.
import KlineTab from './KlineTab';
import InvestmentAdvicePanel from '../../../components/InvestmentAdvicePanel';
import HistoryTracker from '../../../components/HistoryTracker';
import WatchButton from '../../../components/WatchButton';
import { BankIcon, CandlestickIcon, DownloadIcon, DocumentTextIcon } from '../../../components/ui/Icons';

// Why: We use client-side fetching to show a loading state while the heavy analysis API runs,
// preventing the page navigation from blocking for several seconds.
export default function StockDetail({ params }) {
  const { symbol } = params;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('technical'); // 'technical' | 'fundamental' | 'news'
  const [errorMsg, setErrorMsg] = useState(null);
  // Why: resolvedName is pre-fetched via the faster /api/prices call so the page title shows the
  // Chinese company name immediately, without waiting for the slower /api/analyze to complete.
  const [resolvedName, setResolvedName] = useState(symbol);

  // Fast name resolution: /api/prices is much faster than /api/analyze because it skips the full AI pipeline.
  // We fire this first so the h1 renders with the Chinese name as early as possible.
  useEffect(() => {
    // Also try localStorage recent searches as an instant source (zero network cost)
    try {
      const stored = localStorage.getItem('antigravity_recent_stocks');
      if (stored) {
        const parsed = JSON.parse(stored);
        const match = Array.isArray(parsed) && parsed.find(s => s.symbol === symbol);
        const isTW = symbol.endsWith('.TW') || symbol.endsWith('.TWO');
        const isChineseName = match?.name && !/^[A-Za-z0-9 .,&()'-]+$/.test(match.name);
        if (match && (!isTW || isChineseName)) {
          setResolvedName(match.name);
        }
      }
    } catch (_) {}

    // Network fetch for the name via the lightweight prices endpoint
    fetch(`/api/prices?symbols=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(data => {
        const priceData = data[symbol] || data[symbol.toUpperCase()];
        if (priceData?.name) {
          const isTW = symbol.endsWith('.TW') || symbol.endsWith('.TWO');
          const isChineseName = !/^[A-Za-z0-9 .,&()'-]+$/.test(priceData.name);
          // For TW stocks only accept Chinese names; for US stocks accept any name
          if (!isTW || isChineseName) {
            setResolvedName(priceData.name);
          }
        }
      })
      .catch(() => {}); // Fail silently — the full analysis will fill in the name later
  }, [symbol]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/analyze?symbol=${symbol}`);
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch analysis');
        }
        
        setData(json);
        // Why: Update resolvedName from analysis data (most authoritative source)
        if (json.name && json.name !== symbol) {
          const isTW = symbol.endsWith('.TW') || symbol.endsWith('.TWO');
          const isChineseName = !/^[A-Za-z0-9 .,&()'-]+$/.test(json.name);
          if (!isTW || isChineseName) {
            setResolvedName(json.name);
          }
        }
      } catch (err) {
        console.error(`Error loading analysis for ${symbol}:`, err);
        setErrorMsg(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [symbol]);

  if (errorMsg) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-24 flex flex-col items-center justify-center">
          <div className="border border-red-900 bg-red-950/20 rounded-2xl p-8 max-w-md text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">無法載入分析數據</h2>
            <p className="text-sm text-slate-400 mb-6">{errorMsg}</p>
            <Link href="/" className="inline-block rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors">
              返回首頁
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const changeColor = data && data.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const changeSign = data && data.changePercent >= 0 ? '+' : '';

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
            ← 返回市場看板
          </Link>
          
          <div className="flex items-center gap-3">
            <a
              href={`/api/report?symbol=${symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0B0F19] hover:bg-[#0E1524] px-4 py-2 text-xs font-semibold text-slate-200 hover:text-cyan-300 hover:border-cyan-500/40 transition-all shadow-sm"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>下載 HTML 報告</span>
            </a>
          </div>
        </div>

        {/* Stock Headline Meta */}
        <div className="border border-slate-900 bg-slate-900/10 rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">個股智能分析看板</div>
            <div className="flex items-baseline gap-3 mt-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                {resolvedName !== symbol ? `${resolvedName} (${symbol})` : symbol}
              </h1>
              <WatchButton symbol={symbol} />
              {data && <span className="text-sm text-slate-400 font-mono">系統分析時間: {data.date}</span>}
            </div>
          </div>
          
          {data && (
            <div className="text-right sm:text-left">
              <div className="text-3xl font-extrabold text-slate-100 font-mono tabular-nums tracking-tight">
                ${data.price.toFixed(2)}
              </div>
              <div className={`text-sm font-bold font-mono tabular-nums ${changeColor} mt-1`}>
                {changeSign}{data.changePercent.toFixed(2)}% (本日)
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col justify-center items-center py-32 space-y-6">
            <svg className="animate-spin h-12 w-12 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-slate-400 text-lg font-medium tracking-wide animate-pulse">
              正在即時為您運算量化分析報告...
            </div>
          </div>
        )}

        {/* Generated Report Content */}
        {data && (
          <>
            {/* 3 Unified Tabs Navigation */}
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-8 p-1.5 border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl backdrop-blur-md w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('technical')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'technical'
                    ? 'bg-cyan-500/15 text-cyan-300 shadow-md shadow-cyan-500/10 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <CandlestickIcon className="w-4 h-4 text-cyan-400" />
                <span>技術看盤與量化決策</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fundamental')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'fundamental'
                    ? 'bg-cyan-500/15 text-cyan-300 shadow-md shadow-cyan-500/10 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <BankIcon className="w-4 h-4 text-cyan-400" />
                <span>基本面與財務趨勢</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('news')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'news'
                    ? 'bg-cyan-500/15 text-cyan-300 shadow-md shadow-cyan-500/10 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4 text-cyan-400" />
                <span>市場輿情與動態</span>
              </button>
            </div>

            {/* Tab 1: 技術看盤與量化決策 (TradingView + 量化診斷 + 投資建議面板) */}
            {activeTab === 'technical' && (
              <div className="space-y-8 animate-fadeIn">
                {/* 1. Interactive TradingView Candlestick & KD Sub-Chart & Quantitative Diagnostics */}
                <KlineTab symbol={symbol} />

                {/* 2. Advisory Decision & Risk Control Panel */}
                <InvestmentAdvicePanel advice={data.advice} />
              </div>
            )}

            {/* Tab 2: 基本面與財務趨勢 (五維雷達圖 + Gemini 護城河研報 + 5年財務演變) */}
            {activeTab === 'fundamental' && (
              <div className="space-y-8 animate-fadeIn">
                {/* 1. Five-Dimension Fundamental Health Spider Radar Chart */}
                <div className="border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl p-6 shadow-xl">
                  <FundamentalAnalysisChart 
                    widgetId="fundamental"
                    fundamentalData={data.fundamental} 
                    symbol={data.symbol} 
                  />
                </div>

                {/* 2. Wall Street Senior Fundamental Analysis (Gemini AI) */}
                <FundamentalTab symbol={symbol} />

                {/* 3. 5-Year Financial Trend Dynamics Breakdown (Gemini AI) */}
                <FinancialTrendTab symbol={symbol} />
              </div>
            )}

            {/* Tab 3: 市場輿情與動態 (社群新聞情緒 + 重大事件) */}
            {activeTab === 'news' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border border-slate-800/80 bg-[#0B0F19]/80 rounded-2xl p-6 shadow-xl">
                  <NewsSentimentChart 
                    widgetId="news"
                    newsData={data.news} 
                    symbol={data.symbol} 
                  />
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* History Tracker */}
      {data && <HistoryTracker symbol={symbol} name={data.name} />}
    </div>
  );
}
