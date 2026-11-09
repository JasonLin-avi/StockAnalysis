# AGENTS.md - Clean Architecture & Coding Subagent Team Guidelines

本專案（**Antigravity Stock Analytics**）採用 Next.js (App Router) 進行前後端一體開發。為了確保程式碼的可維護性、可測試性與擴充性，所有開發與重構必須嚴格遵循 **Clean Architecture (整潔架構)**、**Separation of Concerns (關注點分離)**，以及本專案持久化的 **5 人專職 Coding Subagent 研發團隊調度規範**。

---

## 1. 目錄結構與 Clean Architecture 規範

請將程式碼嚴格歸類到以下對應的目錄與職責中：

```text
src/
├── app/                  # Next.js App Router (頁面與 Route Handlers)
│   ├── api/              # 1. Presentation / API 層 (面對前端的 HTTP 控制器)
│   └── (routes)/         # 4. UI Components 層 (Render 給前端的頁面與 Tab)
├── components/           # 4. UI Components 層 (視覺化圖表與通用互動組件)
├── services/             # 2. Application / Business Logic 層 (Implementation Service)
├── lib/                  # 2. Domain / Pure Computation 層 (純量化指標演算法、工具鏈)
└── external/             # 3. Infrastructure / Adapter 層 (Yahoo Finance, SQLite/Turso, Gemini SDK)
```

### 各層職責、設計模式與約束

1. **Presentation / API 層 (`src/app/api/...`)**
   * **職責**：作為 HTTP 進入點。負責解析 Request、驗證前端傳入的參數、進行基本的權限檢查，並呼叫對應的 **Implementation Service**。
   * **限制**：**絕對禁止** 在此層寫入複雜商業邏輯、直接執行原始 SQL 查詢或直接呼叫外部第三方 API（如 Yahoo Finance）。此層僅做 Request/Response 的轉發與例外捕捉。
2. **Business Logic & Domain 層 (`src/services/...` & `src/lib/...`)**
   * **職責**：核心商業邏輯與純演算法層。`src/lib/` 負責無副作用的量化計算（MA/RSI/MACD/KD、基本面評分、回測計算）；`src/services/` 負責業務流程編排與快取協調。
   * **限制**：若需要取得外部資料或讀寫資料庫，必須透過 **External 層 (`src/external/...`)**，不可直接在 Service 內使用 `fetch` 呼叫第三方 API，亦不可依賴 Next.js 的 `Request`/`NextResponse` 物件。
3. **Infrastructure / Adapter 層 (`src/external/...`)**
   * **職責**：封裝所有對外的第三方 API 溝通（Yahoo Finance `query1`/`query2` 雙源備援、Google Gemini SDK）與資料庫存取（SQLite3 / Turso `@libsql/client`）。
   * **限制**：所有 SQL 查詢必須使用 `?` 參數化查詢防止 SQL Injection；批次寫入必須使用 `BEGIN TRANSACTION`；新增於 `queries.js` 的函式必須同時加入 Named Export 與 Default Export。
4. **UI Components 層 (`src/app/...` 或 `src/components/...`)**
   * **職責**：負責畫面渲染與使用者互動（TradingView `lightweight-charts`、Recharts、極致黑毛玻璃主題 `#0B0F19`）。
   * **限制**：不可直接引入 `src/services/` 或 `src/external/`，必須透過呼叫 `/api/...` 取得資料。

---

## 2. 專案持久化 Coding Subagent 研發團隊 (`stock-dev-team`)

本專案於 `.agents/agents/` 與 `.agents/skills/stock-dev-team/SKILL.md` 持久化配置了 **5 位專職 Coding Subagents**。當面對跨層功能開發、平行問題排查或重構任務時，主 Agent（Coordinator）應優先透過 `define_subagent` / `invoke_subagent` 調度以下專職子代理：

| Subagent ID (`Name`) | 角色職稱 (`Role`) | 專屬檔案領地 (Exclusive File Ownership) | 核心守則與專長 |
| :--- | :--- | :--- | :--- |
| **`quant-engine-dev`** | 📈 量化與指標引擎工程師 | `src/lib/technical-analysis/**`<br>`src/lib/fundamental-analysis/**`<br>`src/lib/investment-advisor/**`<br>`src/services/analysis.service.js`<br>`src/services/backtest.service.js`<br>`src/services/leaderboard.service.js` | • 負責技術指標（MA/RSI/MACD/KD/布林）、基本面五維度評分、投資建議與歷史時點回測。<br>• **天條**：回測必須在 `cutoffDate` 嚴格物理切割數據，杜絕未來數據洩漏（Lookahead Bias）。 |
| **`data-infra-dev`** | 🗄️ 外部數據與資料庫架構師 | `src/external/data-fetcher/**`<br>`src/external/database/**`<br>`src/lib/finnhub/**`<br>`src/lib/stock-map.js`<br>`src/services/data-sync.service.js`<br>`src/services/watchlist.service.js` | • 負責 Yahoo Finance 雙源備援 (`query1` $\rightarrow$ `query2`)、台美股代碼正規化 (`2330` $\rightarrow$ `2330.TW`)。<br>• 負責 SQLite3 / Turso (`@libsql/client`) Schema、Transaction 批次寫入與 `queries.js`。 |
| **`ai-agent-dev`** | 🤖 AI/LLM 與 Prompt 工程師 | `src/external/gemini/**`<br>`src/lib/chatbot/**`<br>`src/lib/news-analysis/**`<br>`src/services/chatbot.service.js`<br>`src/app/api/{chat,fundamental,financial-trend}/**`<br>`src/app/api/stock/[symbol]/technical-ai/**` | • 負責 Gemini SDK + Google Search Grounding + `stock_prompt_analysis` 快取整合。<br>• 負責 LangChain `deepagents` 工具鏈、NVIDIA/OpenRouter 雙模型備援與防範 `{currentTicker}` 佔位符漏洞。 |
| **`frontend-chart-dev`** | 🎨 金融視覺化與前端工程師 | `src/app/**/page.js`<br>`src/app/**/*Tab.jsx`<br>`src/components/**`<br>`src/app/globals.css`<br>`tailwind.config.js` | • 負責 Next.js 14 頁面、TradingView K 線與 KD 副圖同步、Recharts 雷達圖。<br>• 遵循極致黑毛玻璃主題（漲綠 `emerald-400`、跌紅 `rose-400`、數值 `font-mono tabular-nums`）與無障礙 `aria-label`。 |
| **`qa-arch-reviewer`** | 🛡️ QA 回測與架構審查員 | `tests/unit/**`, `tests/services/**`<br>`tests/api/**`, `tests/integration/**`<br>`tests/ui/**`, `tests/e2e/**` | • 負責撰寫與執行 Jest 測試套件（`npx jest`），並進行 Clean Architecture 單向依賴與資安審查（嚴禁 `eval()`）。 |

### Subagent 調度與協作原則
1. **領地隔離防衝突**：平行調度多位 Subagent 時，每位 Subagent 僅能修改其「專屬檔案領地」內的檔案。
2. **契約先行 (Contract-First)**：跨層開發前，主 Agent 必須先定義清楚各層傳遞的資料結構（JSON Schema / Function Signature），再將規格寫入各 Subagent 的 Task Brief 中。
3. **詳見調度技能**：完整調度流程與標準化 Prompt 模板請參閱 [`.agents/skills/stock-dev-team/SKILL.md`](.agents/skills/stock-dev-team/SKILL.md)。
