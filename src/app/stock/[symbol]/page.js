import React from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';
import TechnicalIndicatorsChart from '../../../components/TechnicalIndicatorsChart';
import FundamentalAnalysisChart from '../../../components/FundamentalAnalysisChart';
import NewsSentimentChart from '../../../components/NewsSentimentChart';
import InvestmentAdvicePanel from '../../../components/InvestmentAdvicePanel';
import CustomizableLayout from '../../../components/CustomizableLayout';
const { performFullAnalysis } = require('../../../lib/integration');

export default async function StockDetail({ params }) {
  const { symbol } = params;
  let data = null;
  let errorMsg = null;

  try {
    data = await performFullAnalysis(symbol);
  } catch (err) {
    console.error(`Error loading analysis for ${symbol}:`, err);
    errorMsg = err.message;
  }

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

  const changeColor = data.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const changeSign = data.changePercent >= 0 ? '+' : '';

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
              <span className="text-sm text-slate-400">系統分析時間: {data.date}</span>
            </div>
          </div>
          
          <div className="text-right sm:text-left">
            <div className="text-3xl font-extrabold text-slate-100">${data.price.toFixed(2)}</div>
            <div className={`text-sm font-bold ${changeColor} mt-1`}>
              {changeSign}{data.changePercent.toFixed(2)}% (本日)
            </div>
          </div>
        </div>

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
      </main>
    </div>
  );
}

