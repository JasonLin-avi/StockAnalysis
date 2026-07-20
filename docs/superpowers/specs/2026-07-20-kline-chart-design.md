# K線技術分析功能設計規格 (Design Spec)

## 概述 (Overview)
在個股分析頁面中新增獨立的 **「K 線技術分析」 (KlineTab)** 分頁。
重用現有 SQLite 資料庫 (`stock_data` 表) 與增量補抓管線 (`syncStockPricesIncremental`)，搭配 TradingView `lightweight-charts` 渲染包含 K 線蠟燭圖 (Candlesticks)、MA 動態均線 (MA5, MA20, MA60) 與成交量 (Volume) 的互動式圖表。

---

## 系統架構與資料流 (System Architecture & Data Flow)

```
[ 前端 K 線 Tab 元件 (KlineTab.jsx) ]
               │
               ▼  HTTP GET /api/stock/[symbol]/kline?range=1Y (可切換 1M/3M/6M/1Y/3Y)
[ K線 API 路由 (src/app/api/stock/[symbol]/kline/route.js) ]
               │
               ├─ 1. 連線至 SQLite (connectToDatabase)
               ├─ 2. 執行現有增量快取 (syncStockPricesIncremental) 補齊缺漏天數
               ├─ 3. 讀取 stock_data (getHistoricalPricesFromDB) 取得歷史 OHLCV
               └─ 4. 計算動態均線 (MA5, MA20, MA60) ➜ 回傳 JSON { candles, volume, ma }
```

---

## 模組與元件變更規格 (Specifications)

### 1. 新增 API 路由：`src/app/api/stock/[symbol]/kline/route.js`
* **HTTP Method**: `GET`
* **Query Params**: `symbol` (股票代號), `range` (選填，預設 `1Y`；可選 `1M`, `3M`, `6M`, `1Y`, `3Y`)
* **職責**:
  1. 連線 SQLite 並執行現有的 `syncStockPricesIncremental` 機制，自動維持最即時的 OHLCV 價格資料。
  2. 讀取 `stock_data` 中的歷史價格點（包含 `date`, `open`, `high`, `low`, `close`, `volume`）。
  3. 動態運算 MA5, MA20, MA60。
  4. 依據 `range` 參數篩選對應區間的數據陣列並回傳。

### 2. 新增前端元件：`src/app/stock/[symbol]/KlineTab.jsx`
* **職責**:
  * 載入並渲染具有互動縮放/拖拽 (Zoom/Pan) 功能的 K 線圖。
  * 提供 `1M`, `3M`, `6M`, `1Y`, `3Y` 時間切換按鈕，點擊時向 API 取得對應範圍數據。
  * 圖表區域採用深色質感外框包覆 (`bg-slate-900/30 border-slate-900 backdrop-blur-sm`)。
  * 包含 K 線蠟燭圖 (Candlestick)、MA5/MA20/MA60 多色均線以及底部成交量 (Volume) 柱狀圖。

### 3. 修改個股分析頁面：`src/app/stock/[symbol]/page.js`
* 新增 Tab 導覽按鈕 `📉 K線技術分析` (`activeTab === 'kline'`)。
* 點擊切換時呈現 `<KlineTab symbol={symbol} />`。

---

## 自自我審查 (Self-Review Checklist)
- [x] **無占位符 (No Placeholders)**：明確指定所有 API 路由路徑、傳參、元件結構與資料庫呼叫。
- [x] **架構一致性 (Consistency)**：100% 重用現有 `stock_data` 表格與 `syncStockPricesIncremental` 增量快取，無重複造輪子。
- [x] **範圍明確 (Clear Scope)**：專注於 K 線分頁、API 與圖表元件，無無關重構。
