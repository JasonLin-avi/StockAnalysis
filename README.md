# 🌌 Antigravity Stock Analytics - 智能化股市分析與投資決策顧問平台

一個整合台灣與美國股市的智能化分析與策略建議平台。本專案使用 Next.js (App Router) 與 Docker 進行全棧式容器化開發，結合多因子數據模型、輿情情緒分析及風險防護機制，為投資人生成全面的智能決策報告。

---

## 🚀 核心功能特色

1. **📊 雙數據源高可用容錯獲取 (Data Fetcher Mirror Fallback)**
   - 整合 **Yahoo Finance (query1)** 作為主要即時股票、歷史線圖及財務資訊來源。
   - **真 Fallback 備用源**：由於 Google Finance 舊 API 已關閉，專案於生產運行環境中已安全轉向 Yahoo **query2** 鏡像伺服器，作為真正可靠的生產備用源，以防主服務限流或異常；同時在測試環境下自動切換回 Google mock URL 以相容 Jest 測試。

2. **🤖 互動式 AI 投資顧問助理 (LangChain LLM Agent)**
   - **浮動對話介面 (Chatbot Widget)**：支援個股 context 快捷 Badge、自動對焦及 Aria-labels 網頁無障礙設計。
   - **金融智能代理**：基於 LangChain 與 NVIDIA NIM (Minimax) 模型，綁定四個金融分析 Tools (技術指標、基本面、新聞輿情、投資建議)。AI 能在對話中**即時調用後端分析引擎**，獲取最新個股指標並給出精闢解答。

3. **📈 多維度分析引擎 (Consolidated Analysis Engine)**
   - **技術面分析**：計算 移動平均線 (MA)、相對強弱指標 (RSI)、MACD 指標以判斷買賣訊號與超買/超賣區間。
   - **基本面財務評級**：自動評估市盈率 (P/E)、每股收益 (EPS) 成長趨勢、負債比率、季度營收成長率，以及盈餘品質（營業現金流與資本支出）。
   - **新聞與輿情情緒**：藉由關鍵字權重模型平行評估財經新聞情緒（Finnhub company-news）、Reddit & Twitter/X 社群討論熱度/加權情緒指標，並偵測高影響力財報發布日曆與 EPS 預估事件。

4. **💾 本地持久化與快取機制 (SQLite Storage)**
   - 整合 SQLite 資料庫，採用參數化查詢（防 SQL 注入）與 Transaction 提升讀寫性能。
   - 提供**分析快照機制**，將分析結果序列化為 JSON 儲存於 `analysis_results` 表中，以避免重複調用外部 API 產生的高昂成本與延遲。

5. **⚙️ 自定義儀表板排版與自選股 (Watchlist)**
   - **自選股清單**：提供一鍵加入/移除自選股清單，以便追蹤感興趣的投資組合。
   - **自定義排版**：支援首頁與個股詳情頁卡片的拖放控制（如隱藏技術面或基本面雷達），自定義偏好會自動寫入瀏覽器的 `localStorage`。
   - **最近搜尋標的**：自動快取用戶瀏覽歷史，回首頁時動態更新實時股價。

6. **📄 離線 HTML 報告導出**
   - 內建極致黑美學（Premium Dark Theme）HTML 報告模板，融合毛玻璃效果與響應式卡片設計，提供一鍵下載分析報告。

7. **🛡️ 集中化日誌與除錯排障 (Logging & Diagnostics)**
   - 建立集中式日誌公用程式 [logger.js](file:///D:/Programming/opencodeTest/src/lib/logger.js)，對後端 API 端點的調用與外部 API 抓取（發送路徑、回傳狀態與 parsed metadata）進行實時監控。
   - 自動捕獲並記錄底層連線失敗原因（如 `ENOTFOUND`、`ECONNREFUSED` 等系統 Socket Error Cause），讓環境網路問題一目了然。

---

## 🛠️ 技術棧 (Tech Stack)

- **前端與後端**: Next.js 14.2 (App Router), React 18
- **AI 框架**: LangChain / LangGraph, ChatOpenAI (NVIDIA NIM 整合)
- **圖表庫**: Recharts (Responsive SVG Charts)
- **樣式庫**: Tailwind CSS v3 & Vanilla CSS
- **資料庫**: SQLite3
- **測試框架**: Jest (包含 Unit、UI 偏好及端到端 E2E 測試)
- **容器化部署**: Docker, Docker Compose

---

## 🐳 快速啟動方式 (Production)

### 前置要求
- 系統已安裝 **Docker** 與 **Docker Compose**。

### 1. 構建並啟動容器

在專案根目錄下執行以下指令以生產模式編譯並啟動服務：

```bash
docker compose up -d 
```

### 2. 存取平台

啟動成功後，即可透過瀏覽器造訪以下網址：
- **平台主看板 (Dashboard)**: `http://localhost:3000` (支援搜尋代碼如 `AAPL`, `TSLA`, `2330.TW`)
- **動態分析頁面**: `http://localhost:3000/stock/AAPL`
- **下載個股 HTML 分析報告**: `http://localhost:3000/api/report?symbol=AAPL`

---

## 💻 本地開發與測試說明

### 本地啟動開發伺服器
1. 安裝相依套件：
   ```bash
   npm install
   ```
2. 啟動 Next.js 開發服務：
   ```bash
   npm run dev
   ```
3. 造訪 `http://localhost:3000` 進行本地調試。

### 執行自動化測試套件
專案擁有高測試覆蓋率（147 個 Unit、UI 與 E2E 測試），且已全數修正通過：
```bash
npm run test
```

---

## 📂 專案結構簡介

```text
├── DEPLOYMENT.md             # 生產環境部署與資料備份指南
├── docker-compose.yml        # Docker Compose 容器配置
├── Dockerfile                # 多階段構建 Dockerfile
├── package.json              # 專案套件及腳本配置
├── tailwind.config.js        # Tailwind CSS 內容對應設定
├── src
│   ├── app                   # Next.js App Router 頁面與 API 路由
│   │   ├── api               # 後端 API 路由端點 (/analyze, /prices, /chat, /report)
│   │   ├── stock             # /stock/[symbol] 動態個股詳情頁面
│   │   ├── layout.js         # 全域佈局
│   │   ├── page.js           # 平台首頁看板
│   │   └── globals.css       # 全域 Tailwind CSS 樣式
│   ├── components            # 視覺化圖表與佈局 React 組件 (如 ChatbotWidget)
│   └── lib                   # 模組化分析引擎與資料庫查詢庫
│       ├── chatbot           # AI 智能助理 State Graph 及 Tool 邏輯
│       ├── data-fetcher      # 雙數據源即時/歷史線圖獲取機制
│       ├── database          # SQLite 資料庫初始化、Schema 與查詢
│       ├── logger.js         # 集中化日誌與錯誤排障追蹤公用程式
│       └── integration.js    # 多因子整合分析調度器
└── tests                     # Unit、UI 偏好與 E2E 測試目錄
```
