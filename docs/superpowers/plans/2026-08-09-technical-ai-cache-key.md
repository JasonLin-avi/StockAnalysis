# Technical AI Diagnosis SQLite Cache Key Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Technical AI API route to use the database's latest price date (`max_date`), stock symbol, and reference days for SQLite prompt analysis cache key lookup and saving.

**Architecture:** Retrieve `max_date` via `getMaxPriceDate` after stock synchronization in `src/app/api/stock/[symbol]/technical-ai/route.js`, using `${upperSymbol}_technical_ai_${days}` as the cache key and `max_date` as the date parameter for `getPromptAnalysis` and `savePromptAnalysis`.

**Tech Stack:** Next.js 14 API Route, SQLite3 (`external/database`), Jest testing suite.

## Global Constraints
- Must preserve existing API response structure `{ markdown, days }`.
- Key format: `${upperSymbol}_technical_ai_${days}`
- Cache date: `max_date` (YYYY-MM-DD) from `stock_data` table.

---

### Task 1: Update API Route to Cache by DB max_date, Symbol, and Days

**Files:**
- Modify: `src/app/api/stock/[symbol]/technical-ai/route.js`
- Test: `tests/unit/technical-ai-api.test.js`

**Interfaces:**
- Consumes: `getMaxPriceDate(db, stockId)` from `src/external/database/queries.js`
- Produces: API response with cached/fresh AI markdown based on DB latest trading date (`max_date`).

- [ ] **Step 1: Write the failing unit tests for max_date caching**

```javascript
// In tests/unit/technical-ai-api.test.js
test('uses DB max_date for cache hit and cache miss saving', async () => {
  getMaxPriceDate.mockResolvedValue('2026-08-07');
  getPromptAnalysis.mockResolvedValue('## Cached by max_date');
  saveStock.mockResolvedValue(1);

  const request = new Request('http://localhost/api/stock/AAPL/technical-ai?days=15');
  const response = await GET(request, { params: { symbol: 'AAPL' } });
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.markdown).toBe('## Cached by max_date');
  expect(getPromptAnalysis).toHaveBeenCalledWith(
    mockDb,
    'AAPL_technical_ai_15',
    'technical',
    '2026-08-07'
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/unit/technical-ai-api.test.js`

- [ ] **Step 3: Update `src/app/api/stock/[symbol]/technical-ai/route.js`**

Modify `route.js` to import `getMaxPriceDate`, get `stockId`, run incremental sync, calculate `max_date`, and perform `getPromptAnalysis` / `savePromptAnalysis` using `max_date`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/unit/technical-ai-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/app/api/stock/\[symbol\]/technical-ai/route.js tests/unit/technical-ai-api.test.js docs/superpowers/specs/2026-08-09-technical-ai-cache-key-design.md
git commit -m "feat(api): optimize technical AI prompt analysis cache key using DB max_date, symbol, and days"
```
