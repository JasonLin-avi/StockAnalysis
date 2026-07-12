# 設計規格書：最近搜尋股票歷史與實時報價 API 整合

此設計規格說明如何在「智能化股市分析與投資決策顧問平台」的首頁新增「最近搜尋標的」區塊，利用瀏覽器端 `localStorage` 進行儲存（最多 8 筆），並搭配全新的實時報價 API 來動態更新報價與漲跌幅。

---

## 1. 需求與規格概要

### 儲存邏輯 (LocalStorage)
* **儲存鍵值**：`antigravity_recent_stocks`。
* **資料欄位**：僅儲存代碼 `symbol`（String）與公司名稱 `name`（String），以避免在本地留下過期價格。
* **容量上限**：最多記錄 `8` 檔股票。
* **排序與去重**：採 FIFO（先進先出）邏輯。新檢視的股票排在最前面；若檢視已存在的股票，則將其移至最前面並更新為最新排名；超出 8 檔時裁切最舊的一筆。
* **空值處理**：LocalStorage 無記錄時，首頁完全不顯示此區塊（不顯示標題與網格）。

### 實時數據流 (API)
* **批次報價端點**：新增 `/api/prices?symbols=AAPL,TSLA...` API 路由。
* **載入流**：首頁載入時，前端動態獲取「熱門標的」與「最近搜尋」的最新報價，並更新畫面卡片。
* **骨架屏**：在 API 回傳數據前，卡片價格會顯示一個精緻的閃爍脈衝骨架屏（Pulse Skeleton）。

---

## 2. 系統架構與檔案變更

### 變更檔案清單

```text
├── docs/superpowers/specs/2026-07-12-recent-searches-design.md # 本設計規格書
├── src
│   ├── app
│   │   ├── api
│   │   │   └── prices
│   │   │       └── route.js   # 新增：批次實時報價 API 端點
│   │   └── page.js            # 修改：首頁整合 RecentSearches 組件
│   │   └── stock
│   │       └── [symbol]
│   │           └── page.js    # 修改：詳情頁掛載 HistoryTracker
│   └── components
│       ├── RecentSearches.js  # 新增：最近搜尋卡片列表組件
│       └── HistoryTracker.js  # 新增：隱藏的用戶端歷史記錄寫入器
```

### 詳細檔案設計

#### A. 實時報價 API: `src/app/api/prices/route.js`
* 接收 `GET /api/prices?symbols=AAPL,TSLA,2330.TW`。
* 呼叫 `fetchStockData(symbol)` 對接 Yahoo Finance 開放介面，快速查詢實時價格、漲跌幅，並格式化為 JSON 回傳。
* 回傳格式：
  ```json
  {
    "AAPL": { "price": "$315.32", "change": "-0.28%", "color": "text-rose-400" },
    "TSLA": { "price": "$248.50", "change": "+2.45%", "color": "text-emerald-400" }
  }
  ```

#### B. 隱藏式歷史記錄寫入器: `src/components/HistoryTracker.js`
* 為 `'use client'` 組件，接收 `symbol` 與 `name`。
* 在 `useEffect` 中讀取並更新 `localStorage` 中的 `antigravity_recent_stocks` 列表。
* 返回 `null`，不影響個股詳情頁面渲染。

#### C. 最近搜尋卡片組件: `src/components/RecentSearches.js`
* 為 `'use client'` 組件。
* 在 `useEffect` 中讀取 `localStorage` 的股票清單。
* 渲染與首頁「熱門追蹤標的」風格一致的 Grid 卡片清單。
* 向 `/api/prices` 獲取最新實時價格並更新卡片。

#### D. 首頁改造: `src/app/page.js`
* 在「熱門追蹤標的」正下方掛載 `<RecentSearches />`。

---

## 3. 測試與驗證計畫

### 單元與 UI 測試
1. **`RecentSearches.test.js`**：驗證 `localStorage` 的正確讀取與空值時不渲染組件行為。
2. **`HistoryTracker.test.js`**：模擬個股頁面載入，斷言 `localStorage` 陣列去重、排序與 8 筆限制完全符合預期。

### E2E 整合驗證
* 模擬使用者在首頁搜尋並進入個股 `AAPL`，然後回到首頁，確認「最近搜尋標的」區塊正常浮現且顯示 `AAPL` 之最新實時報價。
