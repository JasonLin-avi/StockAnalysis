'use client';
import React, { useState, useEffect } from 'react';
import SkeletonLoader from './SkeletonLoader';
import Link from 'next/link';
import { getWatchlist } from '../../lib/watchlist-store';

export default function WatchlistTable() {
  const [watchlist, setWatchlist] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  // Why: We use local storage for watchlist persistence to maintain consistency with the rest of the application.
  useEffect(() => {
    const list = getWatchlist();
    setWatchlist(list);
    
    if (list.length === 0) {
      setLoading(false);
      return;
    }

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/prices?symbols=${encodeURIComponent(list.join(','))}`);
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        setPrices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  if (loading) return <SkeletonLoader height="h-64" />;
  if (watchlist.length === 0) return <div className="text-slate-400 p-8 border border-slate-800 rounded-2xl bg-slate-900/30">尚無追蹤標的。請在搜尋股票後點擊關注。</div>;

  return (
    <div className="border border-slate-800 bg-slate-900/30 rounded-2xl overflow-hidden backdrop-blur">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-xs border-b border-slate-800">
          <tr>
            <th className="px-6 py-4">標的 (Symbol)</th>
            <th className="px-6 py-4">最新價格</th>
            <th className="px-6 py-4">漲跌幅</th>
            <th className="px-6 py-4">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {watchlist.map(symbol => {
            const quote = prices[symbol] || { price: '--', change: '--', color: 'text-slate-400' };
            return (
              <tr key={symbol} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-200">{symbol}</td>
                <td className="px-6 py-4 font-bold text-slate-100">{quote.price}</td>
                <td className={`px-6 py-4 font-bold ${quote.color}`}>{quote.change}</td>
                <td className="px-6 py-4">
                  <Link href={`/stock/${symbol}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    View Report &rarr;
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
