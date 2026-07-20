# K-Line Technical Chart Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive "K 線技術分析" (K-Line Technical Analysis) tab to the stock detail page, fetching historical OHLCV data from SQLite (with Finnhub/incremental sync), calculating moving averages (MA5/20/60), and rendering an interactive chart using `lightweight-charts`.

**Architecture:** 
1. `src/app/api/stock/[symbol]/kline/route.js` API route fetches data from SQLite via `connectToDatabase()` and `syncStockPricesIncremental()`, computes dynamic MAs, and filters by time range (`1M`, `3M`, `6M`, `1Y`, `3Y`).
2. `src/app/stock/[symbol]/KlineTab.jsx` frontend component mounts `lightweight-charts` Candlestick + Volume + MA series inside a dark modern card wrapper with range selector controls.
3. `src/app/stock/[symbol]/page.js` integrates the new `📉 K線技術分析` tab into the page navigation bar.

**Tech Stack:** Next.js (App Router), React 18, `lightweight-charts`, SQLite3, Tailwind CSS.

## Global Constraints

- Re-use `connectToDatabase()` and `syncStockPricesIncremental()` from `src/lib/database/connection` and `src/lib/data-fetcher`.
- Keep existing 3 tabs intact while adding `📉 K線技術分析` as a 4th tab.
- All K-line data MUST be styled to match the dark slate theme (`#070A10` / `bg-slate-900/30`).

---

### Task 1: Install `lightweight-charts` & Create K-Line API Route

**Files:**
- Create: `src/app/api/stock/[symbol]/kline/route.js`
- Test: `tests/kline-api.test.js`

**Interfaces:**
- Consumes: `connectToDatabase()`, `syncStockPricesIncremental()`, `getHistoricalPricesFromDB()`
- Produces: GET `/api/stock/[symbol]/kline?range=1Y` returning `{ candles: [...], volume: [...], ma: { ma5: [...], ma20: [...], ma60: [...] } }`

- [ ] **Step 1: Install `lightweight-charts` dependency**

Run: `npm install lightweight-charts`

- [ ] **Step 2: Create API Route `src/app/api/stock/[symbol]/kline/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/database/connection';
const { saveStock, getHistoricalPricesFromDB } = require('../../../../../lib/database/queries');
const { syncStockPricesIncremental } = require('../../../../../lib/data-fetcher');

export const dynamic = 'force-dynamic';

function calculateMA(prices, windowSize) {
  const result = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < windowSize - 1) {
      result.push({ time: prices[i].date, value: null });
    } else {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += prices[i - j].close;
      }
      result.push({ time: prices[i].date, value: parseFloat((sum / windowSize).toFixed(2)) });
    }
  }
  return result.filter(item => item.value !== null);
}

export async function GET(request, { params }) {
  const symbol = params.symbol?.toUpperCase();
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '1Y'; // 1M, 3M, 6M, 1Y, 3Y

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const stockId = await saveStock(db, { symbol, market: symbol.includes('.') ? 'TW' : 'US' });

    // Sync incremental prices if needed
    await syncStockPricesIncremental(db, stockId, symbol);

    // Get all historical prices from DB
    const allPrices = await getHistoricalPricesFromDB(db, stockId);

    if (!allPrices || allPrices.length === 0) {
      return NextResponse.json({ candles: [], volume: [], ma5: [], ma20: [], ma60: [] });
    }

    // Filter by requested range
    const now = new Date();
    let cutoff = new Date();
    if (range === '1M') cutoff.setMonth(now.getMonth() - 1);
    else if (range === '3M') cutoff.setMonth(now.getMonth() - 3);
    else if (range === '6M') cutoff.setMonth(now.getMonth() - 6);
    else if (range === '3Y') cutoff.setFullYear(now.getFullYear() - 3);
    else cutoff.setFullYear(now.getFullYear() - 1); // default 1Y

    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const filteredPrices = allPrices.filter(p => p.date >= cutoffStr);

    const candles = filteredPrices.map(p => ({
      time: p.date,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close
    }));

    const volume = filteredPrices.map(p => ({
      time: p.date,
      value: p.volume,
      color: p.close >= p.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
    }));

    const ma5 = calculateMA(filteredPrices, 5);
    const ma20 = calculateMA(filteredPrices, 20);
    const ma60 = calculateMA(filteredPrices, 60);

    return NextResponse.json({
      candles,
      volume,
      ma5,
      ma20,
      ma60
    });
  } catch (error) {
    console.error('Kline API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit Task 1**

```bash
git add package.json package-lock.json src/app/api/stock/[symbol]/kline/route.js
git commit -m "feat: add kline API route with incremental DB sync and MA calculations"
```

---

### Task 2: Create `KlineTab.jsx` Frontend Component

**Files:**
- Create: `src/app/stock/[symbol]/KlineTab.jsx`

**Interfaces:**
- Consumes: GET `/api/stock/[symbol]/kline?range=...`
- Produces: Interactive TradingView K-Line & Volume chart with 1M/3M/6M/1Y/3Y range selector.

- [ ] **Step 1: Create `src/app/stock/[symbol]/KlineTab.jsx`**

```jsx
// src/app/stock/[symbol]/KlineTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function KlineTab({ symbol }) {
  const chartContainerRef = useRef(null);
  const [range, setRange] = useState('1Y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let chart = null;

    const loadKlineData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stock/${symbol}/kline?range=${range}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch Kline data');

        if (!chartContainerRef.current) return;

        // Clean up previous chart elements
        chartContainerRef.current.innerHTML = '';

        chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 480,
          layout: {
            background: { color: '#0B0F19' },
            textColor: '#94A3B8'
          },
          grid: {
            vertLines: { color: '#1E293B' },
            horzLines: { color: '#1E293B' }
          },
          crosshair: {
            mode: 1
          },
          priceScale: {
            borderColor: '#334155'
          },
          timeScale: {
            borderColor: '#334155',
            timeVisible: true
          }
        });

        // Add Candlestick Series
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#22C55E',
          downColor: '#EF4444',
          borderVisible: false,
          wickUpColor: '#22C55E',
          wickDownColor: '#EF4444'
        });
        candlestickSeries.setData(data.candles);

        // Add MA Series
        const ma5Series = chart.addLineSeries({ color: '#EAB308', lineWidth: 1.5, title: 'MA5' });
        ma5Series.setData(data.ma5);

        const ma20Series = chart.addLineSeries({ color: '#3B82F6', lineWidth: 1.5, title: 'MA20' });
        ma20Series.setData(data.ma20);

        const ma60Series = chart.addLineSeries({ color: '#A855F7', lineWidth: 1.5, title: 'MA60' });
        ma60Series.setData(data.ma60);

        // Add Volume Series
        const volumeSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: '', // Set as overlay
          scaleMargins: { top: 0.8, bottom: 0 }
        });
        volumeSeries.setData(data.volume);

        chart.timeScale().fitContent();
      } catch (err) {
        console.error('Kline chart render error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadKlineData();

    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) chart.remove();
    };
  }, [symbol, range]);

  return (
    <div className="border border-slate-900 bg-slate-900/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📉</span>
          <div>
            <h2 className="text-lg font-bold text-slate-100">{symbol} K 線技術分析圖</h2>
            <p className="text-xs text-slate-500">含日 K 線、成交量與 MA5/20/60 移動平均線</p>
          </div>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          {['1M', '3M', '6M', '1Y', '3Y'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                range === r
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative w-full min-h-[480px] rounded-xl overflow-hidden bg-[#0B0F19] border border-slate-800/60 p-2">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-[#0B0F19]/80 z-10">
            <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-slate-400 text-xs animate-pulse">載入 K 線歷史行情中...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div ref={chartContainerRef} className="w-full h-[480px]" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit Task 2**

```bash
git add src/app/stock/[symbol]/KlineTab.jsx
git commit -m "feat: add KlineTab component with lightweight-charts and range selector"
```

---

### Task 3: Integrate `KlineTab` into Stock Page

**Files:**
- Modify: `src/app/stock/[symbol]/page.js`

**Interfaces:**
- Consumes: `KlineTab` component
- Produces: Integrated 4-Tab navigation bar (`綜合技術指標`, `基本面分析`, `5年財務趨勢`, `K線技術分析`)

- [ ] **Step 1: Import `KlineTab` & Add 4th Tab Button in `src/app/stock/[symbol]/page.js`**

Add import:
```javascript
import KlineTab from './KlineTab';
```

Add Tab button in the navigation bar:
```jsx
<button
  type="button"
  onClick={() => setActiveTab('kline')}
  className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
    activeTab === 'kline'
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
  }`}
>
  <span>📉</span> K線技術分析
</button>
```

Add Tab content condition:
```jsx
{/* Tab 4: K線技術分析 */}
{activeTab === 'kline' && (
  <div className="animate-fadeIn">
    <KlineTab symbol={symbol} />
  </div>
)}
```

- [ ] **Step 2: Test manually in browser**

Open: `http://localhost:3000/stock/AAPL`
Verify: Clicking `📉 K線技術分析` renders the TradingView chart with K-line candles, Volume, MAs, and range buttons.

- [ ] **Step 3: Commit Task 3**

```bash
git add src/app/stock/[symbol]/page.js
git commit -m "feat: integrate K-line tab into stock detail page navigation"
```
