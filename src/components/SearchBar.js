'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/stock/${query.trim().toUpperCase()}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-lg">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入股票代碼，例如: AAPL, TSLA, 2330.TW"
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-3.5 pr-24 text-sm text-slate-100 placeholder-slate-500 shadow-xl backdrop-blur-md transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="absolute right-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-blue-500 hover:to-indigo-500 transition-all focus:outline-none"
        >
          搜尋分析
        </button>
      </div>
    </form>
  );
}
