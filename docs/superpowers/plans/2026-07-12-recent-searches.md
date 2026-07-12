# 最近搜尋歷史與實時報價 API 整合實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首頁新增最近搜尋股票清單（使用 LocalStorage，上限 8 筆），並結合實時報價 API 動態加載最新價格資訊。

**Architecture:** 本地端使用輕量級是用戶端組件紀錄被點選股票代碼；首頁載入時呼叫後端批次報價 API `/api/prices` 獲取最新行情，並以統一卡片樣式呈現。

**Tech Stack:** Next.js, React, LocalStorage, Jest, Recharts.

## Global Constraints
* 語言偏好：請盡量用繁體中文回答。
* 技術棧偏好：後端 Python 3.11+, 前端 React.js + Tailwind CSS。
* 安全規範：嚴禁在 Antigravity 環境中使用 eval()，優先使用內部的 Secret Manager。
* 代碼風格：遵循 Google Engineering Standards，註釋需說明 "Why" 而非 "What"。
* 最近搜尋儲存上限為 8 檔股票。

---

### Task 1: 建立實時批次報價 API 端點

**Files:**
* Create: `src/app/api/prices/route.js`
* Test: `tests/unit/api-prices.test.js`

**Interfaces:**
* Consumes: `src/lib/data-fetcher/yahoo-finance.js:fetchStockData`
* Produces: GET `/api/prices?symbols=AAPL,TSLA` 實時報價

- [ ] **Step 1: 撰寫 API 測試案例**

建立 `tests/unit/api-prices.test.js`，模擬 Next.js API 請求，斷言實時報價回傳結構：
```javascript
const { GET } = require('../../src/app/api/prices/route');

jest.mock('../../src/lib/data-fetcher/yahoo-finance', () => ({
  fetchStockData: jest.fn().mockImplementation((symbol) => Promise.resolve({
    symbol,
    name: symbol === 'AAPL' ? 'Apple Inc.' : 'Tesla Inc.',
    price: symbol === 'AAPL' ? 315.32 : 248.50,
    changePercent: symbol === 'AAPL' ? -0.28 : 2.45
  }))
}));

describe('GET /api/prices', () => {
  test('returns batch stock prices for symbols query', async () => {
    const req = {
      url: 'http://localhost/api/prices?symbols=AAPL,TSLA'
    };
    const response = await GET(req);
    const body = await response.json();
    
    expect(response.status).toBe(200);
    expect(body.AAPL.price).toBe('$315.32');
    expect(body.AAPL.change).toBe('-0.28%');
    expect(body.AAPL.color).toBe('text-rose-400');
    expect(body.TSLA.price).toBe('$248.50');
    expect(body.TSLA.change).toBe('+2.45%');
    expect(body.TSLA.color).toBe('text-emerald-400');
  });
});
```

- [ ] **Step 2: 執行測試並驗證失敗**

指令：`npx jest tests/unit/api-prices.test.js`
預期結果：FAIL（模組不存在）

- [ ] **Step 3: 撰寫最小 API 實作**

建立 `src/app/api/prices/route.js`：
```javascript
import { NextResponse } from 'next/server';
import { fetchStockData } from '../../../lib/data-fetcher/yahoo-finance';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsStr = searchParams.get('symbols') || '';
    if (!symbolsStr) {
      return NextResponse.json({});
    }

    const symbols = symbolsStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const results = {};

    await Promise.all(symbols.map(async (symbol) => {
      try {
        const data = await fetchStockData(symbol);
        const color = data.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400';
        const sign = data.changePercent >= 0 ? '+' : '';
        results[symbol] = {
          price: `$${data.price.toFixed(2)}`,
          change: `${sign}${data.changePercent.toFixed(2)}%`,
          color
        };
      } catch (err) {
        console.error(`Failed to fetch API price for ${symbol}:`, err);
      }
    }));

    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: 執行測試驗證通過**

指令：`npx jest tests/unit/api-prices.test.js`
預期結果：PASS

- [ ] **Step 5: 提交 Git**

指令：
```bash
git add src/app/api/prices/route.js tests/unit/api-prices.test.js
git commit -m "feat: add batch real-time prices API endpoint"
```

---

### Task 2: 建立 HistoryTracker 隱形寫入組件

**Files:**
* Create: `src/components/HistoryTracker.js`
* Test: `tests/unit/HistoryTracker.test.js`

**Interfaces:**
* Consumes: `localStorage`
* Produces: `<HistoryTracker symbol={symbol} name={name} />`

- [ ] **Step 1: 撰寫 HistoryTracker 測試**

建立 `tests/unit/HistoryTracker.test.js`：
```javascript
import React from 'react';
import { render } from '@testing-library/react';
import HistoryTracker from '../../src/components/HistoryTracker';

describe('HistoryTracker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('adds symbol and name to localStorage on mount', () => {
    render(<HistoryTracker symbol="AAPL" name="Apple Inc." />);
    
    const stored = JSON.parse(window.localStorage.getItem('antigravity_recent_stocks'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual({ symbol: 'AAPL', name: 'Apple Inc.' });
  });

  test('moves existing stock to front of array', () => {
    window.localStorage.setItem('antigravity_recent_stocks', JSON.stringify([
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'AAPL', name: 'Apple Inc.' }
    ]));

    render(<HistoryTracker symbol="AAPL" name="Apple Inc." />);
    
    const stored = JSON.parse(window.localStorage.getItem('antigravity_recent_stocks'));
    expect(stored).toHaveLength(2);
    expect(stored[0].symbol).toBe('AAPL');
    expect(stored[1].symbol).toBe('TSLA');
  });

  test('caps localStorage list to maximum 8 entries', () => {
    const list = Array.from({ length: 8 }, (_, i) => ({ symbol: `S${i}`, name: `Stock ${i}` }));
    window.localStorage.setItem('antigravity_recent_stocks', JSON.stringify(list));

    render(<HistoryTracker symbol="NEW" name="New Stock" />);
    
    const stored = JSON.parse(window.localStorage.getItem('antigravity_recent_stocks'));
    expect(stored).toHaveLength(8);
    expect(stored[0].symbol).toBe('NEW');
    expect(stored[7].symbol).toBe('S6'); // FIFO popped S7
  });
});
```

- [ ] **Step 2: 執行測試驗證失敗**

指令：`npx jest tests/unit/HistoryTracker.test.js`
預期結果：FAIL

- [ ] **Step 3: 實作 HistoryTracker**

建立 `src/components/HistoryTracker.js`：
```javascript
'use client';

import { useEffect } from 'react';

export default function HistoryTracker({ symbol, name }) {
  useEffect(() => {
    if (!symbol) return;

    try {
      const storedStr = localStorage.getItem('antigravity_recent_stocks');
      let list = storedStr ? JSON.parse(storedStr) : [];
      if (!Array.isArray(list)) list = [];

      // 去重並移動到最前
      list = list.filter(item => item.symbol !== symbol);
      list.unshift({ symbol, name: name || symbol });

      // 上限 8 筆
      if (list.length > 8) {
        list = list.slice(0, 8);
      }

      localStorage.setItem('antigravity_recent_stocks', JSON.stringify(list));
    } catch (err) {
      console.error('Failed to write history to localStorage:', err);
    }
  }, [symbol, name]);

  return null;
}
```

- [ ] **Step 4: 執行測試驗證通過**

指令：`npx jest tests/unit/HistoryTracker.test.js`
預期結果：PASS

- [ ] **Step 5: 提交 Git**

指令：
```bash
git add src/components/HistoryTracker.js tests/unit/HistoryTracker.test.js
git commit -m "feat: add HistoryTracker component to handle localStorage logic"
```

---

### Task 3: 建立 RecentSearches 卡片組件

**Files:**
* Create: `src/components/RecentSearches.js`
* Test: `tests/unit/RecentSearches.test.js`

**Interfaces:**
* Consumes: `localStorage`, GET `/api/prices`
* Produces: `<RecentSearches />` 用戶端卡片網格

- [ ] **Step 1: 撰寫 RecentSearches 測試**

建立 `tests/unit/RecentSearches.test.js`：
```javascript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RecentSearches from '../../src/components/RecentSearches';

global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      AAPL: { price: '$315.32', change: '-0.28%', color: 'text-rose-400' }
    })
  })
);

describe('RecentSearches', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('returns null when localStorage is empty', () => {
    const { container } = render(<RecentSearches />);
    expect(container.firstChild).toBeNull();
  });

  test('renders cards list and fetches live prices when data exists', async () => {
    window.localStorage.setItem('antigravity_recent_stocks', JSON.stringify([
      { symbol: 'AAPL', name: 'Apple Inc.' }
    ]));

    render(<RecentSearches />);
    
    expect(screen.getByText('最近搜尋標的')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('$315.32')).toBeInTheDocument();
      expect(screen.getByText('-0.28%')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: 執行測試驗證失敗**

指令：`npx jest tests/unit/RecentSearches.test.js`
預期結果：FAIL

- [ ] **Step 3: 實作 RecentSearches 卡片列表**

建立 `src/components/RecentSearches.js`：
```javascript
'use client';

import React, { useState, useEffect } from 'react';

export default function RecentSearches() {
  const [stocks, setStocks] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedStr = localStorage.getItem('antigravity_recent_stocks');
      if (storedStr) {
        const parsed = JSON.parse(storedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStocks(parsed);
          fetchPrices(parsed);
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  const fetchPrices = async (list) => {
    try {
      const symbols = list.map(item => encodeURIComponent(item.symbol)).join(',');
      const res = await fetch(`/api/prices?symbols=${symbols}`);
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (stocks.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl relative z-10 mt-12 pt-12 border-t border-slate-900">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center mb-6">
        最近搜尋標的
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stocks.map((stock) => {
          const priceInfo = prices[stock.symbol];
          return (
            <a
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className="group border border-slate-900 bg-slate-900/30 hover:bg-slate-900/60 rounded-2xl p-5 hover:border-slate-800 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-xs text-slate-500 font-mono group-hover:text-slate-400 transition-colors">
                  {stock.name}
                </span>
                <div className="text-lg font-bold text-slate-200 mt-1">
                  {stock.symbol}
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-4">
                {loading ? (
                  <>
                    <span className="h-4 w-12 bg-slate-800 rounded animate-pulse" />
                    <span className="h-3 w-10 bg-slate-800 rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-slate-300">
                      {priceInfo?.price || 'N/A'}
                    </span>
                    <span className={`text-xs font-semibold ${priceInfo?.color || 'text-slate-500'}`}>
                      {priceInfo?.change || 'N/A'}
                    </span>
                  </>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 執行測試驗證通過**

指令：`npx jest tests/unit/RecentSearches.test.js`
預期結果：PASS

- [ ] **Step 5: 提交 Git**

指令：
```bash
git add src/components/RecentSearches.js tests/unit/RecentSearches.test.js
git commit -m "feat: add RecentSearches component with live price fetching and skeleton loader"
```

---

### Task 4: 整合首頁與個股詳情頁，並加入實時報價加載流

**Files:**
* Modify: `src/app/page.js`
* Modify: `src/app/stock/[symbol]/page.js`
* Test: `tests/e2e/recent-searches-flow.test.js`

**Interfaces:**
* Consumes: `<RecentSearches />`, `<HistoryTracker />`
* Produces: 首頁整合動態最近搜尋與詳情頁寫入流

- [ ] **Step 1: 撰寫 E2E 整合流程測試**

建立 `tests/e2e/recent-searches-flow.test.js`：
```javascript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../../src/app/page';
import StockDetail from '../../src/app/stock/[symbol]/page';

jest.mock('../../src/lib/integration', () => ({
  performFullAnalysis: jest.fn().mockResolvedValue({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 315.32,
    changePercent: -0.28,
    date: '2026-07-12',
    historicalData: [],
    technical: { ma: [], rsi: null, macd: null },
    fundamental: {},
    news: {},
    advice: {}
  })
}));

describe('Recent Searches End-to-End Flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renders stock detail and then shows it on homepage recent searches list', async () => {
    // 1. Visit Stock Detail Page (this triggers HistoryTracker)
    const detailElement = await StockDetail({ params: { symbol: 'AAPL' } });
    render(detailElement);

    // 2. Mock fetch for homepage prices request
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          AAPL: { price: '$315.32', change: '-0.28%', color: 'text-rose-400' }
        })
      })
    );

    // 3. Render Homepage
    render(<Home />);
    
    // 4. Assert recent searches section exists
    expect(screen.getByText('最近搜尋標的')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('$315.32')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: 執行測試驗證失敗**

指令：`npx jest tests/e2e/recent-searches-flow.test.js`
預期結果：FAIL

- [ ] **Step 3: 整合代碼**

1. 修改 `src/app/page.js`：
在熱門標的網格元件下方，引入並掛載 `<RecentSearches />`：
```javascript
// ... existing imports ...
import RecentSearches from '../components/RecentSearches';

export default function Home() {
  // ... existing code ...
        {/* Popular stocks track */}
        <div className="w-full max-w-4xl relative z-10 mb-12">
          {/* ... popular stocks grid ... */}
        </div>

        {/* Recently searched stocks (added) */}
        <RecentSearches />
  // ...
```

2. 修改 `src/app/stock/[symbol]/page.js`：
在頁面底部加上隱藏式記錄器 `<HistoryTracker />`：
```javascript
// ... existing imports ...
import HistoryTracker from '../../../components/HistoryTracker';

export default async function StockDetail({ params }) {
  // ...
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ... existing headline, advice, charts ... */}
      </main>

      {/* Invisible History Tracker to write search history (added) */}
      <HistoryTracker symbol={symbol} name={data.name} />
    </div>
  );
}
```

- [ ] **Step 4: 執行測試驗證通過**

指令：`npx jest tests/e2e/recent-searches-flow.test.js`
預期結果：PASS

- [ ] **Step 5: 執行所有 114 個 Jest 測試**

指令：`npm run test`
預期結果：ALL PASS

- [ ] **Step 6: 提交 Git**

指令：
```bash
git add src/app/page.js src/app/stock/[symbol]/page.js tests/e2e/recent-searches-flow.test.js
git commit -m "feat: integrate recent searches on Home and StockDetail pages with full E2E flow passing"
```
