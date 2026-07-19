### Task: Refactor Stock Detail Page to User-Driven Analysis

**Files:**
- Modify: `src/app/stock/[symbol]/page.js`

**Objective:**
The user wants the full stock analysis (`performFullAnalysis`) to be triggered manually via a button click on the stock dashboard, rather than running automatically (and blocking) during SSR.

**Requirements:**
1. Convert `src/app/stock/[symbol]/page.js` into a Client Component by adding `'use client';` at the top.
2. Remove the server-side `await performFullAnalysis(symbol)` call.
3. On initial load, the page should only display the Header, the Navigation Breadcrumb, the Stock Headline (symbol and basic info if available, or just the symbol), and a prominent "開始產生分析報告" (Generate Analysis Report) button.
4. When the user clicks the button:
   - Change the button state to `loading` (show a spinner or loading text like "分析中...").
   - Fetch data from `/api/analyze?symbol={symbol}`.
   - Note: We don't have an `/api/analyze` endpoint yet? Wait, let's assume we do, or we should create one.
   - Actually, earlier grep showed `src/app/api/analyze/route.js` exists! It imports `saveAnalysisResults`. Use `fetch('/api/analyze?symbol=' + symbol)` to trigger it.
5. Once the fetch completes successfully, store the returned `data` in state.
6. Hide the "Generate" button and display the full dashboard (`InvestmentAdvicePanel`, `CustomizableLayout`, etc.) passing the fetched data.
7. Also render `HistoryTracker` only after successful analysis, so it tracks properly.

**Step-by-step:**
1. Import `useState` in `page.js`.
2. Move all rendering of Charts and Panels to conditionally render only if `data` exists.
3. Create the `handleAnalyze` function that calls `/api/analyze?symbol={symbol}`.
4. Verify the layout looks clean before and after analysis.
5. Commit the changes: `git add src/app/stock/[symbol]/page.js` and `git commit -m "refactor: make analysis user-driven via button"`

Global Constraints: Must follow Google Engineering Standards (Why over What for comments).
