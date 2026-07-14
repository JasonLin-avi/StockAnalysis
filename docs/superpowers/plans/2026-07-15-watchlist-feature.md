# Watchlist Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a local-storage based Watchlist feature allowing users to watch stocks and view their real-time performance on a dedicated dashboard.

**Architecture:** Client-side storage (localStorage) paired with Client Components. The dashboard will hydrate with real-time API data by batch-fetching `/api/prices`. 

**Tech Stack:** React (Next.js App Router Client Components), LocalStorage, Jest, DOM Events.

## Global Constraints

- Data Storage: Client-side `localStorage` only.
- Accessibility: Must include `aria-label` on interactive elements.
- Styling: Tailwind CSS classes.

---

### Task 1: Watchlist Store Module

**Files:**
- Create: `src/lib/watchlist-store.js`
- Create: `tests/unit/watchlist-store.test.js`

**Interfaces:**
- Produces: `getWatchlist() -> Array<string>`
- Produces: `addWatch(symbol: string) -> void`
- Produces: `removeWatch(symbol: string) -> void`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/watchlist-store.test.js
const { getWatchlist, addWatch, removeWatch } = require('../../src/lib/watchlist-store');

describe('Watchlist Store', () => {
  beforeEach(() => {
    // Mock localStorage
    const store = {};
    global.window = {
      localStorage: {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
      },
      dispatchEvent: jest.fn(),
      CustomEvent: class CustomEvent { constructor(name) { this.name = name; } }
    };
  });

  it('returns empty array initially', () => {
    expect(getWatchlist()).toEqual([]);
  });

  it('adds and removes symbols', () => {
    addWatch('AAPL');
    expect(getWatchlist()).toEqual(['AAPL']);
    removeWatch('AAPL');
    expect(getWatchlist()).toEqual([]);
  });

  it('dispatches watchlist-updated event', () => {
    addWatch('TSLA');
    expect(global.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'watchlist-updated' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/unit/watchlist-store.test.js`
Expected: FAIL with "Cannot find module" or "function not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/lib/watchlist-store.js
const STORAGE_KEY = 'stock-analysis-watchlist';

function getWatchlist() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveWatchlist(list) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new window.CustomEvent('watchlist-updated'));
  }
}

function addWatch(symbol) {
  const list = getWatchlist();
  if (!list.includes(symbol)) {
    list.push(symbol);
    saveWatchlist(list);
  }
}

function removeWatch(symbol) {
  const list = getWatchlist();
  const newList = list.filter(s => s !== symbol);
  if (newList.length !== list.length) {
    saveWatchlist(newList);
  }
}

module.exports = { getWatchlist, addWatch, removeWatch };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/unit/watchlist-store.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/watchlist-store.test.js src/lib/watchlist-store.js
git commit -m "feat: implement local storage watchlist store"
```

### Task 2: WatchButton Component & Integration

**Files:**
- Create: `src/components/WatchButton.js`
- Modify: `src/app/stock/[symbol]/page.js`

**Interfaces:**
- Consumes: `getWatchlist`, `addWatch`, `removeWatch` from `src/lib/watchlist-store.js`
- Produces: `<WatchButton symbol="AAPL" />` component

- [ ] **Step 1: Write the WatchButton Component**

```javascript
// src/components/WatchButton.js
'use client';
import React, { useState, useEffect } from 'react';
const { getWatchlist, addWatch, removeWatch } = require('../lib/watchlist-store');

export default function WatchButton({ symbol }) {
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const list = getWatchlist();
      setIsWatched(list.includes(symbol));
    };
    checkStatus();
    window.addEventListener('watchlist-updated', checkStatus);
    return () => window.removeEventListener('watchlist-updated', checkStatus);
  }, [symbol]);

  const toggleWatch = () => {
    if (isWatched) {
      removeWatch(symbol);
    } else {
      addWatch(symbol);
    }
  };

  return (
    <button
      onClick={toggleWatch}
      aria-label={isWatched ? "取消關注" : "加入關注"}
      className={`ml-3 p-1.5 rounded-full transition-colors ${
        isWatched ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <svg className="w-6 h-6" fill={isWatched ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    </button>
  );
}
```

- [ ] **Step 2: Integrate into Stock Detail Page**

Modify `src/app/stock/[symbol]/page.js` to import and render the `WatchButton`.

```javascript
// Around the imports:
import WatchButton from '../../../components/WatchButton';

// Around line 74, next to the symbol title:
            <div className="flex items-baseline gap-3 mt-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{symbol}</h1>
              <WatchButton symbol={symbol} />
              <span className="text-sm text-slate-400">系統分析時間: {data.date}</span>
            </div>
```

- [ ] **Step 3: Run project builder check to verify compilation**

Run: `npm run build`
Expected: Successful build

- [ ] **Step 4: Commit**

```bash
git add src/components/WatchButton.js src/app/stock/[symbol]/page.js
git commit -m "feat: add WatchButton to stock detail page"
```

### Task 3: Watchlist Dashboard & Header Link

**Files:**
- Create: `src/app/watchlist/page.js`
- Modify: `src/components/Header.js`

**Interfaces:**
- Consumes: `getWatchlist()`
- Consumes: `GET /api/prices?symbols=...`
- Produces: `/watchlist` page route.

- [ ] **Step 1: Write the Watchlist Page**

```javascript
// src/app/watchlist/page.js
'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
const { getWatchlist } = require('../../lib/watchlist-store');

export default function WatchlistPage() {
  const [symbols, setSymbols] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = getWatchlist();
    setSymbols(list);
    
    if (list.length === 0) {
      setLoading(false);
      return;
    }

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/prices?symbols=${list.join(',')}`);
        const data = await res.json();
        setPrices(data);
      } catch (err) {
        console.error('Error fetching watchlist prices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold mb-8 text-white">⭐ 我的關注清單</h1>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-slate-900/50 rounded-xl p-6 h-32 border border-slate-800"></div>
            ))}
          </div>
        ) : symbols.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
            <div className="text-4xl mb-4">👀</div>
            <h2 className="text-xl font-bold text-slate-300 mb-2">尚未關注任何個股</h2>
            <p className="text-slate-500 mb-6">點擊上方搜尋列尋找標的，並在個股頁面點擊星星加入關注。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {symbols.map(symbol => {
              const quote = prices[symbol] || { price: '--', change: '--', color: 'text-slate-400' };
              return (
                <Link key={symbol} href={`/stock/${symbol}`} className="block">
                  <div className="bg-slate-900/80 hover:bg-slate-800 rounded-xl p-6 border border-slate-800 hover:border-slate-600 transition-all cursor-pointer">
                    <h3 className="text-xl font-bold text-white mb-2">{symbol}</h3>
                    <div className="text-2xl font-extrabold text-slate-100">{quote.price}</div>
                    <div className={`text-sm font-bold mt-1 ${quote.color}`}>{quote.change}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add Header Link**

Modify `src/components/Header.js` to add the link next to the SearchBar.

```javascript
// Modify src/components/Header.js
// Find the right section inside the <header> tag, add the Watchlist link next to the search bar.

// Look for <SearchBar /> around line 15, and insert the following code next to it:
          <Link href="/watchlist" className="ml-6 text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600">
            <span className="text-yellow-400">⭐</span> 我的關注
          </Link>
```

- [ ] **Step 3: Run project builder check to verify compilation**

Run: `npm run build`
Expected: Successful build

- [ ] **Step 4: Commit**

```bash
git add src/app/watchlist/page.js src/components/Header.js
git commit -m "feat: implement watchlist dashboard page and header link"
```
