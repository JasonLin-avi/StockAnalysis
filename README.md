# 🌌 Antigravity Stock Analytics - 智能化股市分析與投資決策顧問平台

一個整合台灣與美國股市的智能化分析與策略建議平台。本專案使用 Next.js (App Router) 與 Docker 進行全棧式容器化開發，結合多因子數據模型、輿情情緒分析及風險防護機制，為投資人生成全面的智能決策報告。

---

## 🚀 核心功能特色

1. **📊 雙數據源容錯獲取**
   - 整合 **Yahoo Finance** 與 **Google Finance** 數據源。
   - 具備自動容錯機制（Primary/Fallback），支持美股與台股（如 `AAPL`, `2330.TW`）的實時及歷史數據抓取。

2. **📈 多維度分析引擎**
   - **技術分析**：計算 20 日移動平均線 (MA)、相對強弱指標 (RSI)、MACD 柱狀體 (Histogram)。
   - **基本面財務評級**：自動評估市盈率 (P/E)、每股收益 (EPS) 成長趨勢、負債比率、季度營收成長率，以及盈餘品質（自由現金流）。
   - **新聞與輿情情緒**：藉由關鍵字權重模型平行評估財經新聞情緒、社群討論熱度/情緒，並主動偵測高影響力事件。

3. **🤖 智能投資決策與風險防護 (AI Advisor)**
   - 依據指標自動生成買入/賣出評級（Buy/Sell/Hold）與信心指數。
   - 提供合理的投資部位權重分配建議（如 Equal Weight / Overweight / Underweight）。
   - 提供專屬的風險因子清單與具體的風險防護指南（如 7% 移動止損價、15% 止盈目標價設定）。

4. **💾 本地持久化資料庫**
   - 整合 SQLite 資料庫，採用參數化查詢（防 SQL 注入）與資料庫交易（Transaction）提升讀寫性能。
   - 將龐大的分析結果 JSON 序列化儲存於 `analysis_results` 表中，以便於未來的時間序列比對。

5. **⚙️ 自定義儀表板排版**
   - 支援「儀表板自定義配置」控制面板，使用者可一鍵自由顯示/隱藏技術分析、基本面雷達、新聞輿情等卡片。
   - 自定義偏好會自動寫入瀏覽器的 `localStorage`，重新整理頁面仍會完美保留排版配置。

6. **📄 離線 HTML 報告導出**
   - 內建優雅的極致黑美學（Premium Dark Theme）HTML 報告模板，融合毛玻璃效果與響應式卡片設計，提供一鍵下載分析報告。

---

## 🛠️ 技術棧 (Tech Stack)

- **前端與後端**: Next.js 14.2 (App Router), React 18
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
docker compose -f docker-compose.prod.yml up -d --build
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
專案擁有極高測試覆蓋率，共有 10 個測試套件 (110 個 Unit、UI 與 E2E 測試)。執行以下指令驗證：
```bash
npm run test
```

---

## 📂 專案結構簡介

```text
├── DEPLOYMENT.md             # 生產環境部署與資料備份指南
├── docker-compose.prod.yml   # 生產環境 Docker Compose 配置
├── Dockerfile                # 多階段構建 Dockerfile
├── package.json              # 專案套件及腳本配置
├── tailwind.config.js        # Tailwind CSS 內容對應設定
├── src
│   ├── app                   # Next.js App Router 頁面與 API 路由
│   │   ├── api               # /api/analyze 與 /api/report 路由端點
│   │   ├── stock             # /stock/[symbol] 動態個股詳情頁面
│   │   ├── layout.js         # 全域佈局
│   │   ├── page.js           # 平台首頁看板
│   │   └── globals.css       # 全域 Tailwind CSS 樣式
│   ├── components            # 視覺化圖表與佈局 React 組件
│   └── lib                   # 模組化分析引擎與資料庫查詢庫
└── tests                     # Unit、UI 偏好與 E2E 測試目錄
```
