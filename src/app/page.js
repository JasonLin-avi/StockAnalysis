import React from 'react';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import PopularStocks from '../components/PopularStocks';
import RecentSearches from '../components/RecentSearches';

export default function Home() {

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="text-center max-w-3xl space-y-6 relative z-10 mb-12">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            智能化股市分析與
            <span className="bg-gradient-to-r from-blue-500 via-indigo-400 to-sky-400 bg-clip-text text-transparent block mt-2">
              投資決策顧問平台
            </span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            整合台灣與美國市場歷史數據，結合技術指標分析、核心基本面評級、以及輿情社交情緒模型，為您生成最全面的投資與風險防護決策報告。
          </p>
        </div>

        {/* Search Bar container */}
        <div className="w-full flex justify-center mb-16 relative z-10">
          <SearchBar />
        </div>

        {/* Popular stocks track */}
        <PopularStocks />

        <RecentSearches />
      </main>
    </div>
  );
}
