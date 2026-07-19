'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';
import TechnicalIndicatorsChart from '../../../components/TechnicalIndicatorsChart';
import FundamentalAnalysisChart from '../../../components/FundamentalAnalysisChart';
import NewsSentimentChart from '../../../components/NewsSentimentChart';
import InvestmentAdvicePanel from '../../../components/InvestmentAdvicePanel';
import CustomizableLayout from '../../../components/CustomizableLayout';
import HistoricalBacktestPanel from '../../../components/HistoricalBacktestPanel';
import HistoryTracker from '../../../components/HistoryTracker';
import WatchButton from '../../../components/WatchButton';

// Why: We use client-side fetching to show a loading state while the heavy analysis API runs,
// preventing the page navigation from blocking for several seconds.
export default function StockDetail({ params }) {
  const { symbol } = params;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Why: The user expects the analysis to execute automatically upon entering the dashboard.
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
              className="rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700 transition-all"
            >
              📄 下載 HTML 報告
            </a>
          </div>
        </div>

        {/* Stock Headline Meta */}
        <div className="border border-slate-900 bg-slate-900/10 rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">個股智能分析看板</div>
            <div className="flex items-baseline gap-3 mt-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{symbol}</h1>
              <WatchButton symbol={symbol} />
              {data && <span className="text-sm text-slate-400">系統分析時間: {data.date}</span>}
            </div>
          </div>
          
          {data && (
            <div className="text-right sm:text-left">
              <div className="text-3xl font-extrabold text-slate-100">${data.price.toFixed(2)}</div>
              <div className={`text-sm font-bold ${changeColor} mt-1`}>
                {changeSign}{data.changePercent.toFixed(2)}% (本日)
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col justify-center items-center py-32 space-y-6">
            <svg className="animate-spin h-12 w-12 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            {/* Advisory Decision Panel */}
            <InvestmentAdvicePanel advice={data.advice} />

            {/* Analytical Charts Section */}
            <CustomizableLayout>
              <TechnicalIndicatorsChart 
                widgetId="technical"
                historicalData={data.historicalData} 
                maData={data.technical.ma} 
                symbol={data.symbol} 
              />
              
              <FundamentalAnalysisChart 
                widgetId="fundamental"
                fundamentalData={data.fundamental} 
                symbol={data.symbol} 
              />
              
              <NewsSentimentChart 
                widgetId="news"
                newsData={data.news} 
                symbol={data.symbol} 
              />
            </CustomizableLayout>

            <div className="mt-8">
              <HistoricalBacktestPanel 
                backtest={data.backtest}
              />
            </div>
          </>
        )}
      </main>

      {/* Invisible History Tracker — writes this visit to localStorage so the homepage
          Recent Searches section can surface it on the next homepage load.
          Why: Only record history after a successful analysis to ensure valid data. */}
      {data && <HistoryTracker symbol={symbol} name={data.name} />}
    </div>
  );
}
