# Backend Architecture Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the codebase to align with the Clean Architecture guidelines specified in `Agent.md`.

**Architecture:** Implement three clear structural layers (Presentation, Business Logic, and Infrastructure) to segregate HTTP endpoints, domain processes, and database/third-party API clients.

**Tech Stack:** Next.js, Node.js, SQLite (via @libsql/client adapter), Jest, TypeScript/JavaScript.

## Global Constraints
- **Separation of Concerns**: Presentation (API) layer must only parse, delegate to services, and format response. Absolutely no business or db query logic is allowed in API route handlers.
- **Dependency Rule**: Dependencies must strictly flow one-way: `Presentation` -> `Business Logic` -> `Infrastructure`. Service layer must not know about HTTP requests/NextResponse objects.
- **TDD Requirement**: Write or update tests to fail first (or verify path errors) before fixing paths or implementing services. Maintain 100% test success status.

---

### Task 1: Database Infrastructure Migration

**Files:**
- Create/Move: `src/external/database/*` (migrated from `src/lib/database/*`)
- Modify: `src/lib/integration.js`, `src/app/api/watchlist/route.js`, `tests/unit/database.test.js`, `tests/unit/libsql-adapter.test.js`

**Interfaces:**
- Consumes: None (Root database adapter)
- Produces: `connectToDatabase` and `getActiveDatabase` under `src/external/database/connection` for all services.

- [ ] **Step 1: Move database files to the external directory**

Run `git mv` to preserve history:
```bash
git mv src/lib/database src/external/database
```

- [ ] **Step 2: Update relative imports inside the migrated database files**

Verify that all internal require statements in `src/external/database/connection.js` are resolved correctly (they should point to `./libsql-adapter` and `./schema`).

- [ ] **Step 3: Update database test files with failing imports**

Modify `tests/unit/database.test.js` and `tests/unit/libsql-adapter.test.js` to change import paths from `../../src/lib/database/...` to `../../src/external/database/...`.
Run tests to verify they fail due to other codebase references needing updates:
Run: `npx jest tests/unit/database.test.js`

- [ ] **Step 4: Update other files referencing database**

Update imports in the following files:
- `src/lib/integration.js`: change `require('./database/connection')` to `require('../external/database/connection')` and queries to `require('../external/database/queries')`.
- `src/app/api/watchlist/route.js`: change `sqlite3 from '@/lib/database/libsql-adapter'` to `sqlite3 from '@/external/database/libsql-adapter'`.
- Modify all other references in `src/lib` and `src/app/api` (e.g. `src/lib/data-fetcher/index.js`, `src/lib/database/migration.js`).

- [ ] **Step 5: Run tests and commit**

Run: `npm test`
Expected: PASS all 37 test suites.
Commit:
```bash
git add src/external/database
git commit -a -m "refactor: migrate database module to src/external/database"
```

---

### Task 2: Watchlist Module Refactoring

**Files:**
- Create: `src/services/watchlist.service.js`
- Modify: `src/app/api/watchlist/route.js`
- Test: `tests/unit/watchlist-service.test.js`, `tests/api/watchlist-api.test.js`

**Interfaces:**
- Consumes: `src/external/database/connection`, `src/external/database/queries`
- Produces: `watchlistService.getWatchlistSymbols()`, `watchlistService.addSymbolToWatchlist(symbol)`, `watchlistService.removeSymbolFromWatchlist(symbol)`

- [ ] **Step 1: Create failing watchlist service unit tests**

Create `tests/unit/watchlist-service.test.js`:
```javascript
const { getWatchlistSymbols, addSymbolToWatchlist } = require('../../src/services/watchlist.service');

describe('Watchlist Service', () => {
  it('should fetch watchlist symbols', async () => {
    // Expect exception or undefined as file does not exist yet
    const symbols = await getWatchlistSymbols();
    expect(Array.isArray(symbols)).toBe(true);
  });
});
```
Run tests: `npx jest tests/unit/watchlist-service.test.js` (Expected to FAIL)

- [ ] **Step 2: Implement watchlist service**

Create `src/services/watchlist.service.js`:
```javascript
const { getActiveDatabase, connectToDatabase } = require('../external/database/connection');

async function getWatchlistSymbols() {
  const db = getActiveDatabase() || await connectToDatabase();
  return new Promise((resolve, reject) => {
    db.all("SELECT symbol FROM watchlist ORDER BY added_at DESC", [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(row => row.symbol));
    });
  });
}

async function addSymbolToWatchlist(symbol) {
  if (!symbol) throw new Error("Missing symbol");
  const db = getActiveDatabase() || await connectToDatabase();
  return new Promise((resolve, reject) => {
    db.run("INSERT OR IGNORE INTO watchlist (symbol) VALUES (?)", [symbol.toUpperCase()], function(err) {
      if (err) return reject(err);
      resolve({ success: true });
    });
  });
}

module.exports = { getWatchlistSymbols, addSymbolToWatchlist };
```

- [ ] **Step 3: Run service tests to verify they pass**

Run: `npx jest tests/unit/watchlist-service.test.js`
Expected: PASS

- [ ] **Step 4: Refactor watchlist API route handler**

Modify `src/app/api/watchlist/route.js` to strictly use the service layer:
```javascript
import { NextResponse } from 'next/server';
const { getWatchlistSymbols, addSymbolToWatchlist } = require('@/services/watchlist.service');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const symbols = await getWatchlistSymbols();
    return NextResponse.json(symbols);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const symbol = body.symbol;
    if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    
    await addSymbolToWatchlist(symbol);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Invalid Request' }, { status: 400 });
  }
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npx jest tests/api/watchlist-api.test.js`
Expected: PASS
Commit:
```bash
git add src/services/watchlist.service.js src/app/api/watchlist/route.js tests/unit/watchlist-service.test.js
git commit -m "feat: refactor watchlist to use Clean Architecture service layer"
```

---

### Task 3: Data Fetcher Infrastructure & Data Sync Service Refactoring

**Files:**
- Create/Move: `src/external/data-fetcher/*` (migrated from `src/lib/data-fetcher/*`)
- Create: `src/services/data-sync.service.js`
- Modify: `tests/unit/data-fetcher.test.js`

**Interfaces:**
- Consumes: `src/external/data-fetcher` APIs
- Produces: `dataSyncService.syncStockPrices(db, stockId, ticker)`

- [ ] **Step 1: Move data fetcher to external folder**

Run:
```bash
git mv src/lib/data-fetcher src/external/data-fetcher
```

- [ ] **Step 2: Update import paths in data-fetcher tests**

Update `tests/unit/data-fetcher.test.js` import references from `../../src/lib/data-fetcher` to `../../src/external/data-fetcher`.
Run test and expect failures since relative imports within integration/other scripts are broken.

- [ ] **Step 3: Create Data Sync Service**

Create `src/services/data-sync.service.js` to absorb the database synchronizations from the fetcher:
```javascript
const { syncStockPricesIncremental } = require('../external/data-fetcher'); // Assuming sync logic moved here or kept as service helper

async function syncStockPrices(db, stockId, ticker) {
  // Handles coordination of fetching historical and saving to database
  return syncStockPricesIncremental(db, stockId, ticker);
}

module.exports = { syncStockPrices };
```

- [ ] **Step 4: Fix all fetcher import references across codebase**

Search for `require('./data-fetcher')` or similar and redirect to `require('../external/data-fetcher')`.

- [ ] **Step 5: Run tests and commit**

Run: `npm test`
Expected: PASS
Commit:
```bash
git add src/external/data-fetcher src/services/data-sync.service.js
git commit -a -m "refactor: migrate data fetcher to external and setup data sync service"
```

---

### Task 4: Core Analysis Module Refactoring

**Files:**
- Create: `src/services/analysis.service.js` (refactored from `src/lib/integration.js`)
- Modify: `src/app/api/analyze/route.js`, `src/app/api/prices/route.js`
- Test: `tests/api/prices.test.js`

**Interfaces:**
- Consumes: `src/external/data-fetcher`, `src/services/data-sync.service.js`, `src/external/database`
- Produces: `analysisService.performFullAnalysis(symbol)`

- [ ] **Step 1: Write failing service test**

Create `tests/unit/analysis-service.test.js` to ensure the service executes the main stock integration flow:
```javascript
const { performFullAnalysis } = require('../../src/services/analysis.service');

describe('Analysis Service', () => {
  it('should run performFullAnalysis', async () => {
    // will fail initially as module doesn't exist
    await expect(performFullAnalysis('AAPL')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Implement Analysis Service**

Create `src/services/analysis.service.js` by moving content from `src/lib/integration.js`. Change import references to point to `src/external/data-fetcher`, `src/external/database/connection` etc.

- [ ] **Step 3: Refactor Route Handlers**

Modify `src/app/api/analyze/route.js` and `src/app/api/prices/route.js` to use `analysis.service.js` instead of the raw `integration.js`. Remove require statements pointing to `src/lib/database` or `src/lib/data-fetcher` from the API route files.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/services/analysis.service.js src/app/api/analyze/route.js src/app/api/prices/route.js
git commit -m "feat: refactor performFullAnalysis core integration flow to services layer"
```

---

### Task 5: AI Chatbot, Advisor, and Report Refactoring

**Files:**
- Create: `src/services/chatbot.service.js`, `src/services/report.service.js`
- Move: `src/lib/gemini` to `src/external/gemini`
- Modify: `src/app/api/chat/route.js`, `src/app/api/report/route.js`

**Interfaces:**
- Consumes: `src/external/gemini` AI Client
- Produces: `chatbotService.handleChatResponse()`, `reportService.generateReport()`

- [ ] **Step 1: Move Gemini API Client**

Run:
```bash
git mv src/lib/gemini src/external/gemini
```

- [ ] **Step 2: Create Chatbot Service**

Create `src/services/chatbot.service.js` by extracting LLM interaction details from `src/app/api/chat/route.js` and moving them here.

- [ ] **Step 3: Create Report Service**

Create `src/services/report.service.js` to wrap report compilation and filesystem operations, delegating to PDF/markdown generators.

- [ ] **Step 4: Refactor Chat/Report APIs**

Update API routes `src/app/api/chat/route.js` and `src/app/api/report/route.js` to call the newly created services.

- [ ] **Step 5: Run tests and commit**

Run: `npm test`
Expected: PASS
Commit:
```bash
git commit -a -m "refactor: finalize backend clean architecture refactoring by wrapping chatbot and report in service layers"
```
