# Fundamental and Financial Trend Cache Frequency Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the cache query behavior in the stock analysis platform. In `src/lib/database/queries.js`, implement `getRecentPromptAnalysis(db, symbol, analysis_type, days)` which queries caches from SQLite valid within the last `days` days. Update `src/app/api/fundamental/route.js` and `src/app/api/financial-trend/route.js` to use a 7-day cache threshold.

**Architecture:** Extend `queries.js` database operations to support relative date querying (`date >= ?`). Integrate the new queries in fundamental and financial-trend API endpoints. Write corresponding unit tests in `tests/unit/database.test.js` to secure database layer behaviors, and verify all tests pass.

**Tech Stack:** Node.js, Next.js, sqlite3, Jest.

## Global Constraints
* Keep responses in Traditional Chinese (繁體中文) when interacting with the user.
* Do not use `eval()`.
* Follow Google Engineering Standards: describe "Why" rather than "What" in comments.
* Keep the technical-ai route unchanged (daily cache check).

---

### Task 1: Create failing database unit tests for `getRecentPromptAnalysis`

**Files:**
- Modify: `tests/unit/database.test.js:274-276`

**Interfaces:**
- Consumes: None
- Produces: Failing test suite validating SQLite cache retrieval within range limits.

- [ ] **Step 1: Add failing test cases to database.test.js**

Add the following test suite to the end of `tests/unit/database.test.js` (just before the last `});`):

```javascript
  // ---------------------------------------------------------------------------
  // Prompt Analysis Cache Range Queries
  // ---------------------------------------------------------------------------
  describe('Prompt Analysis Cache Range Queries', () => {
    // Note: getRecentPromptAnalysis is not implemented or exported yet
    const { savePromptAnalysis, getRecentPromptAnalysis } = require('../../src/lib/database/queries');

    test('saves prompt analysis and retrieves it within valid days limit', async () => {
      const today = new Date().toISOString().split('T')[0];
      await savePromptAnalysis(db, 'AAPL', 'fundamental', today, '# AAPL Fundamental');

      const cached = await getRecentPromptAnalysis(db, 'AAPL', 'fundamental', 7);
      expect(cached).toBe('# AAPL Fundamental');
    });

    test('returns null if latest cache is older than specified days', async () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const oldDate = tenDaysAgo.toISOString().split('T')[0];

      await savePromptAnalysis(db, 'AAPL', 'fundamental', oldDate, '# AAPL Old Fundamental');

      const cached = await getRecentPromptAnalysis(db, 'AAPL', 'fundamental', 7);
      expect(cached).toBeNull();
    });

    test('returns null if no cache exists for the symbol and type', async () => {
      const cached = await getRecentPromptAnalysis(db, 'MSFT', 'fundamental', 7);
      expect(cached).toBeNull();
    });
  });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx jest tests/unit/database.test.js`
Expected: FAIL (with error: `getRecentPromptAnalysis is not a function` or similar).

- [ ] **Step 3: Commit initial test modifications**

```bash
git add tests/unit/database.test.js
git commit -m "test: add database unit test cases for range cache query"
```

---

### Task 2: Implement `getRecentPromptAnalysis` in `queries.js`

**Files:**
- Modify: `src/lib/database/queries.js`

**Interfaces:**
- Consumes: None
- Produces: `getRecentPromptAnalysis(db, symbol, analysis_type, days)` exported correctly.

- [ ] **Step 1: Write queries implementation in `queries.js`**

Add `getRecentPromptAnalysis` function and add it to `module.exports`.

In `src/lib/database/queries.js`, insert below `savePromptAnalysis` (around line 516):
```javascript
/**
 * Retrieves the latest cached prompt analysis result within a specific number of days.
 *
 * @param {sqlite3.Database} db - Database connection
 * @param {string} symbol - Stock ticker
 * @param {string} analysis_type - Type of analysis, e.g., 'fundamental'
 * @param {number} days - Number of days to look back
 * @returns {Promise<string|null>} Markdown content or null if not found
 */
function getRecentPromptAnalysis(db, symbol, analysis_type, days) {
  return new Promise((resolve, reject) => {
    // Why: Calculate the ISO date string representing N days ago as our cutoff limit.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // Why: Query for matches where symbol/type match and date is greater than or equal to cutoff.
    db.get(
      `SELECT content FROM stock_prompt_analysis 
       WHERE symbol = ? AND analysis_type = ? AND date >= ? 
       ORDER BY date DESC LIMIT 1;`,
      [symbol.toUpperCase(), analysis_type, cutoffStr],
      (err, row) => {
        if (err) return reject(new Error(`Failed to fetch recent prompt analysis: ${err.message}`));
        resolve(row ? row.content : null);
      }
    );
  });
}
```

Add it to `module.exports` at the bottom of the file (around line 570):
```javascript
  getPromptAnalysis,
  savePromptAnalysis,
  getRecentPromptAnalysis, // Export the new function
```

- [ ] **Step 2: Run tests to verify database tests now pass**

Run: `npx jest tests/unit/database.test.js`
Expected: PASS

- [ ] **Step 3: Commit database layer implementation**

```bash
git add src/lib/database/queries.js
git commit -m "feat: implement getRecentPromptAnalysis database query"
```

---

### Task 3: Refactor Fundamental and Financial Trend API Routes to use 7-Day Expiry

**Files:**
- Modify: `src/app/api/fundamental/route.js`
- Modify: `src/app/api/financial-trend/route.js`

**Interfaces:**
- Consumes: `getRecentPromptAnalysis` from `queries.js`
- Produces: Updated endpoints implementing 7-day query logic.

- [ ] **Step 1: Modify `src/app/api/fundamental/route.js`**

Open `src/app/api/fundamental/route.js`.
Change query function import and invocation:
```javascript
// Import
const { getRecentPromptAnalysis, savePromptAnalysis } = require('../../../lib/database/queries');

// In GET function:
    // Check DB cache - 7 days validity
    const cached = await getRecentPromptAnalysis(db, symbol, 'fundamental', 7);
```

- [ ] **Step 2: Modify `src/app/api/financial-trend/route.js`**

Open `src/app/api/financial-trend/route.js`.
Change query function import and invocation:
```javascript
// Import
const { getRecentPromptAnalysis, savePromptAnalysis } = require('../../../lib/database/queries');

// In GET function:
    // Check DB cache for 'financial_trend' - 7 days validity
    const cached = await getRecentPromptAnalysis(db, symbol, 'financial_trend', 7);
```

- [ ] **Step 3: Run all unit tests to ensure no regressions**

Run: `npx jest`
Expected: PASS (All 192 unit tests pass, especially client, technical, database and recent searches flow tests)

- [ ] **Step 4: Commit API changes**

```bash
git add src/app/api/fundamental/route.js src/app/api/financial-trend/route.js
git commit -m "feat: update fundamental and financial-trend API routes to use 7-day cache threshold"
```
