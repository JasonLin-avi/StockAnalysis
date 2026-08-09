# Design Document: Backtest Sandbox Unified Card UI (Matching Screenshots)

## Problem Statement
Based on user reference screenshots (`想要有的效果.png` and `下方要有與當前AI技術面解析的呈現內容區塊一樣的效果.png`), the backtest sandbox currently renders controls in an isolated card and leaves the bottom area empty without a matching outer container and internal dashed placeholder box.

## Proposed Solution
Refactor `EmbeddedBacktestPanel.jsx` to combine header, controls, loading spinner, error feedback, empty state dashed box, and `ResultCards` inside a **single unified outer card**:

```jsx
<div className="border border-slate-900 bg-slate-900/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl mt-6">
  {/* Header + Controls inline/flex row */}
  <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-slate-800/80 pb-6 mb-6 gap-4">
    {/* Left Header Title & Subtitle */}
    {/* Right Controls: Cutoff Date, Lookback, Horizon & Trigger Button */}
  </div>

  {/* Lower Content Area matching Screenshot 1 Red Box */}
  {loading && <LoadingSpinner />}
  {errorMsg && <ErrorCard />}
  {!loading && forecast && <ResultCards />}
  {!loading && !errorMsg && !forecast && (
    <div className="text-center py-16 text-slate-500 text-sm font-medium border border-dashed border-slate-800/90 rounded-xl my-2">
      請設定歷史基準日與展望時間，並點擊「🚀 開始歷史時點回測」開始生成分析報告
    </div>
  )}
</div>
```

## Verification Plan
- Verify unit tests with `npm test tests/unit/components.test.js`.
