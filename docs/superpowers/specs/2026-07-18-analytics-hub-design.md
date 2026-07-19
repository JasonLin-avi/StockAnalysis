# Analytics Hub (Reports) Design Specification

## 1. Overview
The Analytics Hub (`/reports` route) serves as a quantitative stock market dashboard. It aggregates data for user-tracked stocks (Watchlist) and provides a dynamic top-movers scanner (Leaderboard) powered by historical backtesting. The UI follows a premium dark glassmorphism aesthetic with seamless, skeleton-based client-side loading.

## 2. Architecture & Data Flow

### 2.1 Watchlist Analytics
- **Storage**: A new SQLite table `watchlist` will store `symbol` (e.g., 'AAPL') and `added_at` timestamp.
- **API**: `/api/watchlist` will provide GET, POST (add), and DELETE (remove) operations.
- **Data Hydration**: The frontend will fetch the list of symbols, then asynchronously request technical indicators (RSI) and historical backtest win rates (5d/10d/20d) for each symbol via existing APIs.

### 2.2 Backtest Leaderboard
- **Compute Strategy**: A dedicated service will calculate the 5-day historical win probability for a curated core list of high-liquidity stocks (AAPL, MSFT, TSLA, NVDA, GOOGL).
- **Output**: The API will return the Top 3 stocks with the highest win probability and their average expected returns.

## 3. UI/UX Design

### 3.1 Layout
- **Theme**: Deep slate/indigo dark mode (`bg-slate-950`) with translucent glass panels (`bg-slate-900/30`, `backdrop-blur`).
- **Grid Structure**: 
  - Left Panel (60% width): Watchlist Analytics table.
  - Right Panel (40% width): Backtest Leaderboard cards.

### 3.2 Loading Experience
- **Client-Side Rendering (CSR)**: The page layout loads instantly.
- **Skeleton UI**: Data-heavy components display breathing/pulse skeleton animations (`animate-pulse` with slate grey placeholders) while fetching.
- **Progressive Reveal**: Components fade in individually as their specific API calls resolve, ensuring the user is never blocked by a slow calculation.

## 4. Components

### 4.1 `WatchlistTable`
- Columns: Symbol, Last Price, RSI, 5-Day Win Rate, 10-Day Win Rate.
- Accent Colors: Emerald Green for high win rates/bullish RSI, Rose Red for bearish signals.

### 4.2 `LeaderboardWidget`
- Displays Top 3 stocks.
- Each row highlights the massive 5-Day Win Rate percentage, the symbol, and the expected average return.

## 5. Scope & Constraints
- Authentication is deferred; the watchlist is global for the single-user local environment.
- Leaderboard scanning is limited to the predefined 5 tickers to ensure acceptable real-time response times without aggressive caching.
