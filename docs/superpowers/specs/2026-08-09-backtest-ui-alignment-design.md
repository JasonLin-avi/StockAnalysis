# Design Document: Backtest Sandbox UI Loading & Empty State Alignment

## Problem Statement
The Embedded Backtest Sandbox UI currently displays empty or inconsistent fallback layouts before a backtest simulation is triggered, and lacks a rich loading spinner view matching the 15-Year Senior Quant Expert AI Diagnosis component (`TechnicalAISummaryPanel`).

## Proposed Solution
Align the UX/UI of `EmbeddedBacktestPanel.jsx` and `ResultCards.jsx` to closely match `TechnicalAISummaryPanel`:
1. **Initial Unfetched Empty State**:
   - Render a centered, dashed border placeholder card when no forecast has been generated (`!loading && !errorMsg && !forecast`).
   - Display key prompt: `"請設定歷史基準日與預測展望時間，並點擊「🚀 開始歷史時點回測」開始生成分析報告"`.
2. **Interactive Spinner Loading State**:
   - Update the trigger button to show an inline SVG spinning wheel (`animate-spin`) when `loading` is true.
   - Display a centered loading animation below the settings panel with an animated pulse label: `"AI 量化專家正在對 {symbol} (基準日 {cutoffDate}) 進行歷史時點數據與 K 線指標深度分析..."`.
3. **Reveal Evaluation Button Loading Feedback**:
   - Add inline SVG spinner to the reveal evaluation button when `evaluating` is true in `ResultCards.jsx`.

## Key Changes
- `src/components/backtest/EmbeddedBacktestPanel.jsx`: Add loading spinner component, initial empty state box, and inline spinner on button.
- `src/components/backtest/ResultCards.jsx`: Add inline spinner on reveal evaluation button.

## Verification Plan
- Run `npm test` or UI component rendering check to ensure no syntax errors.
