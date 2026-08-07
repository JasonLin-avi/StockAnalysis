# K-Line LLM Historical Backtest Embedded Feature Design Specification

## 1. Overview & Context

This document specifies the integration of the **K-Line LLM Historical Backtest & Validation Sandbox** directly into the individual Stock Detail page (`/stock/[symbol]`) under the **"K-Line Technical Analysis" (K線技術分析 / `KlineTab.jsx`)** tab.

This deprecates the standalone `/backtest` page and eliminates redundant stock symbol inputs by automatically scoping backtesting to the currently viewed stock symbol.

---

## 2. UI / UX Design & Layout (`KlineTab.jsx`)

### 2.1 Tab Architecture & Component Hierarchy

Inside `KlineTab.jsx`, Section 2 (Middle Section) will present two mutually exclusive Sub-Tabs:

1. **`🤖 當前 AI 技術面解讀` (Default)**: Renders `TechnicalAISummaryPanel` (existing AI analysis based on current market state).
2. **`⏳ 歷史時點模擬與回測沙盒`**: Renders the embedded Point-in-Time Backtest Control Panel and Result Cards.

### 2.2 Embedded Backtest Control Panel

The backtest control bar automatically inherits the current `symbol` and provides the following controls:

- **Historical Cutoff Date (`cutoffDate`)**: Date picker defaulting to 6 months prior to today.
- **Prediction Horizon Dropdown (`predictionDays`)**:
  - `5` (1 週 / 5 交易日)
  - `20` (1 個月 / 20 交易日 - Default)
  - `60` (3 個月 / 60 交易日)
  - `custom` (自訂天數 / Other)
- **Custom Days Input**: Rendered dynamically when `predictionDays === 'custom'`. Numeric input accepting values between 1 and 240 days.
- **Submit Button**: `[ 🚀 開始歷史時點回測 ]`

### 2.3 Result Cards Display

- **Predictor Card**: Shows point-in-time trend (BULLISH/BEARISH/NEUTRAL), target price range, stop loss, and LLM rationale.
- **Reveal & Evaluator Card**: Displays "Reveal Future Outcome" trigger, followed by accuracy score (0-100), actual return %, and referee LLM review.

---

## 3. Global Clean-up & Routing Changes

1. **Header Navigation**: Remove the `⏳ K線 LLM 回測沙盒` button from `Header.js`.
2. **Standalone Page**: Delete `/app/backtest/page.js` and remove `/backtest` public bypass from `src/middleware.js`.

---

## 4. API Endpoint Compatibility

- **`POST /api/backtest/predict`**: Accepts `{ symbol, cutoffDate, lookbackDays }`.
- **`POST /api/backtest/evaluate`**: Accepts `{ symbol, cutoffDate, predictionDays, predictionResult }`.
- Both endpoints continue to utilize SQLite database caching via `getOrSyncKlines` to prevent redundant external API calls.
