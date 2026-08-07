# 🌌 Antigravity Stock Analytics - 智能化股市分析與投資決策顧問平台

一個整合台灣與美國股市的智能化分析與策略建議平台。本專案使用 Next.js (App Router) 與 Docker 進行全棧式容器化開發，結合多因子數據模型、輿情情緒分析、歷史 K 線 LLM 時點回測及風險防護機制，為投資人生成全面的智能決策報告。

---

## 🚀 核心功能特色

1. **📈 K 線 LLM 歷史時點回測與驗證沙盒 (Point-in-Time Backtest Sandbox)**
   - **Lookahead 物理隔離保護**：設定過去任何指定日期（Cutoff Date），後端嚴格物理切割數據，只傳送基準日前的歷史 OHLCV 與技術指標給 **Predictor LLM**，防止未來看板數據洩漏。
   - **雙 LLM 引擎對比**：Predictor LLM 站在歷史當下給出趨勢預測（多/空/盤整）、目標價區間與推理理由；點擊「揭曉未來」後，解鎖實際歷史走勢並由 **Evaluator 裁判 LLM** 自動比對預測與真實價格變幅，給予 0-100 分精準度評分與覆盤評語。
   - **經典歷史案例選單 (Presets)**：內建經典歷史行情突破案例（如台積電千元前夕、NVIDIA 財報大漲點），可一鍵載入體驗。

2. **📊 雙數據源高可用容錯獲取 (Data Fetcher Mirror Fallback)**
   - 整合 **Yahoo Finance (query1)** 作為主要即時股票、歷史線圖及財務資訊來源。
   - **真 Fallback 備用源**：生產運行環境中安全轉向 Yahoo **query2** 鏡像伺服器，作為真正可靠的生產備用源，以防主服務限流或異常；測試環境自動切換至 Mock 測試源。

3. **🤖 互動式 AI 投資顧問助理 (LangChain & Gemini LLM Agent)**
   - **浮動對話介面 (Chatbot Widget)**：支援個股 context 快捷 Badge、自動對焦及 Aria-labels 網頁無障礙設計。
   - **金融智能代理**：結合 Google Gemini / OpenRouter 雙模型備援機制與金融分析 Tools（技術指標、基本面、新聞輿情、投資建議）。AI 能在對話中**即時調用後端分析引擎**，獲取最新個股指標並給出精闢解答。

4. **📈 多維度分析引擎 (Consolidated Analysis Engine)**
   - **技術面分析**：計算移動平均線 (MA5/20/60)、相對強弱指標 (RSI)、MACD 與布林通道以判斷買賣訊號與超買/超賣區間。
   - **基本面財務評級**：自動評估市盈率 (P/E)、每股收益 (EPS) 成長趨勢、負債比率、季度營收成長率，以及盈餘品質（營業現金流與資本支出）。
   - **新聞與輿情情緒**：藉由關鍵字權重模型平行評估財經新聞情緒（Finnhub company-news）、社群討論熱度/加權情緒指標，並偵測高影響力財報發布日曆與 EPS 預估事件。

5. **🏛️ 數據分析中心與績效排行榜 (Analytics Hub & Leaderboard)**
   - **Analytics Hub (`/hub`)**：整合自選股清單 (`WatchlistTable`) 與回測戰績排行榜 (`LeaderboardPanel`)。
   - **籌碼與資金流向 (`/funds-flow`)**：追蹤三大法人與市場資金流向動態。

6. **💾 SQLite & Turso 雲端資料庫與快取機制**
   - 支援本地 SQLite 及 **Turso Cloud (libSQL)** 雲端資料庫遷移與同步，採用參數化查詢與 Transaction 提升讀寫性能。
   - 提供**分析快照與快取機制**，將分析與回測結果序列化儲存，避免重複調用外部 API 產生高昂成本與延遲。

7. **⚙️ 自定義儀表板排版與 Google 身份驗證**
   - **Google Auth 整合**：提供安全的 Google 帳號登入與個人化偏好同步。
   - **自定義排版**：支援首頁與個股詳情頁卡片的拖放控制（如隱藏技術面或基本面雷達），自定義偏好自動寫入瀏覽器 `localStorage`。

8. **📄 離線 HTML 報告導出**
   - 內建極致黑美學（Premium Dark Theme）HTML 報告模板，融合毛玻璃效果與響應式卡片設計，提供一鍵下載分析報告。

---

## 🛠️ 技術棧 (Tech Stack)

- **前端與後端**: Next.js 14.2 (App Router), React 18
- **AI / LLM 引擎**: Google Gemini AI (GoogleGenAI), OpenRouter Fallback, LangChain
- **圖表庫**: Recharts (Responsive SVG Charts), Lightweight Charts
- **樣式庫**: Tailwind CSS v3 & Vanilla CSS
- **資料庫**: SQLite3 / Turso Cloud (libSQL)
- **測試框架**: Jest (包含 Unit, Service, API Routes, UI 偏好及 E2E 測試)
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
- **K 線 LLM 時點回測沙盒**: `http://localhost:3000/backtest`
- **數據分析中心**: `http://localhost:3000/hub`
- **資金流向分析**: `http://localhost:3000/funds-flow`
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
專案擁有完整的單元、服務、API 與 UI 測試套件：
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
├── docs                      # 設計規格書 (specs) 與實作計畫 (plans)
├── src
│   ├── app                   # Next.js App Router 頁面與 API 路由
│   │   ├── api               # 後端 API 路由 (/analyze, /prices, /chat, /report, /backtest/*)
│   │   ├── backtest          # /backtest LLM 歷史時點回測沙盒頁面
│   │   ├── hub               # /hub 數據分析與排行榜中心
│   │   ├── funds-flow        # /funds-flow 資金流向頁面
│   │   ├── stock             # /stock/[symbol] 動態個股詳情頁面
│   │   ├── layout.js         # 全域佈局
│   │   ├── page.js           # 平台首頁看板
│   │   └── globals.css       # 全域 Tailwind CSS 樣式
│   ├── components            # 視覺化圖表與 UI 組件
│   │   ├── backtest          # 控制面板 (ControlPanel) 與結果卡片 (ResultCards)
│   │   └── hub               # LeaderboardPanel, WatchlistTable 等
│   ├── external              # 外部服務整合 (Yahoo Finance, SQLite/Turso, Gemini Client)
│   ├── services              # 核心業務邏輯服務 (backtest.service.js, analysis.service.js)
│   └── lib                   # 通用指標計算、新聞分析與 Logger 公用庫
└── tests                     # Unit, Service, API Routes, UI 與 E2E 測試目錄
```

