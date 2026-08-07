# Embedded K-Line LLM Backtest Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the K-Line LLM Historical Backtest feature into the `KlineTab.jsx` component of the individual Stock Detail page (`/stock/[symbol]`), add a Prediction Horizon dropdown with custom days input (`custom`), and perform a global clean-up of obsolete standalone backtest routes and header links.

**Architecture:** Create an `EmbeddedBacktestPanel.jsx` component representing the point-in-time backtest UI (without stock symbol input). Integrate it into `KlineTab.jsx` via Sub-Tabs in Section 2 (toggling between "當前 AI 技術解讀" and "歷史時點模擬與回測沙盒"). Clean up `Header.js`, remove `/app/backtest/page.js`, and update `src/middleware.js`.

**Tech Stack:** Next.js (App Router), React, JavaScript (ES6+), Gemini AI SDK, Tailwind CSS, Jest (@testing-library/react).

## Global Constraints

- Tech Stack: React.js + Tailwind CSS frontend, Next.js backend.
- Code Style: Google Engineering Standards, comments focus on "Why" rather than "What".
- Automated Testing: Verify all changes with Jest tests.

---

### Task 1: Create `EmbeddedBacktestPanel` Component with Custom Days Option

**Files:**
- Create: `src/components/backtest/EmbeddedBacktestPanel.jsx`
- Test: `tests/ui/embedded-backtest-panel.test.js`

**Interfaces:**
- Consumes: `symbol` string prop from parent `KlineTab.jsx`
- Produces: Interactive control bar with Cutoff Date picker, Horizon Selector (`5`, `20`, `60`, `custom`), Custom Days Number Input (when `custom`), Predict/Evaluate API trigger, and Result Cards rendering.

- [ ] **Step 1: Write failing unit test for `EmbeddedBacktestPanel.jsx`**

```javascript
// tests/ui/embedded-backtest-panel.test.js
/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmbeddedBacktestPanel from '../../src/components/backtest/EmbeddedBacktestPanel';

describe('EmbeddedBacktestPanel Component', () => {
  test('renders cutoff date picker and prediction horizon dropdown without stock symbol input', () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    expect(screen.queryByLabelText(/股票代碼/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/歷史基準日/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/預測展望時間/i)).toBeInTheDocument();
  });

  test('shows custom days input field when "custom" option is selected', () => {
    render(<EmbeddedBacktestPanel symbol="2330.TW" />);

    const select = screen.getByLabelText(/預測展望時間/i);
    fireEvent.change(select, { target: { value: 'custom' } });

    expect(screen.getByPlaceholderText(/輸入天數/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/ui/embedded-backtest-panel.test.js`
Expected: FAIL with "Cannot find module '../../src/components/backtest/EmbeddedBacktestPanel'"

- [ ] **Step 3: Implement `EmbeddedBacktestPanel.jsx`**

```jsx
// src/components/backtest/EmbeddedBacktestPanel.jsx
'use client';

import React, { useState } from 'react';
import ResultCards from './ResultCards';

export default function EmbeddedBacktestPanel({ symbol }) {
  // Default cutoff date: 6 months ago
  const defaultCutoff = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  };

  const [cutoffDate, setCutoffDate] = useState(defaultCutoff);
  const [horizonOption, setHorizonOption] = useState('20');
  const [customDays, setCustomDays] = useState(45);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const activePredictionDays = horizonOption === 'custom' ? parseInt(customDays, 10) || 20 : parseInt(horizonOption, 10);

  const handlePredict = async () => {
    if (!cutoffDate || !activePredictionDays) return;
    setLoading(true);
    setForecast(null);
    setEvaluation(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/backtest/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, cutoffDate, lookbackDays: 90 })
      });
      const data = await res.json();
      if (data.success) {
        setForecast(data.forecast);
      } else {
        setErrorMsg(data.error || '預測服務發生錯誤');
      }
    } catch (err) {
      console.error('Prediction API call failed:', err);
      setErrorMsg('無法連接預測服務，請檢查網路連線或重試');
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    if (!forecast) return;
    setEvaluating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/backtest/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          cutoffDate,
          predictionDays: activePredictionDays,
          predictionResult: forecast
        })
      });
      const data = await res.json();
      if (data.success) {
        setEvaluation(data.evaluation);
      } else {
        setErrorMsg(data.error || '評估服務發生錯誤');
      }
    } catch (err) {
      console.error('Evaluation API call failed:', err);
      setErrorMsg('無法連接評估服務，請檢查網路連線或重試');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-xl">
      <div className="mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>⏳</span> 歷史時點 AI 技術回測沙盒 ({symbol})
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          指定歷史基準日期，LLM 將在完全遮蔽未來價格與新聞的情況下進行技術面分析，並於揭曉後自動計算精準度評分。
        </p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="embedded-cutoff-date" className="block text-xs font-medium text-slate-400 mb-1">
              歷史基準日 (Cutoff Date)
            </label>
            <input
              id="embedded-cutoff-date"
              type="date"
              value={cutoffDate}
              onChange={(e) => setCutoffDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <label htmlFor="horizon-option-select" className="block text-xs font-medium text-slate-400 mb-1">
              預測展望時間
            </label>
            <select
              id="horizon-option-select"
              value={horizonOption}
              onChange={(e) => setHorizonOption(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="5">1 週 (5 個交易日)</option>
              <option value="20">1 個月 (20 個交易日)</option>
              <option value="60">3 個月 (60 個交易日)</option>
              <option value="custom">自訂天數 (Other)</option>
            </select>
          </div>

          {horizonOption === 'custom' && (
            <div className="w-[120px]">
              <label htmlFor="custom-days-input" className="block text-xs font-medium text-slate-400 mb-1">
                自訂交易日數
              </label>
              <input
                id="custom-days-input"
                type="number"
                min="1"
                max="240"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="輸入天數"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          )}

          <div className="flex-none self-end">
            <button
              onClick={handlePredict}
              disabled={loading || !cutoffDate}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-5 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? '⏳ LLM 時點分析中...' : '🚀 開始歷史時點回測'}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-6 text-rose-400 text-sm flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white font-bold text-xs px-2 py-1"
          >
            關閉
          </button>
        </div>
      )}

      <ResultCards
        forecast={forecast}
        evaluation={evaluation}
        onReveal={handleReveal}
        evaluating={evaluating}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/ui/embedded-backtest-panel.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/backtest/EmbeddedBacktestPanel.jsx tests/ui/embedded-backtest-panel.test.js
git commit -m "feat(ui): create EmbeddedBacktestPanel component with custom days input"
```

---

### Task 2: Integrate `EmbeddedBacktestPanel` into `KlineTab.jsx` Sub-Tabs

**Files:**
- Modify: `src/app/stock/[symbol]/KlineTab.jsx`
- Test: `tests/ui/kline-tab.test.js`

**Interfaces:**
- Consumes: `EmbeddedBacktestPanel` component
- Produces: Sub-tab switcher in Section 2 of `KlineTab.jsx` toggling between `TechnicalAISummaryPanel` and `EmbeddedBacktestPanel`.

- [ ] **Step 1: Write failing test in `kline-tab.test.js`**

```javascript
// Add sub-tab verification to tests/ui/kline-tab.test.js
test('renders sub-tabs and switches to embedded backtest sandbox panel', async () => {
  // Existing render test...
  expect(screen.getByText(/當前 AI 技術面解讀/i)).toBeInTheDocument();
  expect(screen.getByText(/歷史時點模擬與回測沙盒/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/ui/kline-tab.test.js`
Expected: FAIL (sub-tab text not found)

- [ ] **Step 3: Update `KlineTab.jsx` to render Sub-Tabs**

In `src/app/stock/[symbol]/KlineTab.jsx`:
1. Import `EmbeddedBacktestPanel` from `@/components/backtest/EmbeddedBacktestPanel`.
2. Add state `const [middleTab, setMiddleTab] = useState('ai_summary'); // 'ai_summary' | 'backtest_sandbox'`
3. Replace section 2 container with sub-tab controls and conditional rendering:

```jsx
{/* Section 2: Sub-Tabs for Current AI Technical Interpretation & Backtest Sandbox */}
<div className="space-y-4">
  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
    <button
      type="button"
      onClick={() => setMiddleTab('ai_summary')}
      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
        middleTab === 'ai_summary'
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
      }`}
    >
      <span>🤖</span> 當前 AI 技術面解讀
    </button>
    <button
      type="button"
      onClick={() => setMiddleTab('backtest_sandbox')}
      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
        middleTab === 'backtest_sandbox'
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
      }`}
    >
      <span>⏳</span> 歷史時點模擬與回測沙盒
    </button>
  </div>

  {middleTab === 'ai_summary' ? (
    <TechnicalAISummaryPanel summary={aiSummary} isLoading={aiLoading} symbol={symbol} />
  ) : (
    <EmbeddedBacktestPanel symbol={symbol} />
  )}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/ui/kline-tab.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/stock/\[symbol\]/KlineTab.jsx tests/ui/kline-tab.test.js
git commit -m "feat(ui): integrate embedded backtest sandbox sub-tab in KlineTab"
```

---

### Task 3: Global Clean-up (Header Navigation, Route File, and Middleware)

**Files:**
- Modify: `src/components/Header.js`
- Delete: `src/app/backtest/page.js`
- Modify: `src/middleware.js`

**Interfaces:**
- Removes obsolete `/backtest` entry points and cleans up routing.

- [ ] **Step 1: Remove `/backtest` link from `Header.js`**

In `src/components/Header.js`, remove the `<Link href="/backtest">` button from the `<nav>` section.

- [ ] **Step 2: Remove `/app/backtest/page.js` file**

Delete file: `src/app/backtest/page.js`

- [ ] **Step 3: Revert `/backtest` bypass from `src/middleware.js`**

Remove `/backtest` path bypass logic in `src/middleware.js`.

- [ ] **Step 4: Run full Jest test suite to verify no broken tests**

Run: `npm run test`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git rm src/app/backtest/page.js
git add src/components/Header.js src/middleware.js
git commit -m "refactor(clean-up): remove obsolete standalone backtest route and header button"
```
