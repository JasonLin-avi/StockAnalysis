import React from 'react';
import SkeletonLoader from '../../components/hub/SkeletonLoader';

export default function HubPage() {
  // Why: 60/40 split on large screens provides optimal reading width for tables vs cards.
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-8">Analytics Hub</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-xl font-bold text-slate-300">Watchlist Analytics</h2>
            <SkeletonLoader height="h-64" />
          </div>
          
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-slate-300">Backtest Leaderboard</h2>
            <SkeletonLoader height="h-64" />
          </div>
        </div>
      </div>
    </main>
  );
}
