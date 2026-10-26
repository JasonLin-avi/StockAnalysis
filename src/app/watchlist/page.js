'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { getWatchlist } from '../../lib/watchlist-store';

export default function WatchlistPage() {
  const [symbols, setSymbols] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = getWatchlist();
    setSymbols(list);
    
    if (list.length === 0) {
      setLoading(false);
      return;
    }

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/prices?symbols=${encodeURIComponent(list.join(','))}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setPrices(data);
      } catch (err) {
        console.error('Error fetching watchlist prices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Header Title & Switch View Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <svg className="w-6 h-6 fill-amber-400" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">我的關注清單</h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">即時追蹤您所關注標的的行情走勢與漲跌狀態</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hub"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/50 hover:border-cyan-600 transition-all shadow-sm group"
            >
              <span>切換至量化戰情室視圖 (含勝率排行)</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-slate-900/50 rounded-2xl p-6 h-36 border border-slate-800/80"></div>
            ))}
          </div>
        ) : symbols.length === 0 ? (
          <div className="text-center py-20 bg-[#0B0F19]/60 rounded-2xl border border-slate-800/80 border-dashed backdrop-blur-sm max-w-xl mx-auto">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-200 mb-1.5">尚未關注任何個股</h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md mx-auto">
              您可以回到市場看板搜尋任何台股或美股，在個股分析看板中點擊右上角的星星加入關注。
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:opacity-90 shadow-lg shadow-cyan-500/20 transition-all"
            >
              前往搜尋探索標的
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {symbols.map(symbol => {
              const quote = prices[symbol] || { price: '--', change: '--', color: 'text-slate-400', name: '' };
              const isPositive = quote.change && !quote.change.startsWith('-');
              return (
                <Link key={symbol} href={`/stock/${symbol}`} className="block group" aria-label={`查看 ${symbol} 股價`}>
                  <div className="bg-[#0B0F19]/80 hover:bg-[#0E1524] rounded-2xl p-5 border border-slate-800/80 hover:border-cyan-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/5 cursor-pointer flex flex-col justify-between h-36">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                          {symbol}
                        </div>
                        {quote.name && quote.name !== symbol && (
                          <div className="text-xs text-slate-400 truncate max-w-[180px] mt-0.5">
                            {quote.name}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/50">
                        即時報價
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-auto pt-2 border-t border-slate-800/60">
                      <div className="text-2xl font-extrabold text-slate-100 font-mono tracking-tight tabular-nums">
                        {quote.price}
                      </div>
                      <div className={`text-xs font-bold font-mono tabular-nums px-2 py-0.5 rounded-md ${
                        isPositive 
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' 
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                      }`}>
                        {quote.change}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
