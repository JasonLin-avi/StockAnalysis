'use client';

import React, { useState } from 'react';
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

// Why: We need client-side interactivity for the manual generation button and fetching the report.
export default function StockDetail({ params }) {
  const { symbol } = params;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Why: By making generation an explicit user action, we prevent expensive back-end processing from running unconditionally on every page load.
  const handleAnalyze = async () => {
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

  if (errorMsg) {
    // Why: Do not render HistoryTracker here, because failed analysis should not pollute the user's search history.
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
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
            ← 返回市場看板
          </Link>
          
          <a
            href={`/api/report?symbol=${symbol}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700 transition-all"
          >
            📄 下載 HTML 報告
          </a>
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

        {/* Action Button Section (Visible before analysis is generated) */}
        {!data && (
          <div className="flex justify-center items-center py-12">
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 px-8 rounded-full transition-colors text-lg flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  分析中...
                </>
              ) : (
                '開始產生分析報告'
              )}
            </button>
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

              <HistoricalBacktestPanel 
                widgetId="backtest"
                backtest={data.backtest}
              />
            </CustomizableLayout>
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
