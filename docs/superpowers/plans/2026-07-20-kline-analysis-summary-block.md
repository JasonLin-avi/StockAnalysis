# K-Line Analysis Summary Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-side "Quant AI Summary" diagnostic panel to the K-Line tab, showing `generateLLMTechnicalSummary` output (price action, trend indicators, volume analysis) alongside the TradingView chart in a responsive 2:1 grid.

**Architecture:**
1. Extend `src/app/api/stock/[symbol]/kline/route.js` to call `generateLLMTechnicalSummary` and include `summary` in the JSON response.
2. Refactor `src/app/stock/[symbol]/KlineTab.jsx` from single-column to a `grid grid-cols-1 lg:grid-cols-3` layout, with the chart in `lg:col-span-2` and a new summary panel in `lg:col-span-1`.

**Tech Stack:** Next.js (App Router), React 18, `technicalindicators`, Tailwind CSS.

## Global Constraints

- Use `connectToDatabase()` from `src/lib/database/connection`.
- Use `generateLLMTechnicalSummary` from `src/lib/technical-analysis/klineanalysis.js`.
- Dark theme: backgrounds `#0B0F19` / `bg-slate-900/60`, text `text-slate-100/400`.
- Responsive: 2:1 grid on `lg:` breakpoint, stacked on mobile.

---

### Task 1: Extend Kline API to include `summary`

**Files:**
- Modify: `src/app/api/stock/[symbol]/kline/route.js`

**Interfaces:**
- Consumes: `generateLLMTechnicalSummary(rawData)` from `src/lib/technical-analysis/klineanalysis.js`
- Produces: API response gains `summary` field: `{ candles, volume, ma5, ma20, ma60, summary: { date, price_action, technical_indicators, volume_analysis } }`

- [ ] **Step 1: Add import for `generateLLMTechnicalSummary`**

At the top of `src/app/api/stock/[symbol]/kline/route.js`, add:

```javascript
const { generateLLMTechnicalSummary } = require('@/lib/technical-analysis/klineanalysis');
```

- [ ] **Step 2: Compute summary from full price dataset and include in response**

After line 131 (`const fullMa60 = calculateMA(prices, 60);`), add the summary computation:

```javascript
    // Why: Generate structured technical analysis summary for the right-side diagnostic panel.
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
```

Then modify the final `return NextResponse.json(...)` to include `summary`:

```javascript
    return NextResponse.json({
      candles,
      volume,
      ma5,
      ma20,
      ma60,
      summary
    });
```

- [ ] **Step 3: Test manually**

Run: `curl http://localhost:3000/api/stock/AAPL/kline?range=1Y`
Expected: JSON response includes `summary` object with `date`, `price_action`, `technical_indicators`, `volume_analysis`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stock/[symbol]/kline/route.js
git commit -m "feat: extend kline API to include technical analysis summary"
```

---

### Task 2: Refactor KlineTab to 2:1 grid with summary panel

**Files:**
- Modify: `src/app/stock/[symbol]/KlineTab.jsx`

**Interfaces:**
- Consumes: `data.summary` from API response (may be `null` if insufficient data)
- Produces: Right-side `🧠 量化技術診斷` panel rendered alongside chart

- [ ] **Step 1: Refactor KlineTab layout to responsive 2:1 grid**

Replace the outer container `<div>` (line 217) structure. The new layout:

```jsx
return (
  <div className="w-full space-y-4">
    {/* Header with Title, Legend & Range Selector — stays full-width */}
    <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
      {/* ... existing header/legend/range selector JSX unchanged ... */}
    </div>

    {/* 2:1 Responsive Grid: Chart (left 2 cols) + Summary Panel (right 1 col) */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Chart */}
      <div className="lg:col-span-2 bg-[#0B0F19] border border-slate-800 rounded-2xl p-4 shadow-2xl">
        {/* ... existing chart container, loading, error JSX ... */}
      </div>

      {/* Right: Quant AI Summary Panel */}
      <div className="lg:col-span-1">
        <SummaryPanel summary={data?.summary} isLoading={isLoading} />
      </div>
    </div>
  </div>
);
```

- [ ] **Step 2: Create the `SummaryPanel` sub-component inside `KlineTab.jsx`**

Add this component above the default export:

```jsx
function SummaryPanel({ summary, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-5 h-full flex items-center justify-center">
        <span className="text-xs text-slate-500 animate-pulse">計算技術指標中...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-5 h-full flex items-center justify-center">
        <span className="text-xs text-slate-500">數據不足，無法生成技術診斷</span>
      </div>
    );
  }

  const { price_action: pa, technical_indicators: ti, volume_analysis: va } = summary;

  const trendColor = (text) => {
    if (text.includes('多頭')) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40';
    if (text.includes('空頭')) return 'text-rose-400 bg-rose-950/60 border-rose-800/40';
    return 'text-amber-400 bg-amber-950/60 border-amber-800/40';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-5 space-y-5 h-full">
      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
        <span>🧠</span> 量化技術診斷
        <span className="text-[10px] text-slate-500 font-mono">({summary.date})</span>
      </h3>

      {/* Price Action */}
      <div className="space-y-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">收盤價 & 支撐壓力</div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-slate-100">{pa.current_close}</span>
          <span className={`text-xs font-semibold ${pa.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {pa.change_pct >= 0 ? '▲' : '▼'} {pa.change_from_prev} ({pa.change_pct}%)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60">
            <div className="text-slate-500 text-[10px]">20日支撐</div>
            <div className="text-slate-300 font-semibold">{pa.support_level_20d}</div>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60">
            <div className="text-slate-500 text-[10px]">20日壓力</div>
            <div className="text-slate-300 font-semibold">{pa.resistance_level_20d}</div>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60">
            <div className="text-slate-500 text-[10px]">60日支撐</div>
            <div className="text-slate-300 font-semibold">{pa.support_level_60d}</div>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60">
            <div className="text-slate-500 text-[10px]">60日壓力</div>
            <div className="text-slate-300 font-semibold">{pa.resistance_level_60d}</div>
          </div>
        </div>
      </div>

      {/* Trend & Indicators */}
      <div className="space-y-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">均線與趨勢</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-[#EAB308]/10 text-[#EAB308] border border-[#EAB308]/20">MA5: {ti.MA5}</span>
          <span className="px-2 py-0.5 rounded bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20">MA20: {ti.MA20}</span>
          <span className="px-2 py-0.5 rounded bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20">MA60: {ti.MA60}</span>
        </div>
        <div className={`text-xs px-2.5 py-1.5 rounded-lg border ${trendColor(ti.trend_short_term)}`}>
          📊 短線: {ti.trend_short_term}
        </div>
        <div className={`text-xs px-2.5 py-1.5 rounded-lg border ${trendColor(ti.trend_long_term)}`}>
          📈 長線: {ti.trend_long_term}
        </div>
      </div>

      {/* RSI & MACD */}
      <div className="space-y-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">動能指標</div>
        <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/60 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">RSI (14)</span>
            <span className={`font-semibold ${ti.RSI_14 > 70 ? 'text-rose-400' : ti.RSI_14 < 30 ? 'text-emerald-400' : 'text-slate-200'}`}>{ti.RSI_14}</span>
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">{ti.MACD_status}</div>
        </div>
      </div>

      {/* Volume */}
      <div className="space-y-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">量能分析</div>
        <div className="flex items-center justify-between bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/60 text-xs">
          <span className="text-slate-400">成交量</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-200 font-semibold">{va.current_volume?.toLocaleString()}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${va.volume_vs_5d_avg === '爆量' ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40' : 'bg-slate-800 text-slate-400'}`}>
              {va.volume_vs_5d_avg}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Test in browser**

Open: `http://localhost:3000/stock/AAPL`, click `📉 K線技術分析` tab.
Verify: Chart renders on the left, summary panel on the right with correct data.

- [ ] **Step 4: Commit**

```bash
git add src/app/stock/[symbol]/KlineTab.jsx
git commit -m "feat: add quant technical summary panel to K-line tab"
```
