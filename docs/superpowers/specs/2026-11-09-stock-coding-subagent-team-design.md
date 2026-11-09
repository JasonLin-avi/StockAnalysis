# Antigravity Coding Subagent 研發團隊與專案持久化規格書 (Design Spec)

- **日期**：2026-11-09
- **狀態**：Approved (方案 A)
- **目標**：在 `D:\Programming\StockAnalysis` 專案中建立並持久化一支 5 人全棧金融研發 Coding Subagent 團隊，供 Antigravity CLI (`agy`) 與 Antigravity 2.0 自動發現與調度。

---

## 1. 架構目標與設計原則

1. **關注點分離與無衝突平行開發 (Zero-Collision Parallelism)**：
   - 依循專案的 **Clean Architecture**（`Presentation (API/UI)` $\rightarrow$ `Business Logic (Service/Lib)` $\rightarrow$ `Infrastructure (External/DB)`），將檔案系統劃分為 5 個互斥的職責領地（File Ownership）。
   - 當主 Agent (Coordinator) 使用 `invoke_subagent` 平行派發任務時，不同領域的 Subagent 不會同時修改同一個檔案。
2. **多層次持久化 (Multi-Layer Persistence)**：
   - **Always-On 規則層 (`AGENTS.md` / `Agent.md` / `.agents/rules/stock-dev-team.md`)**：確保每次對話啟動時，主 Agent 自動載入團隊編制與分派守則。
   - **原生 Subagent 定義層 (`.agents/agents/*.md` & `.agents/plugins/stock-dev-team/agents/*.md`)**：符合 Antigravity Agent Markdown 規範（含 YAML Frontmatter `name`, `description`, `subagent: true`, `mainAgent: false`, `tools`）。
   - **動態調度技能層 (`.agents/skills/stock-dev-team/SKILL.md`)**：提供 `define_subagent` 與 `invoke_subagent` 的標準化調度流程與 Prompt 模板。
   - **當下 Session 即時註冊**：透過 `define_subagent` 工具在當前對話直接註冊這 5 位 Subagent，立即可用。

---

## 2. 五大專職 Coding Subagents 規格

### 2.1 `quant-engine-dev`（📈 量化與指標引擎工程師）
- **負責目錄**：
  - `src/lib/technical-analysis/**`
  - `src/lib/fundamental-analysis/**`
  - `src/lib/investment-advisor/**`
  - `src/services/analysis.service.js`
  - `src/services/backtest.service.js`
  - `src/services/leaderboard.service.js`
- **核心職責**：
  - 開發與優化技術指標（MA5/20/60、RSI、MACD、KD 指標、布林通道、型態識別）。
  - 開發基本面五維度評分模型（P/E、EPS 成長、負債比、營收成長、現金流品質）與投資建議權重引擎。
  - 維護歷史時點回測（Point-in-Time Backtest）商業邏輯。
- **工程鐵律**：
  - **嚴禁未來數據洩漏 (Zero Lookahead Bias)**：在 `backtest.service.js` 與回測引擎中，傳給 Predictor 的數據必須在 `cutoffDate` 進行嚴格物理切割（`date <= cutoffDate`）。
  - **純粹性與單向依賴**：`src/lib/` 演算法必須保持 Pure Functions，處理 `NaN`、`null`、空陣列或樣本數不足之邊界情況；`src/services/` 必須透過 `src/external/` 存取外部資源，嚴禁直接呼叫 `fetch` 或依賴 Next.js HTTP `Request`/`NextResponse`。

### 2.2 `data-infra-dev`（🗄️ 外部數據與資料庫架構師）
- **負責目錄**：
  - `src/external/data-fetcher/**`
  - `src/external/database/**`
  - `src/lib/finnhub/**`
  - `src/lib/stock-map.js`
  - `src/lib/watchlist-store.js`
  - `src/services/data-sync.service.js`
  - `src/services/watchlist.service.js`
- **核心職責**：
  - 維護 Yahoo Finance (`query1` 主源與 `query2` 鏡像備援) 數據抓取器、Finnhub API 與台美股代碼映射（如 `2330` 自動正規化為 `2330.TW`）。
  - 管理本地 SQLite3 與雲端 Turso (`@libsql/client`) 的雙模連接 (`connection.js`、`libsql-adapter.js`)、Schema 遷移 (`schema.js`) 與查詢封裝 (`queries.js`)。
- **工程鐵律**：
  - **參數化查詢與交易保護**：所有 SQL 必須使用 `?` 佔位符防止 SQL Injection；批次寫入（如 `saveStockData`、`insertStockDataBatch`、`batchUpsertStocks`）必須包裹在 `BEGIN TRANSACTION` 與 `COMMIT`/`ROLLBACK` 中。
  - **導出完整性**：新增於 `queries.js` 的函式必須同時加入 Named Export 與 Default Export，並統一透過 `connectToDatabase()` 取得連線。

### 2.3 `ai-agent-dev`（🤖 AI/LLM 與 Prompt 工程師）
- **負責目錄**：
  - `src/external/gemini/**`
  - `src/lib/chatbot/**`
  - `src/lib/news-analysis/**`
  - `src/services/chatbot.service.js`
  - `src/app/api/chat/**`
  - `src/app/api/fundamental/**`
  - `src/app/api/financial-trend/**`
  - `src/app/api/market/funds-flow/**`
  - `src/app/api/stock/[symbol]/technical-ai/**`
- **核心職責**：
  - 維護 Google Gemini SDK 客戶端（支援 Google Search Grounding 與 `GEMINI_MODEL_NAME` 動態讀取）及 SQLite `stock_prompt_analysis` / `market_funds_flow` 快取對接。
  - 維護 LangChain / `deepagents` 金融投顧 Agent (`deep-agent.js`、`tools.js`)、NVIDIA NIM / OpenRouter 主備模型自動切換（Failover）與回測雙 LLM（Predictor & Evaluator）Prompt 工程。
- **工程鐵律**：
  - **防範未替換佔位符**：工具層必須攔截 `{currentTicker}` 等模板字串，並自動將純數字台股代碼補上 `.TW`。
  - **環境變數驅動**：嚴禁寫死 API Key 或單一模型名稱，必須讀取 `process.env` 並配置優雅降級（Fallback）。

### 2.4 `frontend-chart-dev`（🎨 金融視覺化與前端工程師）
- **負責目錄**：
  - `src/app/**/page.js`
  - `src/app/**/*Tab.jsx`
  - `src/components/**`
  - `src/app/globals.css`
  - `tailwind.config.js`
- **核心職責**：
  - 開發與優化 Next.js App Router 頁面（Dashboard、`/stock/[symbol]`、`/backtest`、`/hub`、`/funds-flow`）與互動式組件。
  - 維護 TradingView `lightweight-charts`（K 線主圖、MA 均線、成交量、KD 副圖時間軸同步與 Crosshair 聯動）與 `recharts`（五維基本面雷達圖、情緒分析圖）。
- **工程鐵律**：
  - **視覺規範**：遵循極致黑毛玻璃主題（背景 `bg-slate-950` / `#0B0F19`、邊框 `border-slate-800/80`、強調色 `cyan-400`、上漲 `emerald-400`、下跌 `rose-400`、數值 `font-mono tabular-nums`）。
  - **無障礙與分層隔離**：所有互動按鈕與輸入框必須具備明確的 `aria-label`；前端組件嚴禁直接操作資料庫或呼叫第三方外部 API，只能呼叫 `/api/...`。

### 2.5 `qa-arch-reviewer`（🛡️ QA 回測與架構審查員）
- **負責目錄**：
  - `tests/unit/**`
  - `tests/api/**`
  - `tests/services/**`
  - `tests/integration/**`
  - `tests/ui/**`
  - `tests/e2e/**`
- **核心職責**：
  - 撰寫與執行 Jest 測試套件（`npm test` / `npx jest`），確保所有新增功能與修復通過單元、API、服務與 React Testing Library UI 測試。
  - 執行 **Clean Architecture 合規審查** 與 **量化回測正確性審查**。
- **工程鐵律**：
  - 檢查是否有跨層違規（如 API Route 寫商業邏輯或 SQL、Service 直接用 `fetch`）。
  - 在 JSDOM 測試環境中妥善處理 `react-markdown`、`remark-gfm`、`scrollIntoView` 與 `lightweight-charts` 的 Mock，確保測試穩定零 Flaky。

---

## 3. 持久化檔案清單

1. `D:\Programming\StockAnalysis\AGENTS.md`（主專案 Always-On 架構與 Subagent 團隊調度規則）
2. `D:\Programming\StockAnalysis\Agent.md`（同步更新並修正首尾無效 코드 블록 語法）
3. `D:\Programming\StockAnalysis\.agents\agents\quant-engine-dev.md`
4. `D:\Programming\StockAnalysis\.agents\agents\data-infra-dev.md`
5. `D:\Programming\StockAnalysis\.agents\agents\ai-agent-dev.md`
6. `D:\Programming\StockAnalysis\.agents\agents\frontend-chart-dev.md`
7. `D:\Programming\StockAnalysis\.agents\agents\qa-arch-reviewer.md`
8. `D:\Programming\StockAnalysis\.agents\skills\stock-dev-team\SKILL.md`
9. `D:\Programming\StockAnalysis\.agents\skills\stock-dev-team\references\subagent-prompts.md`
10. `D:\Programming\StockAnalysis\.agents\plugins\stock-dev-team\plugin.json`（及內部對應結構）
