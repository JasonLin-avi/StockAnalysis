# 實作計畫：市場資金流向分析功能 (Market Funds Flow Analysis)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目標**：新增一個全新的「市場資金流向分析」頁面。透過呼叫 Gemini API (開啟 Google Search 網路搜尋) 分析台股與美股的板塊及科技股資金流向，並將結果以 Markdown 格式緩存至 SQLite 中以避免重複調用。

---

## 全域約束 (Global Constraints)
1. 遵循 Google Engineering Standards，註釋需說明 "Why" 而非 "What"。
2. Next.js 的動態 API 路由必須加上 `export const dynamic = 'force-dynamic'` 以防止 Next.js build-time prerendering 錯誤。
3. 排版樣式使用平台的暗色調科技感設計（細邊框、半透明、Emerald 與 Rose 表示漲跌）。

---

### Task 1: 擴充資料庫 Schema

**檔案**：
* 編輯：`src/lib/database/schema.js`
* 編輯：`src/lib/database/connection.js`

- [ ] **Step 1: 在 `schema.js` 中新增 `market_funds_flow` 表定義**
  
  在 `schema` SQL 字串最後，加入建立快取資料表的 SQL 語句：
  ```sql
  CREATE TABLE IF NOT EXISTS market_funds_flow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market TEXT NOT NULL,
    date DATE NOT NULL,
    prompt TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(market, date)
  );
  ```

- [ ] **Step 2: 在 `connection.js` 中實作動態 schema 檢查**
  
  在 `connectToDatabase` 建立資料庫後，執行檢查確保該資料表存在（防止實體 db 檔案已存在而未更新的狀況）。

---

### Task 2: 建立資料庫讀寫 Queries

**檔案**：
* 編輯：`src/lib/database/queries.js`

- [ ] **Step 1: 新增讀取與存入資金流向快取的資料庫查詢方法**
  
  在 `queries.js` 末尾匯出並新增以下方法：
  * `getMarketFundsFlow(db, market, date)`：查詢資料庫中特定日期和市場的資金流向紀錄。
  * `saveMarketFundsFlow(db, market, date, prompt, content)`：使用 `INSERT OR REPLACE` 將分析寫入資料庫快取。

---

### Task 3: 實作後端 API 端點與 Gemini 整合

**檔案**：
* 建立：`src/app/api/market/funds-flow/route.js`

- [ ] **Step 1: 建立資金流向 API 路由處理常式**
  
  * 引入 `connectToDatabase`、`getMarketFundsFlow`、`saveMarketFundsFlow`。
  * 獲取 GET/POST 中的 `market` (TW/US) 與 `date` 參數（預設為今日）。
  * 若資料庫存在快取，且快取中使用的 prompt 與系統定義之 base prompt 一致，直接回傳。
  * 若無快取，載入 base prompt，將 `{date}` 和 `{market}`（置換為「台股」或「美股」）進行動態置換。
  * 呼叫 Gemini 服務（帶有 `googleSearch` 工具），將取得的 Markdown 內容存入資料庫後回傳。
  
  *注：Gemini 呼叫的 wrapper 需確保在無 API Key 時優雅回傳提示用的 Markdown placeholder。*

---

### Task 4: 新增前端 /funds-flow 頁面與組件

**檔案**：
* 建立：`src/app/funds-flow/page.js`
* 編輯：`src/components/Header.js`

- [ ] **Step 1: 建立 `/funds-flow` 頁面與狀態管理**
  
  實作市場選擇（台股/美股）與日期選擇，使用 `fetch` 呼叫 `/api/market/funds-flow` 獲取數據。

- [ ] **Step 2: 整合 Markdown 渲染與樣式優化**
  
  使用 `react-markdown` 渲染回傳內容，對 `h1`, `h2`, `table`, `ul` 加入 Tailwind CSS 樣式，使其具備高質感科技暗色主題。

- [ ] **Step 3: Header 導覽列新增頂級連結**
  
  在 `Header.js` 中新增「市場資金流」的選單按鈕（與「量化戰情室」及「市場看板」並列）。

---

### Task 5: 驗證與測試

- [ ] **Step 1: 建立單元測試驗證 API 端點**
  
  建立 `tests/api/funds-flow.test.js` 以驗證快取命中與置換邏輯。

- [ ] **Step 2: 執行 Production Build 確保無編譯錯誤**
  
  執行 `npm run build` 確認正常。
