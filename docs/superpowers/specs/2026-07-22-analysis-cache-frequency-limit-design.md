# Fundamental and Financial Trend Cache Frequency Optimization Design

## 1. Background and Purpose
Currently, the stock analysis platform caches Gemini AI-generated markdown reports for "Fundamental Analysis" (`fundamental`) and "5-Year Financial Trend" (`financial_trend`) in a SQLite table `stock_prompt_analysis`.
The current logic checks for cache validity using the exact current date (`today`), meaning the report is recalculated daily if requested.
Since fundamental data and long-term financial trends change very slowly, updating these reports daily causes unnecessary Gemini API calls and cost. 

This design changes the cache expiration frequency for `fundamental` and `financial_trend` reports to **7 days**. The cache will only be regenerated if the latest cached entry is older than 7 days.
The "Technical AI Analysis" (`technical`) report cache will remain unchanged (expiring daily) because technical indicators require daily updates.

---

## 2. Scope of Changes
We will modify the codebase in the following locations:
1. **Database Queries Layer (`src/lib/database/queries.js`)**: Add and export a new query function `getRecentPromptAnalysis` that fetches the newest cache entry within a specified number of days.
2. **Fundamental API Route (`src/app/api/fundamental/route.js`)**: Update to consume `getRecentPromptAnalysis` with a 7-day threshold.
3. **Financial Trend API Route (`src/app/api/financial-trend/route.js`)**: Update to consume `getRecentPromptAnalysis` with a 7-day threshold.

---

## 3. Detailed Design

### 3.1 New Database Query (`getRecentPromptAnalysis`)
We will add `getRecentPromptAnalysis` to `src/lib/database/queries.js`. This function calculates the threshold date and queries the database using `date >= ?` ordered by `date DESC`.

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
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0]; // YYYY-MM-DD

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

This function will be appended to the exports in `queries.js`:
```javascript
module.exports = {
  ...
  getRecentPromptAnalysis,
};
```

### 3.2 Updating API Routes

Both API routes will be updated as follows:

**1. [src/app/api/fundamental/route.js](file:///D:/Programming/opencodeTest/src/app/api/fundamental/route.js)**
```diff
-const { getPromptAnalysis, savePromptAnalysis } = require('../../../lib/database/queries');
+const { getRecentPromptAnalysis, savePromptAnalysis } = require('../../../lib/database/queries');

...

-    // Check DB cache
-    const cached = await getPromptAnalysis(db, symbol, 'fundamental', today);
+    // Check DB cache - 7 days validity
+    const cached = await getRecentPromptAnalysis(db, symbol, 'fundamental', 7);
```

**2. [src/app/api/financial-trend/route.js](file:///D:/Programming/opencodeTest/src/app/api/financial-trend/route.js)**
```diff
-const { getPromptAnalysis, savePromptAnalysis } = require('../../../lib/database/queries');
+const { getRecentPromptAnalysis, savePromptAnalysis } = require('../../../lib/database/queries');

...

-    // Check DB cache for 'financial_trend'
-    const cached = await getPromptAnalysis(db, symbol, 'financial_trend', today);
+    // Check DB cache for 'financial_trend' - 7 days validity
+    const cached = await getRecentPromptAnalysis(db, symbol, 'financial_trend', 7);
```

---

## 4. Verification and Testing Plan
1. **Unit Testing queries.js**: Ensure unit tests for `queries.js` cover `getRecentPromptAnalysis` for both cache-hit (< 7 days) and cache-miss (> 7 days / non-existent) scenarios.
2. **Unit Testing API Routes**: Update integration tests for fundamental and financial-trend API routes to ensure they correctly stub `getRecentPromptAnalysis`.
3. **Execution check**: Run `npx jest` to ensure no regressions.
