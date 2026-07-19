### Task 5: Integrate Analytics Hub UI with Data

**Files:**
- Modify: `src/app/hub/page.js`
- Create: `src/components/hub/WatchlistTable.js`
- Create: `src/components/hub/LeaderboardPanel.js`

**Interfaces:**
- Produces: Data-connected components that fetch from `/api/watchlist` and `/api/leaderboard`, replacing the skeleton loaders in `HubPage`.

- [ ] **Step 1: Write minimal implementation**

```javascript
// src/components/hub/WatchlistTable.js
'use client';
import React, { useState, useEffect } from 'react';
import SkeletonLoader from './SkeletonLoader';
import Link from 'next/link';

export default function WatchlistTable() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // Why: Fetch data client-side to keep the initial page load instantly interactive and visually responsive.
  useEffect(() => {
    fetch('/api/watchlist')
      .then(res => res.json())
      .then(data => {
        setWatchlist(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <SkeletonLoader height="h-64" />;
  if (watchlist.length === 0) return <div className="text-slate-400 p-8 border border-slate-800 rounded-2xl bg-slate-900/30">尚無追蹤標的。請在搜尋股票後點擊關注。</div>;

  return (
    <div className="border border-slate-800 bg-slate-900/30 rounded-2xl overflow-hidden backdrop-blur">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-xs border-b border-slate-800">
          <tr>
            <th className="px-6 py-4">Symbol</th>
            <th className="px-6 py-4">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {watchlist.map(symbol => (
            <tr key={symbol} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4 font-bold text-slate-200">{symbol}</td>
              <td className="px-6 py-4">
                <Link href={`/stock/${symbol}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  View Report &rarr;
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// src/components/hub/LeaderboardPanel.js
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
```

- [ ] **Step 2: Update HubPage**

```javascript
// src/app/hub/page.js
import React from 'react';
import WatchlistTable from '../../components/hub/WatchlistTable';
import LeaderboardPanel from '../../components/hub/LeaderboardPanel';

export default function HubPage() {
  // Why: 60/40 split on large screens provides optimal reading width for tables vs cards.
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-8">Analytics Hub</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-xl font-bold text-slate-300">Watchlist Analytics</h2>
            <WatchlistTable />
          </div>
          
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-slate-300">Backtest Leaderboard</h2>
            <LeaderboardPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/hub/page.js src/components/hub/WatchlistTable.js src/components/hub/LeaderboardPanel.js
git commit -m "feat: integrate analytics hub with data"
```
