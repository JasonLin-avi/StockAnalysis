'use client';
import React, { useState, useEffect } from 'react';
import SkeletonLoader from './SkeletonLoader';
import Link from 'next/link';

export default function LeaderboardPanel() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Why: Parallel client fetching isolates failures and avoids blocking the main thread during heavy calculations.
  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setLeaders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <SkeletonLoader height="h-64" />;
  if (leaders.length === 0) return <div className="text-slate-400 p-8 border border-slate-800 rounded-2xl bg-slate-900/30">No leaderboard data available.</div>;

  return (
    <div className="space-y-4">
      {leaders.map((leader, index) => (
        <Link key={leader.symbol} href={`/stock/${leader.symbol}`} className="block border border-slate-800 bg-slate-900/30 rounded-2xl p-5 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-black text-slate-700">#{index + 1}</span>
            <div>
              <div className="font-bold text-lg text-slate-200">{leader.symbol}</div>
              <div className="text-xs text-slate-400">Top 5-Day Setup</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-emerald-400 font-bold">{(leader.rate * 100).toFixed(0)}% Win Rate</div>
            <div className="text-xs text-slate-400">Avg Ret: +{leader.ret}%</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
