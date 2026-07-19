import React from 'react';
import Header from '../../components/Header';
import WatchlistTable from '../../components/hub/WatchlistTable';

export default function HubPage() {
  // Why: Full-width container layout maximizes space for quantitative analytics and backtest win-rate metrics in a single unified table.
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="flex-1 w-full text-slate-200 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">量化戰情室 (Analytics Hub)</h1>
            <p className="mt-2 text-sm text-slate-400">關注標的即時數據與 5 日勝率排行榜</p>
          </div>

          <div className="mt-6">
            <WatchlistTable />
          </div>
        </div>
      </main>
    </div>
  );
}

