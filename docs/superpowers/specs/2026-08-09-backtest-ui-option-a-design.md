# Design Document: Backtest Sandbox Option A Full-Width UI Alignment

## Problem Statement
The Backtest Sandbox component (`EmbeddedBacktestPanel.jsx`) previously housed forecast outputs inside a narrow side-by-side card instead of presenting a dedicated full-width 15-Year Senior Quant Expert AI Diagnosis container matching `TechnicalAISummaryPanel`.

## Proposed Solution (Option A)
Redesign `EmbeddedBacktestPanel.jsx` and `ResultCards.jsx` to adopt the full-width container and header layout from `TechnicalAISummaryPanel`:
1. **Controls Bar at Top**: Keep historical cutoff date picker, lookback selector, prediction horizon selector, and manual trigger button at the top.
2. **Dedicated Full-Width Content Container**:
   - Container styling: `border border-slate-900 bg-slate-900/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl mt-6`.
   - Header Bar: `🤖 {symbol} 歷史時點 ({cutoffDate}) 15年資深量化專家 AI 回測診斷`.
3. **Consistent Dynamic States**:
   - **Initial State (`!loading && !forecast`)**: Center dashed-border placeholder box: `"請設定歷史基準日與預測展望時間，並點擊「🚀 開始歷史時點回測」開始生成分析報告"`.
   - **Loading State (`loading`)**: Centered SVG spinner + `animate-pulse` text: `"AI 量化專家正在對 {symbol} (基準日 {cutoffDate}) 進行歷史時點數據與 K 線指標深度分析..."`.
   - **Result State (`forecast`)**: Render rich full-width markdown analysis for LLM rationale, combined with actual outcome reveal & scoring card.

## Key Changes
- `src/components/backtest/EmbeddedBacktestPanel.jsx`: Move the main content output inside a full-width card matching `TechnicalAISummaryPanel`.
- `src/components/backtest/ResultCards.jsx`: Refactor layout to display full-width rationale markdown report and evaluation card cleanly.

## Verification
- Run `npm test` to ensure all unit and integration tests pass cleanly.
