### Task: Create System Specification Document

**Objective:**
Analyze the entire Next.js codebase (specifically the `src/app` and `src/components` directories) to understand and document the complete functionality of each page. The goal is to create a comprehensive `docs/system-spec.md` that serves as the source of truth for all UI features, ensuring no features are accidentally dropped in future refactoring.

**Steps:**
1. Review the following key pages:
   - Home Page (`src/app/page.js`)
   - Analytics Hub (`src/app/hub/page.js`)
   - Reports Page (`src/app/reports/page.js`)
   - Watchlist Page (`src/app/watchlist/page.js`)
   - Stock Detail Dashboard (`src/app/stock/[symbol]/page.js`)
2. For each page, identify all components rendered (e.g., Header, SearchBar, PopularStocks, WatchlistTable, HistoricalBacktestPanel, etc.).
3. Document the expected functionality, data source (e.g., local storage, SQLite, external API), and interactive behaviors (e.g., "manual trigger button", "auto-fetches prices") for each component.
4. Write the final analysis into a structured markdown document at `docs/system-spec.md`.
5. Ensure the document is written in Traditional Chinese (繁體中文) per global constraints.

**Deliverable:**
Write the full specification to `docs/system-spec.md` and commit the file with a message like `docs: add comprehensive system specification`.
