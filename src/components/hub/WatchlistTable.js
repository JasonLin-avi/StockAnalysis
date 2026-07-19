'use client';
import React, { useState, useEffect } from 'react';
import SkeletonLoader from './SkeletonLoader';
import Link from 'next/link';
import { getWatchlist } from '../../lib/watchlist-store';

export default function WatchlistTable() {
  const [watchlist, setWatchlist] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('winRate5d');
  const [sortOrder, setSortOrder] = useState('desc');

  // Why: Fetch saved watchlist symbols from local storage to populate table with initial stock prices and backtest metrics.
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

  // Why: Toggle sort order when re-clicking active column header, or set new sort field with default descending order.
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Why: Helper function to parse numerical values from string formatted prices/percentages for comparative sorting.
  const parseNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Why: Dynamic multi-column sorting over the watchlist array using price data and 5D/10D/20D backtest metrics.
  const sortedWatchlist = [...watchlist].sort((a, b) => {
    const itemA = prices[a] || {};
    const itemB = prices[b] || {};

    let valA = 0;
    let valB = 0;

    if (sortField === 'symbol') {
      return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
    } else if (sortField === 'price') {
      valA = parseNumber(itemA.price);
      valB = parseNumber(itemB.price);
    } else if (sortField === 'change') {
      valA = parseNumber(itemA.change);
      valB = parseNumber(itemB.change);
    } else if (sortField === 'winRate5d') {
      valA = itemA.winRate5d || 0;
      valB = itemB.winRate5d || 0;
    } else if (sortField === 'winRate10d') {
      valA = itemA.winRate10d || 0;
      valB = itemB.winRate10d || 0;
    } else if (sortField === 'winRate20d') {
      valA = itemA.winRate20d || 0;
      valB = itemB.winRate20d || 0;
    }

    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  // Why: Provide clear visual sort direction indicators (▲/▼/↕) to communicate column sorting state to users.
  const getSortIcon = (field) => {
    if (sortField !== field) return <span className="text-slate-600 ml-1">↕</span>;
    return <span className="text-cyan-400 ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  if (loading) return <SkeletonLoader height="h-64" />;
  if (watchlist.length === 0) return <div className="text-slate-400 p-8 border border-slate-800 rounded-2xl bg-slate-900/30">尚無追蹤標的。請在搜尋股票後點擊關注。</div>;

  return (
    <div className="border border-slate-800 bg-[#0B0F19]/80 rounded-2xl overflow-hidden backdrop-blur shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#0E1424] text-slate-400 font-mono uppercase font-semibold text-xs border-b border-slate-800">
            <tr>
              <th onClick={() => handleSort('symbol')} className="px-5 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none">
                標的 (Symbol) {getSortIcon('symbol')}
              </th>
              <th onClick={() => handleSort('price')} className="px-5 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none">
                最新價格 {getSortIcon('price')}
              </th>
              <th onClick={() => handleSort('change')} className="px-5 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none">
                漲跌幅 {getSortIcon('change')}
              </th>
              <th onClick={() => handleSort('winRate5d')} className="px-5 py-4 cursor-pointer hover:text-cyan-300 transition-colors select-none">
                5D 回測勝率/報酬 {getSortIcon('winRate5d')}
              </th>
              <th onClick={() => handleSort('winRate10d')} className="px-5 py-4 cursor-pointer hover:text-cyan-300 transition-colors select-none">
                10D 回測勝率/報酬 {getSortIcon('winRate10d')}
              </th>
              <th onClick={() => handleSort('winRate20d')} className="px-5 py-4 cursor-pointer hover:text-cyan-300 transition-colors select-none">
                20D 回測勝率/報酬 {getSortIcon('winRate20d')}
              </th>
              <th className="px-5 py-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {sortedWatchlist.map(symbol => {
              const quote = prices[symbol] || {};

              const wr5 = quote.winRate5d !== undefined ? (quote.winRate5d * 100).toFixed(0) + '%' : '--';
              const ret5Val = quote.avgReturn5d || 0;
              const ret5Sign = ret5Val >= 0 ? '+' : '';
              const ret5Color = ret5Val >= 0 ? 'text-emerald-400' : 'text-rose-400';

              const wr10 = quote.winRate10d !== undefined ? (quote.winRate10d * 100).toFixed(0) + '%' : '--';
              const ret10Val = quote.avgReturn10d || 0;
              const ret10Sign = ret10Val >= 0 ? '+' : '';
              const ret10Color = ret10Val >= 0 ? 'text-emerald-400' : 'text-rose-400';

              const wr20 = quote.winRate20d !== undefined ? (quote.winRate20d * 100).toFixed(0) + '%' : '--';
              const ret20Val = quote.avgReturn20d || 0;
              const ret20Sign = ret20Val >= 0 ? '+' : '';
              const ret20Color = ret20Val >= 0 ? 'text-emerald-400' : 'text-rose-400';

              return (
                <tr key={symbol} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-100 font-display">{symbol}</td>
                  <td className="px-5 py-4 font-bold text-slate-200">{quote.price || '--'}</td>
                  <td className={`px-5 py-4 font-bold ${quote.color || 'text-slate-400'}`}>{quote.change || '--'}</td>
                  
                  {/* 5D Backtest Cell */}
                  <td className="px-5 py-4 font-bold bg-cyan-950/10">
                    <span className="text-cyan-400">{wr5}</span>
                    <span className={`text-xs ml-2 font-normal ${ret5Color}`}>({ret5Sign}{ret5Val.toFixed(2)}%)</span>
                  </td>

                  {/* 10D Backtest Cell */}
                  <td className="px-5 py-4 font-bold bg-slate-900/20">
                    <span className="text-cyan-300">{wr10}</span>
                    <span className={`text-xs ml-2 font-normal ${ret10Color}`}>({ret10Sign}{ret10Val.toFixed(2)}%)</span>
                  </td>

                  {/* 20D Backtest Cell */}
                  <td className="px-5 py-4 font-bold bg-slate-900/20">
                    <span className="text-cyan-200">{wr20}</span>
                    <span className={`text-xs ml-2 font-normal ${ret20Color}`}>({ret20Sign}{ret20Val.toFixed(2)}%)</span>
                  </td>

                  <td className="px-5 py-4 font-sans text-xs">
                    <Link href={`/stock/${symbol}`} className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                      個股報告 &rarr;
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


