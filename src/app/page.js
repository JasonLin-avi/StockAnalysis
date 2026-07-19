import React from 'react';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import PopularStocks from '../components/PopularStocks';
import RecentSearches from '../components/RecentSearches';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#070A10] text-slate-100 bg-grid-pattern bg-radial-glow selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex flex-col items-center justify-center relative">
        
        {/* Top Feature Tag Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-xs font-mono mb-6 backdrop-blur-md shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Quant Intelligence v1.2 Engine Ready</span>
        </div>

        {/* Hero Section Header */}
        <div className="text-center max-w-3xl space-y-5 relative z-10 mb-10">
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.15]">
            智能化股市分析與
            <span className="block mt-1 bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              投資決策顧問平台
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed font-sans">
            整合台美股市場歷史數據與量化回測模型，結合關鍵基本面評級、技術指標矩陣與輿情動態情緒分析，為您打造極致精準的風險控制與投資決策。
          </p>
        </div>

        {/* Search Bar container */}
        <div className="w-full flex justify-center mb-14 relative z-10">
          <SearchBar />
        </div>

        {/* Market Sentiment Metric Cards Bar */}
        <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 gap-3 mb-12 relative z-10 text-xs font-mono">
          <div className="border border-slate-800/60 bg-[#0B0F19]/60 backdrop-blur-md p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-[10px] uppercase">市場情緒 (Fear & Greed)</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">74 / 100 <span className="text-emerald-400 font-normal text-xs">(極度貪婪)</span></div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 text-sm">
              📈
            </div>
          </div>

          <div className="border border-slate-800/60 bg-[#0B0F19]/60 backdrop-blur-md p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-[10px] uppercase">恐慌指數 (VIX Volatility)</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">15.42 <span className="text-emerald-400 font-normal text-xs">(低風險區)</span></div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 text-sm">
              🛡️
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 border border-slate-800/60 bg-[#0B0F19]/60 backdrop-blur-md p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-[10px] uppercase">量化策略回測勝率</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">68.4% <span className="text-slate-400 font-normal text-xs">(近30日評估)</span></div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400 text-sm">
              ⚡
            </div>
          </div>
        </div>

        {/* Popular stocks track */}
        <PopularStocks />

        <RecentSearches />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/60 py-6 text-center text-xs font-mono text-slate-600">
        Antigravity Analytics Platform &copy; 2026. All Quant Rights Reserved.
      </footer>
    </div>
  );
}

