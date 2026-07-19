### Task: Refactor Popular Stocks to fetch live prices

**Files:**
- Create: `src/components/PopularStocks.js`
- Modify: `src/app/page.js`

**Objective:**
The user wants the "熱門追蹤標的" (Popular Stocks) section on the homepage to fetch live prices dynamically, exactly like how "最近搜尋標的" (Recent Searches) works.

**Requirements:**
1. Extract the "熱門追蹤標的" section from `src/app/page.js` into a new Client Component `src/components/PopularStocks.js`.
2. `PopularStocks.js` must have `'use client';` at the top.
3. Keep the initial 4 hardcoded stocks (AAPL, TSLA, 2330.TW, NVDA) as the base list (you can keep the `name` and `symbol`), but remove their hardcoded `price`, `change`, and `color`.
4. Use `useEffect` to fetch live prices from `/api/prices?symbols=...` just like `RecentSearches.js` does.
5. Implement a `loading` state. While loading, show the same `animate-pulse` skeleton loader as in `RecentSearches.js` for the price and change values.
6. Replace the hardcoded block in `src/app/page.js` with `<PopularStocks />`.

**Step-by-step:**
1. Create `src/components/PopularStocks.js` mirroring the fetch logic of `RecentSearches.js`.
2. Update `src/app/page.js` to import and render `<PopularStocks />`.
3. Verify the layout and functionality.
4. Commit the changes: `git add src/app/page.js src/components/PopularStocks.js` and `git commit -m "refactor: make popular stocks fetch live prices"`

Global Constraints: Must follow Google Engineering Standards (Why over What for comments).
