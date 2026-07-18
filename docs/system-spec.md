# 系統規格書 (System Specification)

本文件旨在紀錄 Next.js 專案中各核心頁面與元件的完整功能、資料來源與互動行為。作為未來 UI 功能開發與重構的唯一事實來源 (Source of Truth)，確保所有功能在重構過程中得以保留。

## 1. 首頁 (Home Page) - `src/app/page.js`

首頁作為系統入口，提供全域搜尋與近期歷史紀錄的快速存取功能。

### 包含元件與功能描述

*   **`Header`**
    *   **預期功能：** 提供全站導覽列。
    *   **資料來源：** 無（純靜態 UI）。
    *   **互動行為：** 點擊導覽連結跳轉至各功能頁面。
*   **`SearchBar`**
    *   **預期功能：** 提供輸入框供使用者輸入股票代碼（如 AAPL, 2330.TW）以進行搜尋分析。
    *   **資料來源：** 來自使用者手動輸入 (Client-side state)。
    *   **互動行為：** 點擊手動觸發按鈕或按下 Enter 鍵後，透過 Client-side routing (`useRouter`) 跳轉至個股詳細儀表板 (`/stock/[symbol]`)。
*   **`PopularStocks`**
    *   **預期功能：** 顯示市場上熱門股票的跑馬燈或焦點列表。
    *   **資料來源：** 預設或靜態的熱門標的清單。
    *   **互動行為：** 自動展示熱門標的，可能支援點擊跳轉。
*   **`RecentSearches`**
    *   **預期功能：** 顯示使用者最近搜尋過的股票歷史清單。
    *   **資料來源：** 讀取 Local Storage (`antigravity_recent_stocks`) 獲取代碼，接著透過 `/api/prices` 取得即時報價。
    *   **互動行為：** 頁面載入時自動讀取 Local Storage 並非同步抓取 (auto-fetches) 價格；在抓取期間顯示 Pulse loading 動畫；點擊卡片跳轉至對應個股頁面。

---

## 2. 分析中心 (Analytics Hub) - `src/app/hub/page.js`

分析中心提供宏觀的市場觀察，包含關注清單的整體分析與歷史回測排行榜。

### 包含元件與功能描述

*   **`Header`**
    *   **預期功能：** 提供全站導覽列。
*   **`WatchlistTable`**
    *   **預期功能：** 以表格形式展示使用者目前關注的所有股票，包含最新價格與每日漲跌幅。
    *   **資料來源：** 初始讀取 Local Storage (`lib/watchlist-store`)，然後透過 `/api/prices` 取得即時價格。
    *   **互動行為：** 頁面載入時自動抓取資料 (auto-fetches)；載入期間顯示 Skeleton Loading；點擊 "View Report" 連結跳轉至對應個股詳細頁面。
*   **`LeaderboardPanel`**
    *   **預期功能：** 顯示歷史回測表現最佳的股票排行榜（包含勝率、平均報酬率等）。
    *   **資料來源：** 呼叫外部 API (`/api/leaderboard`)。
    *   **互動行為：** 頁面載入時自動非同步抓取 (auto-fetches) 排名資料；點擊排行榜上的個別項目將跳轉至對應個股頁面。

---

## 3. 歷史分析報告頁面 (Reports Page) - `src/app/reports/page.js`

展示系統已完成並儲存的所有個股量化分析報告清單。

### 包含元件與功能描述

*   **`Header`**
    *   **預期功能：** 提供全站導覽列。
*   **頁面主要內容 (Server Component)**
    *   **預期功能：** 網格狀列出資料庫中已持久化的分析報告，展示最新投資建議 (Buy/Sell/Hold) 與報告摘要。
    *   **資料來源：** 伺服器端讀取 SQLite 資料庫 (`getAllAnalyzedStocks(db)`)。
    *   **互動行為：** Server-side data fetching（頁面載入時由伺服器抓取資料，無額外 Client API 請求）；每張報告卡片提供兩個按鈕：「儀表板」(跳轉至 `/stock/[symbol]`) 與「下載報告」(開新分頁觸發 `/api/report?symbol=...`)。

---

## 4. 關注清單頁面 (Watchlist Page) - `src/app/watchlist/page.js`

提供專屬頁面管理與檢視使用者手動標記的關注股票。

### 包含元件與功能描述

*   **`Header`**
    *   **預期功能：** 提供全站導覽列。
*   **頁面主要內容 (Client Component)**
    *   **預期功能：** 以卡片網格形式呈現關注的股票代碼、最新價格與漲跌幅資訊。
    *   **資料來源：** 讀取 Local Storage (`getWatchlist()`) 獲取代碼清單，再透過 `/api/prices` 查詢最新報價。
    *   **互動行為：** 元件掛載時自動讀取清單並非同步抓取 (auto-fetches) 價格；抓取中顯示 Skeleton 動畫；點擊卡片跳轉至個股分析頁面。

---

## 5. 個股詳細儀表板 (Stock Detail Dashboard) - `src/app/stock/[symbol]/page.js`

提供針對單一股票的深度量化分析，包含技術面、基本面、新聞情緒與回測結果。

### 包含元件與功能描述

*   **`Header`**
    *   **預期功能：** 提供全站導覽列。
*   **頁面主要操作區**
    *   **預期功能：** 嘗試獲取最新的快取分析結果，或允許使用者手動觸發新的分析計算。
    *   **資料來源：** 掛載時自動抓取 `/api/analysis/latest` 嘗試獲取快取；手動點擊按鈕時觸發 `/api/analyze` 進行重新分析。
    *   **互動行為：** 提供手動觸發按鈕 (「開始產生分析報告」或「重新執行最新量化分析」) 以執行耗時的後端運算，運算期間會有 Loading 狀態提示；並提供直接下載 HTML 報告的連結按鈕。
*   **`WatchButton`**
    *   **預期功能：** 允許使用者將該股票加入或移出關注清單。
    *   **資料來源：** 操作 Local Storage (`lib/watchlist-store`)。
    *   **互動行為：** 點擊星號按鈕可立即切換 (Toggle) 關注狀態。
*   **`HistoryTracker`**
    *   **預期功能：** 隱藏的行為元件，負責將使用者此次瀏覽紀錄寫入近期搜尋紀錄中，供首頁使用。
    *   **資料來源：** 將代碼與名稱寫入 Local Storage (`antigravity_recent_stocks`)。
    *   **互動行為：** 只有當成功獲取分析資料時自動執行 (runs automatically on mount/update)；會自動處理去重，並確保最多保留最新 8 筆紀錄。
*   **`InvestmentAdvicePanel`**
    *   **預期功能：** 顯示系統給予的投資建議與理由摘要。
    *   **資料來源：** 透過 Props 傳入上層獲取的分析資料 (`data.advice`)。
*   **`CustomizableLayout`**
    *   **預期功能：** 作為圖表與資料面板的 UI 容器。
    *   **資料來源：** 包含子元件 (children props)。
*   **`TechnicalIndicatorsChart`, `FundamentalAnalysisChart`, `NewsSentimentChart`**
    *   **預期功能：** 分別繪製技術指標、基本面雷達/長條圖與新聞情緒分析圖表。
    *   **資料來源：** 皆透過 Props 從上層頁面傳入對應的資料段 (`data.historicalData`, `data.technical`, `data.fundamental`, `data.news`)。
*   **`HistoricalBacktestPanel`**
    *   **預期功能：** 展示基於特定策略對該股票進行歷史回測的績效結果。
    *   **資料來源：** 透過 Props 傳入 (`data.backtest`)。
