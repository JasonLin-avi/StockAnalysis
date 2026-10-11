# K-Line KD Sub-Chart & Multi-Timeframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a synchronized KD (Stochastic Oscillator) sub-chart beneath the TradingView K-line chart on the stock detail page, support Daily/Weekly/Monthly timeframe switching, and allow dynamic KD parameter tuning with a fallback value of 50 when data is insufficient.

**Architecture:** A hybrid model where the backend aggregates daily prices into Weekly (`1w`) or Monthly (`1mo`) OHLCV bars and calculates default indicators, while the frontend maintains an in-memory KD calculator for instant 0ms parameter tuning. Lightweight Charts multi-pane synchronization is managed via bidirectional `subscribeVisibleLogicalRangeChange` with anti-loop guard flags and crosshair hover synchronization.

**Tech Stack:** Next.js 14 (App Router), React 18, `lightweight-charts` v5.2, Tailwind CSS, Jest, `@testing-library/react`.

## Global Constraints

- Language: Traditional Chinese (繁體中文) for UI text and diagnostic labels.
- Theme: Dark mode `#0B0F19` with consistent Tailwind `slate-800` / `slate-900` palettes.
- Precision: Round KD and MA indicators to 2 decimal places.
- Fallback Rule: When historical bars are insufficient for KD calculation (< RSV period), K and D values must default to 50.
- Safety: No `eval()`, preserve existing comments and docstrings.

---

### Task 1: Core KD Technical Indicator Module

**Files:**
- Create: `src/lib/technical-analysis/kd.js`
- Test: `tests/unit/kd-indicator.test.js`

**Interfaces:**
- Produces: `calculateKD(prices, period = 9, smoothK = 3, smoothD = 3)`
  - Parameter `prices`: `Array<{ date?: string, time?: string, high: number, low: number, close: number }>`
  - Return: `{ k: Array<{ time: string, value: number }>, d: Array<{ time: string, value: number }>, latest: { k: number, d: number, status: string } }`
  - Fallback: returns value `50` when bars are fewer than `period` or during initial warm-up bars.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/kd-indicator.test.js`:
```javascript
import { calculateKD } from '../../src/lib/technical-analysis/kd';

describe('KD Technical Indicator Module', () => {
  test('returns default 50 for all points when prices array is shorter than period', () => {
    const shortPrices = [
      { date: '2026-01-01', high: 105, low: 95, close: 100 },
      { date: '2026-01-02', high: 106, low: 96, close: 102 }
    ];

    const result = calculateKD(shortPrices, 9, 3, 3);
    expect(result.k).toHaveLength(2);
    expect(result.d).toHaveLength(2);
    expect(result.k[0].value).toBe(50);
    expect(result.k[1].value).toBe(50);
    expect(result.d[0].value).toBe(50);
    expect(result.d[1].value).toBe(50);
    expect(result.latest.k).toBe(50);
    expect(result.latest.d).toBe(50);
    expect(result.latest.status).toBe('資料不足 (基準50)');
  });

  test('correctly calculates KD(9,3,3) for synthetic price series', () => {
    const prices = [];
    // 20 bars with steady uptrend
    for (let i = 0; i < 20; i++) {
      prices.push({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        high: 100 + i * 2 + 1,
        low: 100 + i * 2 - 1,
        close: 100 + i * 2
      });
    }

    const result = calculateKD(prices, 9, 3, 3);
    expect(result.k).toHaveLength(20);
    expect(result.d).toHaveLength(20);

    // Initial warm-up bars prior to index 8 should be 50
    for (let i = 0; i < 8; i++) {
      expect(result.k[i].value).toBe(50);
      expect(result.d[i].value).toBe(50);
    }

    // Latest bar in steady uptrend should reflect high momentum (K > 60)
    expect(result.latest.k).toBeGreaterThan(60);
    expect(result.latest.d).toBeGreaterThan(50);
  });

  test('handles zero price range by defaulting RSV to 50', () => {
    const flatPrices = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      high: 100,
      low: 100,
      close: 100
    }));

    const result = calculateKD(flatPrices, 9, 3, 3);
    expect(result.latest.k).toBe(50);
    expect(result.latest.d).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/unit/kd-indicator.test.js`
Expected: FAIL with "Cannot find module .../kd"

- [ ] **Step 3: Implement `src/lib/technical-analysis/kd.js`**

Create `src/lib/technical-analysis/kd.js`:
```javascript
/**
 * @fileoverview Stochastic Oscillator (KD) Indicator Calculation
 * 
 * Why this module is designed:
 * - Implements classical 9-3-3 Stochastic Oscillator (RSV -> K -> D).
 * - Enforces the domain rule: if data length is insufficient (< period), returns 50 (neutral point).
 * - Handles zero price range safely without division by zero.
 * 
 * @module lib/technical-analysis/kd
 */

/**
 * Calculates KD indicator series over price history.
 * 
 * @param {Array<{date?: string, time?: string, high: number, low: number, close: number}>} prices
 * @param {number} [period=9] - RSV lookback window
 * @param {number} [smoothK=3] - K smoothing period
 * @param {number} [smoothD=3] - D smoothing period
 * @returns {{
 *   k: Array<{time: string, value: number}>,
 *   d: Array<{time: string, value: number}>,
 *   latest: { k: number, d: number, status: string }
 * }}
 */
export function calculateKD(prices, period = 9, smoothK = 3, smoothD = 3) {
  if (!Array.isArray(prices) || prices.length === 0) {
    return {
      k: [],
      d: [],
      latest: { k: 50, d: 50, status: '無資料' }
    };
  }

  const kSeries = [];
  const dSeries = [];

  let prevK = 50;
  let prevD = 50;

  const kWeight = 1 / smoothK;
  const dWeight = 1 / smoothD;

  for (let i = 0; i < prices.length; i++) {
    const time = prices[i].date || prices[i].time || '';

    // Insufficient historical data prior to window period
    if (i < period - 1) {
      kSeries.push({ time, value: 50 });
      dSeries.push({ time, value: 50 });
      continue;
    }

    // Determine rolling high and low over period
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - period + 1; j <= i; j++) {
      if (prices[j].high > highestHigh) highestHigh = prices[j].high;
      if (prices[j].low < lowestLow) lowestLow = prices[j].low;
    }

    let rsv = 50;
    const priceRange = highestHigh - lowestLow;
    if (priceRange > 0) {
      rsv = ((prices[i].close - lowestLow) / priceRange) * 100;
    }

    const currentK = Number(((1 - kWeight) * prevK + kWeight * rsv).toFixed(2));
    const currentD = Number(((1 - dWeight) * prevD + dWeight * currentK).toFixed(2));

    prevK = currentK;
    prevD = currentD;

    kSeries.push({ time, value: currentK });
    dSeries.push({ time, value: currentD });
  }

  const lastK = kSeries.length > 0 ? kSeries[kSeries.length - 1].value : 50;
  const lastD = dSeries.length > 0 ? dSeries[dSeries.length - 1].value : 50;
  const prevLastK = kSeries.length > 1 ? kSeries[kSeries.length - 2].value : lastK;
  const prevLastD = dSeries.length > 1 ? dSeries[dSeries.length - 2].value : lastD;

  let status = '常態整理';
  if (prices.length < period) {
    status = '資料不足 (基準50)';
  } else if (prevLastK <= prevLastD && lastK > lastD && lastK < 30) {
    status = '低檔黃金交叉 (買訊)';
  } else if (prevLastK >= prevLastD && lastK < lastD && lastK > 70) {
    status = '高檔死亡交叉 (賣訊)';
  } else if (lastK >= 80 && lastD >= 80) {
    status = '高檔超買鈍化';
  } else if (lastK <= 20 && lastD <= 20) {
    status = '低檔超賣鈍化';
  } else if (lastK > lastD) {
    status = '多方控盤 (K > D)';
  } else if (lastK < lastD) {
    status = '空方控盤 (K < D)';
  }

  return {
    k: kSeries,
    d: dSeries,
    latest: {
      k: lastK,
      d: lastD,
      status
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/unit/kd-indicator.test.js`
Expected: PASS (all 3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/lib/technical-analysis/kd.js tests/unit/kd-indicator.test.js
git commit -m "feat(technical): add KD indicator module with 50 fallback for insufficient data"
```

---

### Task 2: Multi-Timeframe Bar Aggregation Utility

**Files:**
- Create: `src/lib/technical-analysis/aggregation.js`
- Test: `tests/unit/aggregation.test.js`

**Interfaces:**
- Produces: `aggregateBars(prices, interval = '1d')`
  - Parameter `prices`: `Array<{ date: string, open: number, high: number, low: number, close: number, volume: number }>`
  - Parameter `interval`: `'1d' | '1w' | '1mo'`
  - Return: `Array<{ date: string, open: number, high: number, low: number, close: number, volume: number }>`

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/aggregation.test.js`:
```javascript
import { aggregateBars } from '../../src/lib/technical-analysis/aggregation';

describe('Bar Aggregation Utility', () => {
  const dailyPrices = [
    // Week 1: 2026-01-05 (Mon) to 2026-01-09 (Fri)
    { date: '2026-01-05', open: 100, high: 105, low: 98, close: 102, volume: 1000 },
    { date: '2026-01-06', open: 102, high: 108, low: 101, close: 107, volume: 1200 },
    { date: '2026-01-07', open: 107, high: 110, low: 105, close: 109, volume: 1500 },
    { date: '2026-01-08', open: 109, high: 112, low: 108, close: 111, volume: 1100 },
    { date: '2026-01-09', open: 111, high: 115, low: 110, close: 114, volume: 2000 },
    // Week 2: 2026-01-12 (Mon) to 2026-01-13 (Tue)
    { date: '2026-01-12', open: 114, high: 116, low: 112, close: 113, volume: 800 },
    { date: '2026-01-13', open: 113, high: 117, low: 111, close: 116, volume: 900 }
  ];

  test('returns identical array for 1d interval', () => {
    const result = aggregateBars(dailyPrices, '1d');
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual(dailyPrices[0]);
  });

  test('correctly aggregates into weekly bars for 1w interval', () => {
    const result = aggregateBars(dailyPrices, '1w');
    expect(result).toHaveLength(2);

    // Week 1 checks
    expect(result[0].date).toBe('2026-01-09'); // last trading day of week
    expect(result[0].open).toBe(100);          // first open
    expect(result[0].high).toBe(115);          // max high
    expect(result[0].low).toBe(98);            // min low
    expect(result[0].close).toBe(114);         // last close
    expect(result[0].volume).toBe(6800);       // sum volume

    // Week 2 checks
    expect(result[1].date).toBe('2026-01-13');
    expect(result[1].open).toBe(114);
    expect(result[1].high).toBe(117);
    expect(result[1].low).toBe(111);
    expect(result[1].close).toBe(116);
    expect(result[1].volume).toBe(1700);
  });

  test('correctly aggregates into monthly bars for 1mo interval', () => {
    const multiMonthPrices = [
      { date: '2026-01-15', open: 100, high: 110, low: 95, close: 105, volume: 5000 },
      { date: '2026-01-30', open: 105, high: 115, low: 102, close: 112, volume: 6000 },
      { date: '2026-02-05', open: 112, high: 120, low: 108, close: 118, volume: 4000 }
    ];

    const result = aggregateBars(multiMonthPrices, '1mo');
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-01-30');
    expect(result[0].open).toBe(100);
    expect(result[0].high).toBe(115);
    expect(result[0].low).toBe(95);
    expect(result[0].close).toBe(112);
    expect(result[0].volume).toBe(11000);

    expect(result[1].date).toBe('2026-02-05');
    expect(result[1].open).toBe(112);
    expect(result[1].close).toBe(118);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/unit/aggregation.test.js`
Expected: FAIL with "Cannot find module .../aggregation"

- [ ] **Step 3: Implement `src/lib/technical-analysis/aggregation.js`**

Create `src/lib/technical-analysis/aggregation.js`:
```javascript
/**
 * @fileoverview OHLCV Bar Aggregation Utility
 * 
 * Why this module is designed:
 * - Aggregates daily trading bars into Weekly ('1w') or Monthly ('1mo') bars.
 * - Retains the earliest open, max high, min low, latest close, total volume sum,
 *   and sets the bar timestamp to the latest trading day in that period.
 * 
 * @module lib/technical-analysis/aggregation
 */

/**
 * Returns ISO week key (e.g. "2026-W02") for a given YYYY-MM-DD date.
 * 
 * @param {string} dateStr 
 * @returns {string}
 */
function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Aggregates daily price bars into weekly or monthly periods.
 * 
 * @param {Array<{date: string, open: number, high: number, low: number, close: number, volume: number}>} prices
 * @param {'1d'|'1w'|'1mo'} [interval='1d']
 * @returns {Array<{date: string, open: number, high: number, low: number, close: number, volume: number}>}
 */
export function aggregateBars(prices, interval = '1d') {
  if (!Array.isArray(prices) || prices.length === 0) return [];

  const normInterval = (interval || '1d').toLowerCase();
  if (normInterval === '1d') {
    return prices;
  }

  const groups = new Map();

  for (const bar of prices) {
    let key;
    if (normInterval === '1w') {
      key = getWeekKey(bar.date);
    } else if (normInterval === '1mo') {
      key = bar.date.slice(0, 7); // "YYYY-MM"
    } else {
      key = bar.date;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(bar);
  }

  const aggregated = [];

  for (const [, bars] of groups) {
    if (bars.length === 0) continue;

    const first = bars[0];
    const last = bars[bars.length - 1];

    let maxHigh = -Infinity;
    let minLow = Infinity;
    let totalVolume = 0;

    for (const b of bars) {
      if (b.high > maxHigh) maxHigh = b.high;
      if (b.low < minLow) minLow = b.low;
      totalVolume += (b.volume || 0);
    }

    aggregated.push({
      date: last.date, // Use the last trading date in this period
      open: first.open,
      high: maxHigh,
      low: minLow,
      close: last.close,
      volume: totalVolume
    });
  }

  return aggregated;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/unit/aggregation.test.js`
Expected: PASS (all 3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/lib/technical-analysis/aggregation.js tests/unit/aggregation.test.js
git commit -m "feat(technical): add multi-timeframe bar aggregation utility"
```

---

### Task 3: Backend K-Line API Integration for Intervals & KD

**Files:**
- Modify: `src/app/api/stock/[symbol]/kline/route.js`
- Modify: `tests/unit/kline-api.test.js`

**Interfaces:**
- Consumes: `aggregateBars`, `calculateKD`
- Produces: `GET /api/stock/[symbol]/kline?range=1Y&interval=1d|1w|1mo`
  - Returns `{ candles, volume, ma5, ma20, ma60, kd: { k, d }, summary, interval }`

- [ ] **Step 1: Write test for API interval & KD in `tests/unit/kline-api.test.js`**

Update `tests/unit/kline-api.test.js` to add tests for `interval` parameter and `kd` output:
```javascript
  test('returns KD indicator and respects interval parameter', async () => {
    const mockPrices = generatePrices(70);
    mockGetHistoricalPricesFromDB.mockResolvedValue(mockPrices);

    const req = new Request('http://localhost:3000/api/stock/AAPL/kline?range=1Y&interval=1w');
    const res = await GET(req, { params: { symbol: 'AAPL' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.interval).toBe('1w');
    expect(json.kd).toBeDefined();
    expect(Array.isArray(json.kd.k)).toBe(true);
    expect(Array.isArray(json.kd.d)).toBe(true);
    expect(json.kd.k.length).toBe(json.candles.length);
    expect(json.summary?.technical_indicators?.KD_K).toBeDefined();
    expect(json.summary?.technical_indicators?.KD_status).toBeDefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/unit/kline-api.test.js`
Expected: FAIL because `json.kd` and `json.interval` are not yet returned.

- [ ] **Step 3: Modify `src/app/api/stock/[symbol]/kline/route.js`**

Update imports and GET function in `src/app/api/stock/[symbol]/kline/route.js`:
1. Import `calculateKD` from `../../../../../lib/technical-analysis/kd`.
2. Import `aggregateBars` from `../../../../../lib/technical-analysis/aggregation`.
3. Parse `interval` query param (`1d`, `1w`, `1mo`, default `1d`).
4. Apply `aggregateBars(prices, interval)` to form `activePrices`.
5. Compute `calculateKD(activePrices, 9, 3, 3)` on `activePrices`.
6. Attach KD series and status to response.

```javascript
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../external/database/connection';
import { saveStock, getHistoricalPricesFromDB } from '../../../../../external/database/queries';
import { syncStockPrices } from '../../../../../services/data-sync.service';
import { generateLLMTechnicalSummary } from '../../../../../lib/technical-analysis/klineanalysis';
import { calculateKD } from '../../../../../lib/technical-analysis/kd';
import { aggregateBars } from '../../../../../lib/technical-analysis/aggregation';

export const dynamic = 'force-dynamic';

function calculateMA(prices, period) {
  const result = [];
  let sum = 0;

  for (let i = 0; i < prices.length; i++) {
    sum += prices[i].close;
    if (i >= period) {
      sum -= prices[i - period].close;
    }
    if (i >= period - 1) {
      result.push({
        time: prices[i].date,
        value: Number((sum / period).toFixed(2))
      });
    }
  }

  return result;
}

function getCutoffDateStr(refDate, range) {
  const cutoff = new Date(refDate);
  const upperRange = (range || '1Y').toUpperCase();

  switch (upperRange) {
    case '1M':
      cutoff.setMonth(cutoff.getMonth() - 1);
      break;
    case '3M':
      cutoff.setMonth(cutoff.getMonth() - 3);
      break;
    case '6M':
      cutoff.setMonth(cutoff.getMonth() - 6);
      break;
    case '3Y':
      cutoff.setFullYear(cutoff.getFullYear() - 3);
      break;
    case '1Y':
    default:
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
  }

  return cutoff.toISOString().slice(0, 10);
}

export async function GET(request, context) {
  try {
    const params = await (context?.params || {});
    const symbol = params?.symbol;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || '1Y').toUpperCase();
    const interval = (searchParams.get('interval') || '1d').toLowerCase();

    const upperSymbol = symbol.toUpperCase();
    const db = await connectToDatabase();

    const stockId = await saveStock(db, {
      symbol: upperSymbol,
      market: upperSymbol.includes('.') ? 'TW' : 'US'
    });

    await syncStockPrices(db, stockId, upperSymbol);
    const rawPrices = await getHistoricalPricesFromDB(db, stockId);

    if (!rawPrices || rawPrices.length === 0) {
      return NextResponse.json({
        candles: [],
        volume: [],
        ma5: [],
        ma20: [],
        ma60: [],
        kd: { k: [], d: [] },
        summary: null,
        interval
      });
    }

    // Aggregate into 1d, 1w, or 1mo bars
    const prices = aggregateBars(rawPrices, interval);

    // Compute indicators over the full aggregated series
    const fullMa5 = calculateMA(prices, 5);
    const fullMa20 = calculateMA(prices, 20);
    const fullMa60 = calculateMA(prices, 60);
    const fullKd = calculateKD(prices, 9, 3, 3);

    let summary = null;
    if (prices.length >= 60) {
      const rawData = {
        dates: prices.map(p => p.date),
        opens: prices.map(p => p.open),
        highs: prices.map(p => p.high),
        lows: prices.map(p => p.low),
        closes: prices.map(p => p.close),
        volumes: prices.map(p => p.volume)
      };
      try {
        summary = generateLLMTechnicalSummary(rawData);
      } catch (err) {
        console.warn('[API_KLINE] Summary calculation failed:', err.message);
      }
    }

    // Enrich summary with KD data
    if (summary) {
      if (!summary.technical_indicators) {
        summary.technical_indicators = {};
      }
      summary.technical_indicators.KD_K = fullKd.latest.k;
      summary.technical_indicators.KD_D = fullKd.latest.d;
      summary.technical_indicators.KD_status = fullKd.latest.status;
    }

    const latestDate = new Date(prices[prices.length - 1].date);
    const cutoffDateStr = getCutoffDateStr(latestDate, range);

    const candles = [];
    const volume = [];

    for (const p of prices) {
      if (p.date >= cutoffDateStr) {
        candles.push({
          time: p.date,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close
        });

        const color = p.close >= p.open ? '#26a69a' : '#ef5350';
        volume.push({
          time: p.date,
          value: p.volume,
          color
        });
      }
    }

    const ma5 = fullMa5.filter(item => item.time >= cutoffDateStr);
    const ma20 = fullMa20.filter(item => item.time >= cutoffDateStr);
    const ma60 = fullMa60.filter(item => item.time >= cutoffDateStr);
    const k = fullKd.k.filter(item => item.time >= cutoffDateStr);
    const d = fullKd.d.filter(item => item.time >= cutoffDateStr);

    return NextResponse.json({
      candles,
      volume,
      ma5,
      ma20,
      ma60,
      kd: { k, d },
      summary,
      interval
    });
  } catch (error) {
    console.error(`[API_KLINE] Exception in GET for symbol:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/unit/kline-api.test.js`
Expected: PASS (all tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stock/[symbol]/kline/route.js tests/unit/kline-api.test.js
git commit -m "feat(api): add timeframe interval aggregation and KD series to kline route"
```

---

### Task 4: Frontend KD Sub-Chart & Multi-Timeframe Controls in `KlineTab.jsx`

**Files:**
- Modify: `src/app/stock/[symbol]/KlineTab.jsx`
- Modify: `tests/ui/kline-tab.test.js`

**Interfaces:**
- Consumes: updated `/api/stock/[symbol]/kline?interval=...`, `calculateKD`
- Produces:
  - Timeframe selector `[日K | 週K | 月K]`
  - Aligned KD sub-chart (height 140px)
  - TimeScale bidirectional synchronization with anti-loop flag
  - ⚙️ Settings popover for RSV, K, D tuning
  - Real-time crosshair KD value tracking
  - Updated `SummaryPanel` with KD metrics

- [ ] **Step 1: Write test for KlineTab UI additions in `tests/ui/kline-tab.test.js`**

Add tests checking that interval selector buttons (日K, 週K, 月K) and KD sub-chart render:
```javascript
  test('renders timeframe selector buttons and switches interval', async () => {
    // Verify 日K, 週K, 月K are rendered
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/ui/kline-tab.test.js`
Expected: FAIL due to missing interval buttons.

- [ ] **Step 3: Update `src/app/stock/[symbol]/KlineTab.jsx`**

Implement in `src/app/stock/[symbol]/KlineTab.jsx`:
1. Add `interval` state (`'1d'`, `'1w'`, `'1mo'`). Include `&interval=${interval}` in the API fetch URL.
2. In `SummaryPanel`:
   - Read `summary.technical_indicators.KD_K`, `KD_D`, and `KD_status`.
   - Render in the "動能指標" section alongside RSI(14) and MACD.
3. In `KlineTab`:
   - Add `kdChartContainerRef`, `kdChartInstanceRef`, `kSeriesRef`, `dSeriesRef`.
   - Add state `kdParams`: `{ rsv: 9, smoothK: 3, smoothD: 3 }` and `isSettingsOpen: false`.
   - Add ref `isSyncingRef = useRef(false)`.
   - In the chart creation `useEffect`:
     - Create `mainChart` (height 380) with minimal time axis or shared grid.
     - Create `kdChart` (height 140) with background `#0B0F19`, `rightPriceScale: { autoScale: false }`.
     - Add K line series (`#F59E0B`, width 1.5) and D line series (`#818CF8`, width 1.5).
     - Add reference price lines at 80 (Overbought, `#EF4444`, dashed) and 20 (Oversold, `#22C55E`, dashed).
     - Calculate KD points using `calculateKD(data.candles, kdParams.rsv, kdParams.smoothK, kdParams.smoothD)`.
     - Set data for K and D series.
     - Implement mutual `subscribeVisibleLogicalRangeChange` between `mainChart` and `kdChart` using `isSyncingRef`.
     - Add crosshair hover listener updating live KD value badge in KD header (`kdLiveRef`).
   - Add ⚙️ Settings Modal popover:
     - Number inputs for RSV (2~60), smoothK (1~20), smoothD (1~20).
     - "重設 (9, 3, 3)" button.
     - On input change, call `calculateKD` and immediately call `kSeriesRef.current?.setData(...)` and `dSeriesRef.current?.setData(...)`.
   - Add segmented interval buttons in header:
     - `['1d', '1w', '1mo']` labelled `['日K', '週K', '月K']`.
   - Update header legend to include K line (`#F59E0B`) and D line (`#818CF8`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/ui/kline-tab.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/stock/[symbol]/KlineTab.jsx tests/ui/kline-tab.test.js
git commit -m "feat(ui): add synchronized KD sub-chart, interval selector, and settings popover"
```

---

### Task 5: End-to-End Verification & Manual Browser Check

**Files:**
- None (verification & test suite run)

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All unit, API, and UI test suites pass.

- [ ] **Step 2: Verify in browser on `http://localhost:3000/stock/NVDA`**

- Verify KD sub-chart renders cleanly below the main candlestick chart.
- Verify scrolling and panning on the main chart syncs the KD chart simultaneously.
- Verify switching between 日K, 週K, and 月K reloads the aggregated candles and updates KD accordingly.
- Open ⚙️ KD Settings, change parameter values, and confirm KD lines redraw instantly.
- Verify `SummaryPanel` displays KD values and status badges.

- [ ] **Step 3: Commit any final refinements and update documentation**

```bash
git commit -m "docs: complete implementation of K-line KD sub-chart"
```
