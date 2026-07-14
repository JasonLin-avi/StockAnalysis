# Watchlist Feature Design Spec

## 1. Overview
The Watchlist feature allows users to "star" or "watch" specific stocks and view them all on a dedicated dashboard page. The list will persist locally in the user's browser, and the dashboard will fetch real-time quotes to provide an at-a-glance view of their portfolio's daily performance.

## 2. Architecture & Data Flow
- **Data Storage**: Client-side `localStorage`. No backend database tables required.
- **Rendering Strategy**: The new page will use Client-Side Rendering (`"use client"`) to access `localStorage`, followed by an asynchronous API fetch to hydrate real-time prices.
- **Backend API**: We will utilize the existing `GET /api/prices?symbols=...` which already supports comma-separated batch fetching.

## 3. Components Design

### 3.1 `src/lib/watchlist-store.js`
A utility module for abstracting local storage access.
- `getWatchlist()`: Returns an array of string symbols e.g., `['AAPL', 'TSLA']`.
- `addWatch(symbol)`: Pushes a symbol to the array.
- `removeWatch(symbol)`: Removes a symbol.
- Both add and remove methods will dispatch a window-level `CustomEvent('watchlist-updated')` to sync UI states across the app without full reloads.

### 3.2 `src/components/WatchButton.js`
- A reusable Client Component (`"use client"`).
- Takes `symbol` as a prop.
- Displays an SVG Star icon (filled yellow if watched, empty outline if not).
- Includes accessibility attributes (`aria-label="加入關注"` or `"取消關注"`).
- Placed in `src/app/stock/[symbol]/page.js` next to the stock ticker headline.

### 3.3 `src/app/watchlist/page.js`
- The dedicated page route (`"use client"`).
- On mount, reads `getWatchlist()`.
- **Empty State**: Friendly prompt to search for stocks if the list is empty.
- **Loading State**: Displays glassmorphism skeleton cards while `/api/prices` is fetching.
- **Data State**: Renders a CSS Grid of cards displaying stock symbol, price, and daily change percentage (colored red/green based on the existing API output).
- Clicking a card navigates to `/stock/[symbol]`.

### 3.4 `src/components/Header.js`
- Modified to include a new navigation link: `⭐ 我的關注` pointing to `/watchlist`.
- Placed near the SearchBar.

## 4. Testing & Validation
- Ensure adding/removing immediately reflects on the `WatchButton` without page reload.
- Ensure the watchlist page correctly batches the API request (e.g., `?symbols=AAPL,TSLA,NVDA`).
- Verify responsive grid behavior on mobile vs desktop.
