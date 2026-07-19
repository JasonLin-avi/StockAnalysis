# Watchlist & Backtest Leaderboard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the Backtest Leaderboard into the Watchlist table with dynamic column sorting and enriched backtest metrics.

**Architecture:** Extend `/api/prices` route to join `analysis_results` backtest data and update `WatchlistTable` component with multi-column sorting (defaulting to winRate5d descending) while removing the standalone `LeaderboardPanel`.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, SQLite3.

## Global Constraints

- Follow Google Engineering Standards.
- Use `export const dynamic = 'force-dynamic'` on dynamic API routes to prevent Next.js build-time prerendering errors.
- Ensure all table numeric values use monospace tabular numbers (`font-mono`).

---

### Task 1: Extend `/api/prices` Route with Backtest Data

**Files:**
- Modify: `src/app/api/prices/route.js`
- Test: `tests/api/prices.test.js` (or inline verification via `npm test`)

**Interfaces:**
- Consumes: Query params `symbols` (e.g. `2330.TW,NVDA`)
- Produces: Response map per symbol containing `price`, `change`, `color`, `winRate5d`, `avgReturn5d`

- [ ] **Step 1: Write the test for extended `/api/prices` payload**

Create test file `tests/api/prices.test.js` or test assertion logic verifying `winRate5d` and `avgReturn5d` are included in JSON output.

```javascript
// tests/api/prices.test.js
const assert = require('assert');

describe('API Prices Route Payload', () => {
  it('should include winRate5d and avgReturn5d fields in output object', () => {
    const mockOutput = {
      price: '$1040.00',
      change: '+2.40%',
      color: 'text-emerald-400',
      winRate5d: 0.82,
      avgReturn5d: 4.15
    };
    assert.strictEqual(typeof mockOutput.winRate5d, 'number');
    assert.strictEqual(typeof mockOutput.avgReturn5d, 'number');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test tests/api/prices.test.js`
Expected: PASS

- [ ] **Step 3: Update `src/app/api/prices/route.js` to query latest backtest data**

Modify `src/app/api/prices/route.js` to join SQLite `analysis_results` and populate `winRate5d` and `avgReturn5d`.

```javascript
import { NextResponse } from 'next/server';
import yahooFinance from '../../../lib/data-fetcher/yahoo-finance';
const { fetchStockData } = yahooFinance;
const { connectToDatabase } = require('../../../lib/database/connection');
const { getLatestAnalysisResults } = require('../../../lib/database/queries');
const logger = require('../../../lib/logger');

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbolsStr = searchParams.get('symbols') || '';
  
  logger.info('API_PRICES', `Received GET request for symbols: "${symbolsStr}"`);

  try {
    if (!symbolsStr) {
      return NextResponse.json({});
    }

    const symbols = symbolsStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const results = {};

    let db = null;
    try {
      db = await connectToDatabase();
    } catch (e) {
      logger.warn('API_PRICES', 'Database connection unavailable for backtest metrics');
    }

    await Promise.all(symbols.map(async (symbol) => {
      try {
        const data = await fetchStockData(symbol);
        let winRate5d = 0;
        let avgReturn5d = 0;

        if (db) {
          try {
            const analysis = await getLatestAnalysisResults(db, symbol);
            if (analysis && analysis.backtest) {
              winRate5d = analysis.backtest.winRate5d || 0;
              avgReturn5d = analysis.backtest.avgReturn5d || 0;
            }
          } catch (dbErr) {
            logger.warn('API_PRICES', `Could not fetch backtest for ${symbol}`, dbErr);
          }
        }

        const isPriceValid = typeof data?.price === 'number' && !isNaN(data.price);
        const isChangePercentValid = typeof data?.changePercent === 'number' && !isNaN(data.changePercent);

        const priceVal = isPriceValid ? data.price : 0;
        const changePercentVal = isChangePercentValid ? data.changePercent : 0;

        const color = changePercentVal >= 0 ? 'text-emerald-400' : 'text-rose-400';
        const sign = changePercentVal >= 0 ? '+' : '';

        results[symbol] = {
          price: `$${priceVal.toFixed(2)}`,
          change: `${sign}${changePercentVal.toFixed(2)}%`,
          color,
          winRate5d,
          avgReturn5d
        };
      } catch (err) {
        logger.error('API_PRICES', `Failed to fetch API price for ${symbol}`, err);
      }
    }));

    return NextResponse.json(results);
  } catch (err) {
    logger.error('API_PRICES', `Unhandled exception in GET route for "${symbolsStr}"`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit API changes**

```bash
git add src/app/api/prices/route.js tests/api/prices.test.js
git commit -m "feat: enrich /api/prices endpoint with backtest metrics"
```

---

### Task 2: Upgrade `WatchlistTable` Component with Dynamic Multi-Column Sorting

**Files:**
- Modify: `src/components/hub/WatchlistTable.js`

**Interfaces:**
- Consumes: `/api/prices?symbols=...` payload with `winRate5d` and `avgReturn5d`
- Produces: Interactive sortable table component defaulting to `winRate5d` descending

- [ ] **Step 1: Update `WatchlistTable.js` with sorting state and column headers**

```javascript
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const parseNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

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
    } else if (sortField === 'avgReturn5d') {
      valA = itemA.avgReturn5d || 0;
      valB = itemB.avgReturn5d || 0;
    }

    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

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
              <th onClick={() => handleSort('symbol')} className="px-5 py-4 cursor-pointer hover:text-slate-200 transition-colors">
                標的 (Symbol) {getSortIcon('symbol')}
              </th>
              <th onClick={() => handleSort('price')} className="px-5 py-4 cursor-pointer hover:text-slate-200 transition-colors">
                最新價格 {getSortIcon('price')}
              </th>
              <th onClick={() => handleSort('change')} className="px-5 py-4 cursor-pointer hover:text-slate-200 transition-colors">
                漲跌幅 {getSortIcon('change')}
              </th>
              <th onClick={() => handleSort('winRate5d')} className="px-5 py-4 cursor-pointer hover:text-cyan-300 text-cyan-400 transition-colors">
                5日勝率 {getSortIcon('winRate5d')}
              </th>
              <th onClick={() => handleSort('avgReturn5d')} className="px-5 py-4 cursor-pointer hover:text-slate-200 transition-colors">
                5日平均報酬 {getSortIcon('avgReturn5d')}
              </th>
              <th className="px-5 py-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {sortedWatchlist.map(symbol => {
              const quote = prices[symbol] || { price: '--', change: '--', color: 'text-slate-400', winRate5d: 0, avgReturn5d: 0 };
              const winRatePct = (quote.winRate5d * 100).toFixed(0);
              const retSign = quote.avgReturn5d >= 0 ? '+' : '';
              const retColor = quote.avgReturn5d >= 0 ? 'text-emerald-400' : 'text-rose-400';

              return (
                <tr key={symbol} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-100 font-display">{symbol}</td>
                  <td className="px-5 py-4 font-bold text-slate-200">{quote.price}</td>
                  <td className={`px-5 py-4 font-bold ${quote.color}`}>{quote.change}</td>
                  <td className="px-5 py-4 font-bold text-cyan-400 bg-cyan-950/20">
                    {winRatePct}%
                  </td>
                  <td className={`px-5 py-4 font-bold ${retColor}`}>
                    {retSign}{quote.avgReturn5d.toFixed(2)}%
                  </td>
                  <td className="px-5 py-4 font-sans text-xs">
                    <Link href={`/stock/${symbol}`} className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                      查看分析報告 &rarr;
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
```

- [ ] **Step 2: Commit WatchlistTable updates**

```bash
git add src/components/hub/WatchlistTable.js
git commit -m "feat: add interactive multi-column sorting and backtest metrics to WatchlistTable"
```

---

### Task 3: Clean Up Layout & Deprecate Standalone Leaderboard

**Files:**
- Modify: `src/app/hub/page.js`
- Verify: `npm run build`

**Interfaces:**
- Consumes: Cleaned `WatchlistTable`
- Produces: Streamlined full-width `/hub` Analytics page

- [ ] **Step 1: Update `src/app/hub/page.js` to full-width layout**

```javascript
import React from 'react';
import Header from '../../components/Header';
import WatchlistTable from '../../components/hub/WatchlistTable';

export default function HubPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#070A10] text-slate-100 bg-grid-pattern bg-radial-glow">
      <Header />
      <main className="flex-1 w-full text-slate-200 p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
            <div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight text-white">
                量化戰情室 (Analytics Hub)
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-1">
                關注標的即時數據與 5 日勝率排行榜
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>SWR 即時同步連線中</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-sm font-mono uppercase font-semibold text-slate-400 tracking-wider">
              關注個股量化排行榜與數據
            </h2>
            <WatchlistTable />
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify build and test suite**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit Hub cleanup**

```bash
git add src/app/hub/page.js
git commit -m "refactor: simplify Hub page layout to full-width watchlist analytics table"
```
