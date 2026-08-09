# Design Document: Backtest Sandbox Compact Control Bar Refinement

## Problem Statement
The user requested refining the font size and layout of the backtest control bar because the three selector groups ("歷史基準日", "歷史參考長度", "預測展望時間") feel too spaced out and far away from the action button ("🚀 開始歷史時點回測").

## Proposed Solution
Update `EmbeddedBacktestPanel.jsx`:
1. Change control bar container flex alignment from `justify-between` to `justify-start items-end gap-5` (or `gap-6`), keeping all inputs and the action button tightly grouped.
2. Refine font styling and padding for labels, date input, dropdown selects, and quick-date chips for a sleek, cohesive look.

## Verification Plan
- Run `npm test tests/ui/embedded-backtest-panel.test.js tests/ui/kline-tab.test.js`.
