# Design Document: Backtest Sandbox Stacked Header & Full-Width Controls Layout

## Problem Statement
Based on user feedback and reference screenshot `works.png`, the left title/description block and right control bar are currently aligned side-by-side in a single flex row. The user wants them stacked vertically in full width, along with removing the dashed border and temporary `🔥 [NEW UI LOADED]` tag from the unfetched initial prompt container.

## Proposed Solution
Refactor `EmbeddedBacktestPanel.jsx` layout:

1. **Top Section (Stacked Full-Width)**:
   - **Row 1 (Full Width Title)**: `🤖 歷史時點 AI 技術回測沙盒 ({symbol})` and subtitle spanning 100% width.
   - **Row 2 (Full Width Control Bar)**: Cutoff date picker with shortcut chips (1M, 3M, 6M, 1Y), lookback selector, prediction horizon selector, and action button `🚀 開始歷史時點回測` arranged neatly inside a dark control bar spanning 100% width.

2. **Lower Unfetched Prompt Area**:
   - Remove dashed border (`border-dashed`).
   - Remove `🔥 [NEW UI LOADED]` tag.
   - Keep clean centered prompt: `"請選擇歷史基準日並點擊『🚀 開始歷史時點回測』開始生成分析報告"`.

## Verification Plan
- Run `npm test tests/ui/embedded-backtest-panel.test.js` and `npm test tests/ui/kline-tab.test.js`.
