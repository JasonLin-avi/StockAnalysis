# Design Spec: 台股 UI 公司名稱顯示優化 (Taiwan Stock UI Name Display)

## 1. Overview
將整個前端介面中所有台股標的從單純顯示代碼（如 `2330.TW`）優化為優先顯示「公司名稱 (股票代碼)」（例如：`台積電 (2330.TW)`）。美股標的若已知中文/英文名稱則保持現有名稱搭配代碼顯示。

---

## 2. Affected UI Components & API Extensions

### 2.1 Backend / API Services

1. **`getLatestPricesAndBacktest(symbols)`** ([`src/services/analysis.service.js`](file:///D:/Programming/StockAnalysis/src/services/analysis.service.js))
   - 在批次取得價格與勝率時，調用 [`src/lib/stock-map.js`](file:///D:/Programming/StockAnalysis/src/lib/stock-map.js) 的 `getCompanyNameByCode` 補齊 `name` 與 `market` 資訊。
   - 回傳格式包含 `name` 欄位（台股回傳中文公司名稱如 `'台積電'`，美股回傳現有名稱）。

2. **`/api/prices` Route** ([`src/app/api/prices/route.js`](file:///D:/Programming/StockAnalysis/src/app/api/prices/route.js))
   - 回傳資料結構為 `{ [symbol]: { price, change, color, name, market, ...backtest } }`。

3. **`performFullAnalysis`** ([`src/services/analysis.service.js`](file:///D:/Programming/StockAnalysis/src/services/analysis.service.js))
   - 分析報告回傳物件新增 `name` 欄位，供個股分析頁使用。

### 2.2 Frontend UI Components

1. **PopularStocks (熱門監控標的)** ([`src/components/PopularStocks.js`](file:///D:/Programming/StockAnalysis/src/components/PopularStocks.js))
   - 標題顯示：主標題顯示 `name` (如 `台積電`)，副標題顯示 `symbol` (`2330.TW`)。

2. **WatchlistTable (追蹤清單與回測表格)** ([`src/components/hub/WatchlistTable.js`](file:///D:/Programming/StockAnalysis/src/components/hub/WatchlistTable.js))
   - 表格「標的 (Symbol)」欄位呈現為 `name (symbol)`，如 `台積電 (2330.TW)`。

3. **LeaderboardPanel (勝率排行榜)** ([`src/components/hub/LeaderboardPanel.js`](file:///D:/Programming/StockAnalysis/src/components/hub/LeaderboardPanel.js))
   - 呈現為 `name (symbol)`。

4. **RecentSearches (最近搜尋)** ([`src/components/RecentSearches.js`](file:///D:/Programming/StockAnalysis/src/components/RecentSearches.js))
   - 卡片標題呈現 `name` (如 `台積電`) 與 `symbol` (`2330.TW`)。

5. **Stock Detail Page & HistoryTracker** ([`src/app/stock/[symbol]/page.js`](file:///D:/Programming/StockAnalysis/src/app/stock/%5Bsymbol%5D/page.js) & [`HistoryTracker.js`](file:///D:/Programming/StockAnalysis/src/components/HistoryTracker.js))
   - 標頭看板顯示 `name (symbol)`。

---

## 3. Self-Review Checklist
- [x] **Placeholder Scan**: 無 TODO / TBD。
- [x] **Consistency**: 全站風格統一採用「公司名稱 (代碼)」。
- [x] **Scope Check**: 專注於前端 UI 呈現與 API 資料層補充 `name`。
