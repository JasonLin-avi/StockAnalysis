import React from 'react';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';

export default function Home() {
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: '$315.32', change: '-0.28%', color: 'text-red-400' },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: '$248.50', change: '+2.45%', color: 'text-green-400' },
    { symbol: '2330.TW', name: '台積電', price: '$980.00', change: '+1.55%', color: 'text-green-400' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: '$128.20', change: '-1.12%', color: 'text-red-400' }
  ];

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
        <div className="w-full max-w-4xl relative z-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center mb-6">
            熱門追蹤標的
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {popularStocks.map((stock) => (
              <a
                key={stock.symbol}
                href={`/stock/${stock.symbol}`}
                className="group border border-slate-900 bg-slate-900/30 hover:bg-slate-900/60 rounded-2xl p-5 hover:border-slate-800 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs text-slate-500 font-mono group-hover:text-slate-400 transition-colors">
                    {stock.name}
                  </span>
                  <div className="text-lg font-bold text-slate-200 mt-1">
                    {stock.symbol}
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-sm font-semibold text-slate-300">{stock.price}</span>
                  <span className={`text-xs font-semibold ${stock.color}`}>{stock.change}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
