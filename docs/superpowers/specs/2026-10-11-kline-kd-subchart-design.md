# K-Line KD Sub-Chart & Multi-Timeframe Alignment Design

## 1. Overview
Enhance the existing TradingView `lightweight-charts` K-line tab on the stock detail page (`/stock/[symbol]`) by:
1. Adding an interactive, synchronized **KD (Stochastic Oscillator) sub-chart** directly beneath the main candlestick chart.
2. Supporting **Multi-Timeframe switching**: Daily (日K, `1d`), Weekly (週K, `1w`), and Monthly (月K, `1mo`).
3. Providing a **KD parameter settings popover (⚙️)** allowing users to dynamically customize RSV period, K smoothing, and D smoothing (default `9, 3, 3`) with zero-latency client-side recalculation.
4. Implementing the domain rule: **When historical data is insufficient, K and D values default to 50** (neutral value).

---

## 2. Key Requirements

### A. Layout & Synchronization (Aligned Sub-Chart)
- **Main Chart Container**: Height ~380px. Contains Candlesticks, MA5/MA20/MA60, and Volume histogram (bottom 20%). Main chart time-scale label axis is hidden or minimal, leaving horizontal space for vertical grid alignment.
- **KD Sub-Chart Container**: Height ~140px. Placed immediately beneath the main chart with a subtle divider (`border-t border-slate-800`).
- **X-Axis / TimeScale Synchronization**:
  - Main chart and KD sub-chart must be 100% horizontally aligned.
  - Panning or zooming on either chart updates the visible logical range on the other using `subscribeVisibleLogicalRangeChange` with an anti-loop mutex flag.
  - Window resizing via `ResizeObserver` resizes both charts simultaneously without horizontal displacement.
- **Crosshair Hover Values**:
  - Moving the crosshair over either chart updates the KD sub-chart header with the active date's `K` and `D` values.
  - When the cursor leaves the chart, the display reverts to the latest available bar's KD values.

### B. Timeframe Selection (Intervals)
- Add a segmented button group in the top header card: `[ 日K | 週K | 月K ]`.
- Default interval is `日K` (`1d`).
- Switching intervals triggers a fetch to `/api/stock/[symbol]/kline?range=${range}&interval=${interval}`.
- All moving averages (MA5, MA20, MA60) and KD values adapt to the selected timeframe.

### C. KD Indicator Specifications
- **Default Parameters**: RSV Period $N = 9$, K Smoothing $M_1 = 3$, D Smoothing $M_2 = 3$.
- **Calculation Formula**:
  $$RSV_t = \frac{\text{Close}_t - \min_{i=0..N-1}(\text{Low}_{t-i})}{\max_{i=0..N-1}(\text{High}_{t-i}) - \min_{i=0..N-1}(\text{Low}_{t-i})} \times 100$$
  $$K_t = \frac{M_1 - 1}{M_1} K_{t-1} + \frac{1}{M_1} RSV_t$$
  $$D_t = \frac{M_2 - 1}{M_2} D_{t-1} + \frac{1}{M_2} K_t$$
- **Insufficient Data Handling**:
  - If total historical bars $< N$ or for initial bars where rolling min/max window cannot be evaluated, **$K$ and $D$ values default to 50**.
  - If $\max(\text{High}) == \min(\text{Low})$ (zero range), $RSV$ defaults to 50.
- **Reference Threshold Lines**:
  - Horizontal reference line at **80** (Overbought, dashed red `#EF4444`).
  - Horizontal reference line at **20** (Oversold, dashed green `#22C55E`).
- **Series Colors**:
  - **K Line**: Amber / Orange (`#F59E0B`, line width 1.5).
  - **D Line**: Indigo / Purple (`#818CF8`, line width 1.5).

### D. Parameter Customization (⚙️ Settings Modal)
- A settings button (`⚙️`) beside the KD sub-chart title opens an inline popover:
  - RSV Period ($N$): number input (range 2 ~ 60, default 9).
  - K Smoothing ($M_1$): number input (range 1 ~ 20, default 3).
  - D Smoothing ($M_2$): number input (range 1 ~ 20, default 3).
  - "重設 (9, 3, 3)" button to restore standard defaults.
  - "確定" / Backdrop click to close.
- Changing parameters triggers immediate client-side series recalculation (`setData`) with 0ms network latency.

### E. Integration with `SummaryPanel`
- Update the "動能指標 (Momentum)" section of `SummaryPanel` on the right side:
  - Add KD values: `K(9): XX.X`, `D(9): XX.X`.
  - Add status badge:
    - `低檔黃金交叉` (K crosses above D with K < 30)
    - `高檔死亡交叉` (K crosses below D with K > 70)
    - `高檔鈍化` (K > 80 for consecutive bars)
    - `低檔鈍化` (K < 20 for consecutive bars)
    - `常態區間` (Neutral)

---

## 3. Architecture & Data Flow

```
[ User Changes Interval (日K / 週K / 月K) ]
                     │
                     ▼
  GET /api/stock/[symbol]/kline?range=1Y&interval=1d|1w|1mo
                     │
                     ├─► Fetch all daily price records from SQLite
                     ├─► If interval != 1d: Aggregate into Weekly / Monthly OHLCV bars
                     ├─► Calculate MA5, MA20, MA60 on aggregated bars
                     ├─► Calculate default KD(9,3,3) on aggregated bars (insufficient -> 50)
                     ├─► Build SummaryPanel metadata (KD status, RSI, MACD)
                     ├─► Filter dataset by range cutoff date
                     └─► Return JSON { candles, volume, ma5, ma20, ma60, kd, summary }
                                     │
                                     ▼
                    [ KlineTab React Component ]
                     │
                     ├─► Main Chart (Height 380px): Candlesticks + MA lines + Volume
                     │
                     ├─► Sub-Chart (Height 140px): K & D lines + 20/80 horizontal lines
                     │
                     ├─► Sync Controller: Mutual logical range sync + crosshair tracking
                     │
                     └─► Local KD Engine: When user edits ⚙️ (N, M1, M2),
                         recalculates series in pure JS and calls series.setData()
```

---

## 4. Component Details & Modifications

### A. Technical Indicator Module (`src/lib/technical-analysis/kd.js`)
Create a dedicated KD computation module:
- `calculateKD(prices, period = 9, smoothK = 3, smoothD = 3)`
  - Returns `{ k: [{ time, value }], d: [{ time, value }] }`.
  - For bars prior to `period`, or when data is insufficient, returns `{ value: 50 }`.
  - Evaluates latest status: Golden Cross, Death Cross, Overbought (>80), Oversold (<20), or Neutral.

### B. Bar Aggregation Utility (`src/lib/technical-analysis/aggregation.js`)
Create a utility function to aggregate daily price bars:
- `aggregateBars(dailyPrices, interval = '1d')`
  - `'1d'`: Returns original bars.
  - `'1w'`: Groups by Monday-to-Sunday trading week; aggregates open (first day), high (max), low (min), close (last day), volume (sum), and date (last trading day of week).
  - `'1mo'`: Groups by YYYY-MM calendar month; aggregates open, high, low, close, volume, and date (last trading day of month).

### C. API Route (`src/app/api/stock/[symbol]/kline/route.js`)
- Read `interval` query param (`1d`, `1w`, `1mo`, default `1d`).
- Run `aggregateBars(prices, interval)`.
- Compute `calculateMA` (5, 20, 60) and `calculateKD` (9, 3, 3) on aggregated dataset.
- Include `kd: { k, d }` in JSON response.
- Attach `KD_K`, `KD_D`, `KD_status` to `summary.technical_indicators`.

### D. Frontend View (`src/app/stock/[symbol]/KlineTab.jsx`)
1. **Header Controls**:
   - Add interval selector: `[ 日K | 週K | 月K ]`.
   - Update indicator legends to include `K (#F59E0B)` and `D (#818CF8)`.
2. **Chart Layout**:
   - `mainChartContainerRef` (380px) and `kdChartContainerRef` (140px).
   - Main chart options: `timeScale: { visible: false }` or adjusted bottom margins.
   - KD chart options: `rightPriceScale: { autoScale: false, scaleMargins: { top: 0.1, bottom: 0.1 } }`. Add price lines at 20 and 80.
3. **Cross-Chart Sync**:
   - `isSyncingRef = useRef(false)`.
   - Bidirectional `subscribeVisibleLogicalRangeChange` listener with guard.
   - Bidirectional crosshair tracking to update header text dynamically.
4. **⚙️ Settings Popover**:
   - Inline toggle button in KD sub-chart title.
   - Controlled number inputs for `rsv` (9), `smoothK` (3), `smoothD` (3).
   - Recalculates KD using `calculateKD` in-memory and calls `kSeries.setData(...)` and `dSeries.setData(...)`.
5. **SummaryPanel Enhancement**:
   - Render KD indicators and status badge alongside RSI(14) and MACD.

---

## 5. Verification & Testing Strategy

### A. Unit Tests (`tests/unit/kd-indicator.test.js`)
- Verify KD(9,3,3) mathematical accuracy against standard benchmark datasets.
- Verify boundary conditions:
  - When input data length $< 9$, ensure all output values are `50`.
  - When price high == low (zero volatility), ensure RSV defaults to `50`.
  - Verify Golden Cross and Death Cross status identification.

### B. Aggregation Tests (`tests/unit/aggregation.test.js`)
- Verify weekly aggregation correctly bundles daily bars into single weekly candles with matching high/low/volume.
- Verify monthly aggregation across month boundaries.

### C. API Integration Tests (`tests/unit/kline-api.test.js`)
- Verify `GET /api/stock/NVDA/kline?interval=1w` returns properly aggregated weekly candles and corresponding MA & KD series.
- Verify fallback defaults when invalid intervals are passed.

### D. UI & Browser Verification
- Manual verification on `http://localhost:3000/stock/NVDA`:
  - Test scrolling and zooming on main chart; ensure KD sub-chart moves simultaneously with zero horizontal drift.
  - Test hover crosshair; verify K and D values display in header.
  - Test switching between 日K, 週K, 月K; verify charts re-render cleanly without glitching.
  - Open ⚙️ KD Settings, change 9 to 14, verify KD lines recompute and update instantly.
  - Verify right-hand `SummaryPanel` displays KD values and badges.
