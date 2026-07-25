# Design Specification - Backend Architecture Refactoring (Clean Architecture)

- **Date**: 2026-07-26
- **Status**: APPROVED (by User)
- **Goal**: Align backend structure with the guidelines of `Agent.md` using Clean Architecture and Separation of Concerns.

---

## 1. Directory Structure Blueprint

As specified in `Agent.md`, the code must be strictly categorized into:

```text
src/
├── app/                  # Next.js App Router (Presentation Layer)
│   ├── api/              # API Route Handlers (HTTP entry, parameters validation, service delegation)
│   └── (routes)/         # UI Components Layer
├── services/             # Application / Business Logic Layer (Services/Facade)
└── external/             # Infrastructure / Adapter Layer (Database, External APIs, AI client)
```

---

## 2. Core Refactoring Steps & Test Alignment (Vertical Slices)

To ensure safety and continuous functionality, refactoring will be performed step-by-step using functional vertical slices.

### Step 1: Database Infrastructure Migration
- **Changes**:
  - Move `src/lib/database` to `src/external/database`.
  - Maintain `libsql-adapter.js`, `connection.js`, `queries.js`, and `migration.js` under `src/external/database`.
  - Update all imports across the codebase that reference the old path.
- **Verification / Test Cases**:
  - [database.test.js](file:///D:/Programming/StockAnalysis/tests/unit/database.test.js)
  - [libsql-adapter.test.js](file:///D:/Programming/StockAnalysis/tests/unit/libsql-adapter.test.js)

### Step 2: Watchlist Module Refactoring
- **Changes**:
  - Create `src/services/watchlist.service.js` to handle all operations (GET, ADD, REMOVE). It communicates with `src/external/database`.
  - Refactor `src/app/api/watchlist/route.js` to ONLY parse requests, call `watchlist.service.js`, and return `NextResponse`. Remove database connection/query logic from the route handler.
- **Verification / Test Cases**:
  - New test: `tests/unit/watchlist-service.test.js` to test the business logic of `watchlist.service.js`.
  - [watchlist-api.test.js](file:///D:/Programming/StockAnalysis/tests/api/watchlist-api.test.js)
  - [watchlist-store.test.js](file:///D:/Programming/StockAnalysis/tests/unit/watchlist-store.test.js)

### Step 3: Data Fetcher Infrastructure & Data Sync Service Refactoring
- **Changes**:
  - Move `src/lib/data-fetcher` to `src/external/data-fetcher`.
  - Strip the database write logic out of the fetcher (like `syncStockPricesIncremental`).
  - Create `src/services/data-sync.service.js` to coordinate between `src/external/data-fetcher` and `src/external/database` for price sync.
- **Verification / Test Cases**:
  - [data-fetcher.test.js](file:///D:/Programming/StockAnalysis/tests/unit/data-fetcher.test.js)
  - New test: `tests/unit/data-sync-service.test.js` to test data synchronization workflow.

### Step 4: Core Analysis Module Refactoring
- **Changes**:
  - Create `src/services/analysis.service.js` by refactoring `src/lib/integration.js` (`performFullAnalysis`).
  - It will coordinate `src/external/data-fetcher`, `src/services/data-sync.service.js`, and local analytics logic (e.g. `src/lib/technical-analysis`).
  - Refactor `src/app/api/analyze/route.js` and `src/app/api/prices/route.js` to delegating calls to `analysis.service.js`.
- **Verification / Test Cases**:
  - [technical-analysis.test.js](file:///D:/Programming/StockAnalysis/tests/unit/technical-analysis.test.js)
  - [fundamental-analysis.test.js](file:///D:/Programming/StockAnalysis/tests/unit/fundamental-analysis.test.js)
  - [news-analysis.test.js](file:///D:/Programming/StockAnalysis/tests/unit/news-analysis.test.js)
  - [prices.test.js](file:///D:/Programming/StockAnalysis/tests/api/prices.test.js)

### Step 5: AI Chatbot, Advisor, and Report Refactoring
- **Changes**:
  - Move `src/lib/gemini` to `src/external/gemini` (AI Infrastructure).
  - Create `src/services/chatbot.service.js` and `src/services/report.service.js`.
  - Refactor `src/app/api/chat/route.js` and `src/app/api/report/route.js` to route requests through services.
- **Verification / Test Cases**:
  - [chatbot-agent.test.js](file:///D:/Programming/StockAnalysis/tests/unit/chatbot-agent.test.js)
  - [report-generator.test.js](file:///D:/Programming/StockAnalysis/tests/unit/report-generator.test.js)

---

## 3. Data Flow and Dependency Rule

All modules must adhere to the single-directional dependency rule:
`Presentation (API/UI)` -> `Business Logic (Services)` -> `Infrastructure (External/Database)`

Services must not import or be aware of HTTP parameters, status codes, or framework-specific items (like Next.js `NextRequest` / `NextResponse`).

---

## 4. Error Handling Strategy

- **Infrastructure Layer**: Catches and translates raw network/database errors into standard exceptions (with descriptive logging but without exposing secrets).
- **Service Layer**: Handles flow control errors and raises business domain errors.
- **Presentation Layer**: Catches all errors from services and formats clean JSON responses with corresponding HTTP status codes (e.g., `400 Bad Request` for validation issues, `500 Internal Server Error` for service failures).
