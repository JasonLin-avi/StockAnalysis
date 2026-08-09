# Caching Historical AI Technical Backtest Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `backtest_records` SQLite/Turso table and integrate caching logic into `backtest.service.js`, `/api/backtest/predict`, and `/api/backtest/evaluate` to eliminate redundant LLM API calls.

**Architecture:** Add `backtest_records` table definition in schema and connection files. Implement `getCachedBacktestRecord`, `saveBacktestForecast`, and `updateBacktestEvaluation` in `backtest.service.js`. Check cache in `/api/backtest/predict` before calling Gemini, and update cache in `/api/backtest/evaluate`.

**Tech Stack:** Next.js (App Router), Node.js, LibSQL / SQLite, Jest, React Testing Library.

## Global Constraints
- Must maintain backward compatibility with local SQLite and Turso LibSQL adapter.
- Must ensure clean separation between forecast creation and evaluation update.

---

### Task 1: Database Schema & Service Caching Helpers

**Files:**
- Modify: `src/external/database/schema.js`
- Modify: `src/external/database/connection.js`
- Modify: `src/services/backtest.service.js`
- Test: `tests/services/backtest.service.test.js`

**Interfaces:**
- Produces: `getCachedBacktestRecord({ symbol, cutoffDate, lookbackDays, predictionDays })`, `saveBacktestForecast({ symbol, cutoffDate, lookbackDays, predictionDays, forecast })`, `updateBacktestEvaluation({ symbol, cutoffDate, lookbackDays, predictionDays, evaluation })`

- [ ] **Step 1: Write failing unit tests for backtest service cache helpers**

Update `tests/services/backtest.service.test.js` to include tests for `getCachedBacktestRecord`, `saveBacktestForecast`, and `updateBacktestEvaluation`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/services/backtest.service.test.js`
Expected: FAIL due to missing functions or table.

- [ ] **Step 3: Add `backtest_records` schema to `schema.js` and `connection.js`**

Add table definition:
```sql
CREATE TABLE IF NOT EXISTS backtest_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  cutoff_date DATE NOT NULL,
  lookback_days INTEGER NOT NULL DEFAULT 60,
  prediction_days INTEGER NOT NULL DEFAULT 20,
  forecast_json TEXT NOT NULL,
  evaluation_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(symbol, cutoff_date, lookback_days, prediction_days)
);
```

- [ ] **Step 4: Implement caching helper functions in `backtest.service.js`**

Implement `getCachedBacktestRecord`, `saveBacktestForecast`, and `updateBacktestEvaluation`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest tests/services/backtest.service.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/external/database/schema.js src/external/database/connection.js src/services/backtest.service.js tests/services/backtest.service.test.js
git commit -m "feat: add backtest_records table and caching helper functions"
```

---

### Task 2: Integration with `/api/backtest/predict` and `/api/backtest/evaluate` Route Handlers

**Files:**
- Modify: `src/app/api/backtest/predict/route.js`
- Modify: `src/app/api/backtest/evaluate/route.js`
- Test: `tests/api/backtest.route.test.js`

**Interfaces:**
- Consumes: `getCachedBacktestRecord`, `saveBacktestForecast`, `updateBacktestEvaluation` from `backtest.service.js`

- [ ] **Step 1: Write failing route integration test for cache hit/miss**

Update `tests/api/backtest.route.test.js` to test returning cached predictions without triggering LLM calls when cache hit occurs.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/api/backtest.route.test.js`
Expected: FAIL

- [ ] **Step 3: Modify `/api/backtest/predict/route.js` to use DB cache**

Check `getCachedBacktestRecord` before calling Gemini, save with `saveBacktestForecast` after calling Gemini.

- [ ] **Step 4: Modify `/api/backtest/evaluate/route.js` to check and update DB cache**

Check `getCachedBacktestRecord` for `evaluation_json`. If missing, evaluate and update with `updateBacktestEvaluation`.

- [ ] **Step 5: Run route integration tests to verify they pass**

Run: `npx jest tests/api/backtest.route.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/backtest/predict/route.js src/app/api/backtest/evaluate/route.js tests/api/backtest.route.test.js
git commit -m "feat: integrate database caching into predict and evaluate API routes"
```
