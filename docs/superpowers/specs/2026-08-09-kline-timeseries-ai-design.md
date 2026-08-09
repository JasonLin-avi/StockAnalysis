# Kline Time-Series AI Technical Interpretation Design

## 1. Overview
Upgrade the existing single-snapshot Technical AI interpretation into an interactive, time-series-driven analysis panel. Users can select or input custom historical reference days (e.g., 15, 30, 60, or custom N days) and trigger Gemini AI analysis on demand.

## 2. Key Requirements
- **User-Defined Reference Range**: UI selection for presets (15, 30, 60 days) or a custom number input (5-120 days). Default is 30 days.
- **On-Demand Execution**: Analysis is triggered when the user clicks the "🤖 執行 15年專家 AI 診斷" button (not automatically on tab mount).
- **Time-Series Table Input**: Backend generates a structured Markdown Table containing daily price action, volume, MA5, MA20, MA60, RSI14, and MACD Histogram over the selected N days.
- **SQLite Caching per Range**: Cache keys update to `${symbol}_technical_ai_${days}` to preserve daily caching efficiency for identical parameter calls.

## 3. Architecture & Data Flow

```
[ KlineTab UI ] ──(User selects days & clicks button)──► GET /api/stock/[symbol]/technical-ai?days=30
                                                                   │
                                                   ┌───────────────┴───────────────┐
                                              [ Cache Hit? ]               [ Cache Miss ]
                                                   │                               │
                                            Return Cached Markdown          1. Fetch K-line history
                                                                            2. Compute MA5/20/60, RSI, MACD
                                                                            3. Build Time-Series Markdown Table
                                                                            4. Call Gemini LLM
                                                                            5. Save to `stock_prompt_analysis`
                                                                            6. Return Markdown
```

## 4. Component Details

### A. Helper Function (`src/lib/technical-analysis/klineanalysis.js`)
Add `generateLLMTimeSeriesSummary(rawData, days = 30)`:
- Validates data has at least `Math.max(60, days)` bars to support MA60 calculations.
- Extracts the latest `days` slice.
- Formats a Markdown Table string:
  `| 日期 | 收盤價 | 漲跌幅 | 成交量 | MA5 | MA20 | MA60 | RSI14 | MACD柱體 |`
- Returns both `markdownTable` and `summaryStats` (support/resistance 60d).

### B. API Route Handler (`src/app/api/stock/[symbol]/technical-ai/route.js`)
- Parses URL search param `days` (clamped between 5 and 120, default 30).
- Key format for DB cache: `${symbol}_technical_ai_${days}`.
- Constructs Prompt containing persona + Time-Series Markdown Table + overall context.

### C. Frontend Component (`src/app/stock/[symbol]/KlineTab.jsx`)
- Adds UI control panel:
  - Preset select dropdown: `[15天, 30天 (預設), 60天, 自訂]`
  - Number input (visible when "自訂" is selected, min: 5, max: 120).
  - Analyze Button: `[ 🤖 執行 15年專家 AI 診斷 ]`.
- State management: `selectedDays`, `customDaysInput`, `loading`, `analysisMarkdown`.

## 5. Verification & Testing Strategy
1. **Unit Tests (`tests/unit/technical-ai-api.test.js`)**:
   - Verify API respects `?days=N` query param.
   - Verify cache key format `${symbol}_technical_ai_${days}`.
   - Verify prompt output contains Markdown table with requested line count and MA60 column.
2. **UI Tests (`tests/ui/kline-tab.test.js`)**:
   - Verify preset dropdown and custom input behavior.
   - Verify click triggers fetch with correct `?days=` param.
   - Verify loading state and markdown rendering.
