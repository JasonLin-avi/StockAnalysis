---
name: stock-dev-team
description: >-
  Orchestrates the 5-member specialized Coding Subagent team for the Antigravity Stock Analytics
  project (quant-engine-dev, data-infra-dev, ai-agent-dev, frontend-chart-dev, qa-arch-reviewer).
  Use this skill whenever developing new features, refactoring across Clean Architecture layers,
  debugging multi-layer issues, or running parallel coding subagents in D:\Programming\StockAnalysis.
---

# StockAnalysis Coding Subagent Team Orchestration (`stock-dev-team`)

This skill defines how the primary agent (Tech Lead / Coordinator) defines, dispatches, and coordinates the **5 specialized coding subagents** persisted in this project.

---

## 1. The 5-Member Subagent Roster & Territory Map

To prevent file edit collisions during parallel execution, each subagent has strict **File Ownership**:

| Subagent `TypeName` | Role Title | File Territory (Exclusive Write Scope) | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **`quant-engine-dev`** | 📈 Quantitative & Indicator Engine Engineer | `src/lib/technical-analysis/**`<br>`src/lib/fundamental-analysis/**`<br>`src/lib/investment-advisor/**`<br>`src/services/analysis.service.js`<br>`src/services/backtest.service.js`<br>`src/services/leaderboard.service.js` | Technical indicators (MA/RSI/MACD/KD/Bollinger), fundamental 5-factor model, investment rating, and Point-in-Time (`cutoffDate`) backtest engine. |
| **`data-infra-dev`** | 🗄️ Data Fetcher & DB Infrastructure Architect | `src/external/data-fetcher/**`<br>`src/external/database/**`<br>`src/lib/finnhub/**`<br>`src/lib/stock-map.js`<br>`src/services/data-sync.service.js`<br>`src/services/watchlist.service.js` | Yahoo Finance (`query1` -> `query2` failover), Finnhub API, TW/US ticker normalization (`2330` -> `2330.TW`), SQLite3/Turso (`@libsql/client`) schema, transactions, and parameterized queries. |
| **`ai-agent-dev`** | 🤖 AI/LLM, DeepAgent & Prompt Engineer | `src/external/gemini/**`<br>`src/lib/chatbot/**`<br>`src/lib/news-analysis/**`<br>`src/services/chatbot.service.js`<br>`src/app/api/{chat,fundamental,financial-trend}/**`<br>`src/app/api/stock/[symbol]/technical-ai/**` | Google Gemini SDK + Search Grounding + SQLite prompt caching, LangChain `deepagents` tools, NVIDIA/OpenRouter model failover, and financial prompt engineering. |
| **`frontend-chart-dev`** | 🎨 Financial Visualization & Frontend Engineer | `src/app/**/page.js`<br>`src/app/**/*Tab.jsx`<br>`src/components/**`<br>`src/app/globals.css`<br>`tailwind.config.js` | Next.js 14 App Router UI, TradingView `lightweight-charts` (K-line + KD subchart sync), `recharts` radar/sentiment charts, dark glassmorphism styling (`#0B0F19`), and a11y. |
| **`qa-arch-reviewer`** | 🛡️ QA Test Engineer & Architecture Reviewer | `tests/unit/**`<br>`tests/services/**`<br>`tests/api/**`<br>`tests/integration/**`<br>`tests/ui/**`<br>`tests/e2e/**` | Jest test authoring & execution, Clean Architecture unidirectional dependency audit, Lookahead Bias verification, and SQL safety review. |

---

## 2. Step-by-Step Dispatch Procedure

### Step 1: Ensure Subagents Are Defined in the Current Session
At the start of a multi-agent task, check if the required subagent(s) are already registered in the current conversation. If not, call `define_subagent` using the definitions in [`.agents/agents/<name>.md`](../../agents/) or [`references/subagent-prompts.md`](./references/subagent-prompts.md).

### Step 2: Freeze Interfaces Before Parallel Dispatch (Contract-First)
When a feature spans multiple layers (e.g., adding a new indicator or AI tab):
1. **Define the TypeScript/JSDoc Data Contract first** in your dispatch prompts (exact function signatures, return object keys, and API JSON response schema).
2. **Dispatch independent layer subagents in parallel** in a single turn using `invoke_subagent`:
   - Example: Dispatch `data-infra-dev` (DB query) + `quant-engine-dev` (indicator calculation) + `frontend-chart-dev` (UI component consuming `/api/...`) simultaneously, since their file territories do not overlap.

### Step 3: Gate with `qa-arch-reviewer`
After implementation subagents report completion:
1. Dispatch `qa-arch-reviewer` (or run `npx jest` directly for small changes) to verify:
   - All existing and new Jest tests pass.
   - Clean Architecture dependency direction (`Presentation -> Service -> External`) is respected.
   - No `eval()`, no un-parameterized SQL, and no Lookahead Bias in backtests.

---

## 3. Standard Dispatch Prompt Template

When calling `invoke_subagent`, always structure `Prompt` with these 5 sections:

```markdown
## 1. 任務目標 (Task Objective)
[清楚說明要實作或修復的功能]

## 2. 專屬修改範圍 (Authorized Files)
- 允許修改：[列出該 Subagent 領地內的檔案路徑]
- 禁止修改：[明確標註其他層級檔案，避免平行衝突]

## 3. 介面與資料契約 (Interface & Data Contract)
- 輸入參數與格式：[例如 symbol 已正規化為 '2330.TW']
- 回傳結構：[明確列出 JSON keys 與型別]

## 4. 架構與領域守則 (Architecture Guardrails)
- 遵循 `AGENTS.md` Clean Architecture 單向依賴原則。
- 註釋需說明 "Why" 而非 "What"，並以繁體中文撰寫。

## 5. 驗證要求 (Verification)
- 完成後請執行 `npx jest <對應測試檔>`，並在回報中附上測試結果與修改摘要。
```
