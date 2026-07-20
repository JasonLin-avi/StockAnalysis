'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [marketData, setMarketData] = useState({
    twii: { displayPrice: '23,450.80', displayChange: '▲ +0.85%', color: 'text-emerald-400' },
    gspc: { displayPrice: '5,632.10', displayChange: '▼ -0.21%', color: 'text-rose-400' }
  });

  useEffect(() => {
    async function fetchMarket() {
      try {
        const res = await fetch('/api/market');
        if (res.ok) {
          const data = await res.json();
          if (data.twii && data.gspc) {
            setMarketData(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dynamic market data:', err);
      }
    }
    fetchMarket();
    // Poll every 60 seconds
    const interval = setInterval(fetchMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full">
      {/* Top Live Market Pulse Ticker Bar */}
      <div className="w-full bg-[#0B0F19] border-b border-slate-800/80 text-[11px] font-mono text-slate-400 py-1.5 px-4 overflow-hidden relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-300 tracking-wider uppercase">Live Market Pulse</span>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">台股加權:</span>
              <span className={`${marketData.twii.color} font-semibold`}>{marketData.twii.displayPrice}</span>
              <span className={`${marketData.twii.color} text-[10px]`}>{marketData.twii.displayChange}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">S&P 500:</span>
              <span className={`${marketData.gspc.color} font-semibold`}>{marketData.gspc.displayPrice}</span>
              <span className={`${marketData.gspc.color} text-[10px]`}>{marketData.gspc.displayChange}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">市場情緒:</span>
              <span className="text-cyan-400 font-semibold">極度貪婪 (74)</span>
            </span>
          </div>

          <div className="text-slate-500 text-[10px]">
            即時更新・UTC+8
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#070A10]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/10">
                  <div className="h-full w-full bg-[#070A10] rounded-[7px] flex items-center justify-center font-mono font-extrabold text-cyan-400 text-xs group-hover:bg-transparent group-hover:text-white transition-all">
                    AQ
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-lg font-bold tracking-tight text-slate-100 group-hover:text-cyan-400 transition-colors">
                    Antigravity <span className="text-cyan-400 font-extrabold">Quant</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 -mt-1 tracking-widest uppercase">
                    AI Investment Decision Core
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                <Link href="/" className="text-xs font-semibold px-3 py-2 rounded-md text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 transition-all">
                  市場看板
                </Link>
                <Link href="/hub" className="text-xs font-semibold px-3 py-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all">
                  量化戰情室
                </Link>
                <Link href="/reports" className="text-xs font-semibold px-3 py-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all">
                  歷史報告
                </Link>
                <Link href="/funds-flow" className="text-xs font-semibold px-3 py-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all">
                  市場資金流
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/watchlist"
                aria-label="我的關注"
                className="text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 bg-[#0E1524] hover:bg-[#151F34] px-3.5 py-2 rounded-lg border border-slate-800 hover:border-slate-700 shadow-sm transition-all"
              >
                <span className="text-amber-400 text-sm">★</span>
                <span>關注清單</span>
              </Link>
              <div className="text-[11px] font-mono text-slate-500 px-2 py-1 rounded bg-slate-900/60 border border-slate-800/60 hidden sm:block">
                v1.2.0-quant
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

