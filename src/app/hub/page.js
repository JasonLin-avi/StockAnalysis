import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import WatchlistTable from '../../components/hub/WatchlistTable';

export default function HubPage() {
  // Why: Full-width container layout maximizes space for quantitative analytics and backtest win-rate metrics in a single unified table.
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="flex-1 w-full text-slate-200 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                量化戰情室 (Analytics Hub)
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                關注標的即時數據監控與多週期回測勝率排行榜
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/watchlist"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
              >
                <span>切換至自選股卡片視圖</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <WatchlistTable />
          </div>
        </div>
      </main>
    </div>
  );
}
