# UI Stock Name Display Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance all UI components across the platform to display Taiwan stock names as "公司名稱 (股票代碼)" (e.g. 台積電 (2330.TW)) by populating `name` via `stock-map.js` in API/service endpoints.

**Architecture:** Update `analysis.service.js` to attach `name` for all queried stocks using `getCompanyNameByCode`, update `PopularStocks`, `WatchlistTable`, `LeaderboardPanel`, `RecentSearches`, and `StockDetail` components to display company names.

**Tech Stack:** Next.js (React), Node.js, Jest.

## Global Constraints
- Language: Traditional Chinese for documentation and UI labels.
- Display Format: "公司名稱 (股票代碼)" e.g. "台積電 (2330.TW)".
- Code style: Google Engineering Standards.

---

### Task 1: Update `analysis.service.js` to Include Stock Names in Price/Backtest Responses

**Files:**
- Modify: `src/services/analysis.service.js`
- Test: `tests/unit/analysis-service-name.test.js`

**Interfaces:**
- Consumes: `getCompanyNameByCode` from `src/lib/stock-map.js`
- Produces: `getLatestPricesAndBacktest` results containing `name` and `market` fields.

- [ ] **Step 1: Write failing test for `getLatestPricesAndBacktest` with stock name enrichment**

Create `tests/unit/analysis-service-name.test.js`:
```javascript
import { getLatestPricesAndBacktest } from '@/services/analysis.service';

describe('Analysis Service Stock Name Enrichment', () => {
  test('getLatestPricesAndBacktest 回傳資料中包含台股公司名稱 name 欄位', async () => {
    const results = await getLatestPricesAndBacktest(['2330.TW', 'NVDA']);

    expect(results['2330.TW']).toBeDefined();
    expect(results['2330.TW'].name).toBe('台積電');
    expect(results['NVDA']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/analysis-service-name.test.js`
Expected: FAIL (missing `name` property on `2330.TW`).

- [ ] **Step 3: Update `analysis.service.js` to populate `name` and `market`**

In [`src/services/analysis.service.js`](file:///D:/Programming/StockAnalysis/src/services/analysis.service.js):
Import `getCompanyNameByCode` from `../lib/stock-map.js`. In `getLatestPricesAndBacktest`:
```javascript
import { getCompanyNameByCode } from '../lib/stock-map.js';

// Inside getLatestPricesAndBacktest loop:
let companyName = symbol;
let marketType = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? '台股' : '美股';

if (symbol.includes('.')) {
  try {
    const nameInfo = await getCompanyNameByCode(symbol, { db });
    if (nameInfo && nameInfo.success) {
      companyName = nameInfo.name;
      marketType = nameInfo.market;
    }
  } catch (e) {
    // fallback
  }
}

results[symbol] = {
  name: companyName,
  market: marketType,
  price: `$${priceVal.toFixed(2)}`,
  change: `${sign}${changePercentVal.toFixed(2)}%`,
  color,
  ...backtestMetrics
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/analysis-service-name.test.js`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/services/analysis.service.js tests/unit/analysis-service-name.test.js
git commit -m "feat(service): enrich stock price response with company name and market"
```

---

### Task 2: Update Frontend UI Components to Display Company Names

**Files:**
- Modify: `src/components/PopularStocks.js`
- Modify: `src/components/hub/WatchlistTable.js`
- Modify: `src/components/hub/LeaderboardPanel.js`
- Modify: `src/app/stock/[symbol]/page.js`

**Interfaces:**
- Consumes: `name` property from API price / stock objects.

- [ ] **Step 1: Write UI component tests for stock name formatting**

Create `tests/unit/ui-stock-name-display.test.js`:
```javascript
import { parseStockCode } from '@/lib/stock-map';

describe('UI Stock Name Helper', () => {
  test('確認台股標的格式化組合正確', () => {
    const formatDisplayName = (symbol, name) => {
      if (!name || name === symbol) return symbol;
      return `${name} (${symbol})`;
    };

    expect(formatDisplayName('2330.TW', '台積電')).toBe('台積電 (2330.TW)');
    expect(formatDisplayName('AAPL', 'Apple Inc.')).toBe('Apple Inc. (AAPL)');
  });
});
```

- [ ] **Step 2: Run test to verify format helper logic**

Run: `npx jest tests/unit/ui-stock-name-display.test.js`
Expected: PASS.

- [ ] **Step 3: Update components to render company names**

1. In `src/components/PopularStocks.js`:
   Update display in card header to show `stock.name` and `stock.symbol`.

2. In `src/components/hub/WatchlistTable.js`:
   Update table column:
   ```jsx
   const displayName = quote.name && quote.name !== symbol ? `${quote.name} (${symbol})` : symbol;
   <td className="px-5 py-4 font-bold text-slate-100 font-display">{displayName}</td>
   ```

3. In `src/components/hub/LeaderboardPanel.js`:
   Update item header to show `leader.name ? `${leader.name} (${leader.symbol})` : leader.symbol`.

4. In `src/app/stock/[symbol]/page.js`:
   Update page headline to display `data.name ? `${data.name} (${symbol})` : symbol`.

- [ ] **Step 4: Run all unit tests**

Run: `npx jest tests/unit/`
Expected: PASS for all tests.

- [ ] **Step 5: Commit changes**

```bash
git add src/components/PopularStocks.js src/components/hub/WatchlistTable.js src/components/hub/LeaderboardPanel.js src/app/stock/[symbol]/page.js tests/unit/ui-stock-name-display.test.js
git commit -m "feat(ui): update stock components to display company name with symbol"
```
