'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const quickTags = [
  { symbol: '2330.TW', label: '台積電' },
  { symbol: 'NVDA', label: '輝達' },
  { symbol: 'AAPL', label: '蘋果' },
  { symbol: 'TSLA', label: '特斯拉' },
];

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e, targetSymbol) => {
    if (e) e.preventDefault();
    const symbolToSearch = targetSymbol || query;
    if (symbolToSearch.trim()) {
      router.push(`/stock/${symbolToSearch.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="w-full max-w-xl flex flex-col items-center">
      <form onSubmit={(e) => handleSearch(e)} className="w-full">
        <div className="relative flex items-center group">
          {/* Search Icon */}
          <div className="absolute left-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋美股/台股代碼或公司名稱 (例: 2330.TW, NVDA)"
            className="w-full font-mono text-xs sm:text-sm rounded-xl border border-slate-800 bg-[#0B0F19]/90 pl-11 pr-28 py-3.5 text-slate-100 placeholder-slate-500 shadow-2xl backdrop-blur-xl transition-all focus:border-cyan-500/60 focus:bg-[#0E1424] focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            <span className="hidden sm:inline-block font-mono text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
            <button
              type="submit"
              className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 transition-all active:scale-95 focus:outline-none"
            >
              分析決策
            </button>
          </div>
        </div>
      </form>

      {/* Quick Search Tag Pills */}
      <div className="flex items-center gap-2 mt-3 flex-wrap justify-center text-xs">
        <span className="text-[11px] font-mono text-slate-500">快速搜尋:</span>
        {quickTags.map((tag) => (
          <button
            key={tag.symbol}
            type="button"
            onClick={() => handleSearch(null, tag.symbol)}
            className="font-mono text-[11px] text-slate-400 hover:text-cyan-300 bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-800/60 px-2 py-0.5 rounded transition-all"
          >
            ${tag.symbol} <span className="text-slate-500 text-[10px]">({tag.label})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

