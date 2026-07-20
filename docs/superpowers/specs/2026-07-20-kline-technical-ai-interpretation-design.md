# Design Specification: Kline Technical AI Interpretation Feature

**Date:** 2026-07-20  
**Feature Name:** Kline Technical AI Interpretation Panel (`technical-ai`)  
**Status:** Approved  

---

## 1. Overview & Goals

Integrate an AI-powered technical analysis interpretation section directly beneath the quantitative technical diagnosis block in the K-Line chart tab (`KlineTab.jsx`).

The feature analyzes quantitative technical indicator JSON outputs (`generateLLMTechnicalSummary`) using Google Gemini AI configured with a 15-year experienced senior quantitative trader persona. The analysis is presented in rich dark-mode Markdown, covering both long-term position building ("長線波段佈局") and short-term trading rhythm ("短線操作節奏") with explicit risk management guidelines.

---

## 2. System Architecture & Component Decoupling

Following the standard full-stack Gemini integration pattern (`.agents/skills/gemini-ai-feature-integration/SKILL.md`):

```
[ KlineTab.jsx Component ]
       │
       ├─► 1. HTTP GET /api/stock/[symbol]/kline (Renders TradingView K-Line chart & quantitative summary card)
       │
       └─► 2. HTTP GET /api/stock/[symbol]/technical-ai (Renders AI Interpretation markdown card)
                │
                ▼
[ API Route: /api/stock/[symbol]/technical-ai/route.js ]
       │
       ├─► Query SQLite `stock_prompt_analysis` table (symbol, 'technical', today)
       │     ├─► [Cache Hit]  Return cached markdown
       │     └─► [Cache Miss] Proceed to generation ────────┐
       │                                                     │
       │  ┌──────────────────────────────────────────────────┘
       │  ▼
       ├─► Fetch historical stock price series from SQLite DB
       ├─► Compute indicator features: generateLLMTechnicalSummary(rawData)
       ├─► Format domain prompt with senior quantitative trader persona
       ├─► Invoke callGemini(prompt) via generic client (src/lib/gemini/client.js)
       └─► Save generated markdown to SQLite DB & Return { markdown }
```

---

## 3. Detailed Component Specifications

### 3.1 Backend Route Handler (`src/app/api/stock/[symbol]/technical-ai/route.js`)

- **HTTP Method:** `GET`
- **Query Params:** `symbol` (e.g., `AAPL`, `2330.TW`)
- **Execution Steps:**
  1. Validate `symbol` parameter.
  2. Connect to SQLite database via `connectToDatabase()`.
  3. Query `stock_prompt_analysis` with key `(symbol, 'technical', today)` using `getPromptAnalysis`.
  4. If cached result exists, return `{ markdown: cached }` with status 200.
  5. Fetch historical price data via `getHistoricalPricesFromDB`.
  6. If historical price count < 60 days:
     - Return fallback markdown explaining data insufficiency without calling Gemini API.
  7. Execute `generateLLMTechnicalSummary(rawData)` to produce structured technical indicators JSON.
  8. Format prompt incorporating the exact prompt template.
  9. Invoke `callGemini(prompt)` to generate markdown response.
  10. Cache markdown via `savePromptAnalysis(db, symbol, 'technical', today, markdown)`.
  11. Return `{ markdown }` with status 200.

### 3.2 Prompt Template Definition

```javascript
function getTechnicalAIPrompt(symbol, summaryJson) {
  return `# Role (角色設定)
你是一位擁有 15 年經驗的資深量化交易員與資產配置專家。你的分析風格兼顧宏觀趨勢與微觀進出，既看重長線價值與波段結構，也重視短線的風險報酬比（Risk/Reward Ratio），絕不給予絕對且不負責任的保證。

# Task (任務說明)
請根據下方提供的結構化技術特徵 JSON 數據（包含短中長線指標），進行全方位的技術面與趨勢解讀，並針對該標的提出**「長線波段佈局」**與**「短線操作節奏」**的綜合建議與風險控管方針。

# Input Data (輸入數據)
\`\`\`json
${JSON.stringify(summaryJson, null, 2)}
\`\`\`

請以專業、清晰且結構化的 Markdown 格式輸出分析報告。`;
}
```

### 3.3 Frontend Component (`TechnicalAISummaryPanel` inside `KlineTab.jsx`)

- **Placement:** Below K-Line Chart and Quantitative Diagnosis summary panel across full container width (`mt-6`).
- **Styling:** `bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-xl`.
- **States:**
  - **Loading:** Skeleton loader displaying pulse bars and message: `AI 量化專家正在對 K 線與指標進行深度分析...`.
  - **Error / Insufficient Data:** Graceful fallback alert box.
  - **Loaded:** Rendered Markdown output using `react-markdown` and `remark-gfm` inside `prose prose-invert max-w-none`.

---

## 4. Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Historical prices < 60 days | Return graceful markdown notice: `"歷史交易數據不足（少於 60 日），無法進行長短線量化技術診斷與 AI 解讀。"` |
| `GEMINI_API_KEY` missing / API limit | Log error to server console, return fallback notice card allowing retry. |
| Cache handling | SQLite table `stock_prompt_analysis` keyed by `(symbol, 'technical', YYYY-MM-DD)` ensures daily refresh. |

---

## 5. Testing Plan

1. **Unit Test for API Route (`tests/unit/technical-ai-api.test.js`)**:
   - Verify cache hit behavior returns stored markdown without calling Gemini API.
   - Verify cache miss generates prompt, calls `callGemini`, and stores result in DB.
   - Verify fallback response when price history is less than 60 records.
2. **UI Test for Frontend Component (`tests/ui/kline-tab.test.js`)**:
   - Verify `KlineTab` component fetches `/api/stock/[symbol]/technical-ai` and displays loading skeleton -> rendered markdown.

---
