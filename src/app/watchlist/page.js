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
        const res = await fetch(`/api/prices?symbols=${list.join(',')}`);
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold mb-8 text-white">⭐ 我的關注清單</h1>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-slate-900/50 rounded-xl p-6 h-32 border border-slate-800"></div>
            ))}
          </div>
        ) : symbols.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
            <div className="text-4xl mb-4">👀</div>
            <h2 className="text-xl font-bold text-slate-300 mb-2">尚未關注任何個股</h2>
            <p className="text-slate-500 mb-6">點擊上方搜尋列尋找標的，並在個股頁面點擊星星加入關注。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {symbols.map(symbol => {
              const quote = prices[symbol] || { price: '--', change: '--', color: 'text-slate-400' };
              return (
                <Link key={symbol} href={`/stock/${symbol}`} className="block" aria-label={`查看 ${symbol} 股價`}>
                  <div className="bg-slate-900/80 hover:bg-slate-800 rounded-xl p-6 border border-slate-800 hover:border-slate-600 transition-all cursor-pointer">
                    <h3 className="text-xl font-bold text-white mb-2">{symbol}</h3>
                    <div className="text-2xl font-extrabold text-slate-100">{quote.price}</div>
                    <div className={`text-sm font-bold mt-1 ${quote.color}`}>{quote.change}</div>
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
