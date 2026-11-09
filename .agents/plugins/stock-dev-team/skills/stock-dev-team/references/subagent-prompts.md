# StockAnalysis Subagent `define_subagent` Quick Reference

Use these exact parameters when calling `define_subagent` in a new session if the subagents are not yet registered in the runtime.

---

## 1. `quant-engine-dev`
- **Name**: `quant-engine-dev`
- **EnableWriteTools**: `true`
- **EnableMCPTools**: `true`
- **EnableSubagentTools**: `false`
- **Description**: `Quantitative & Technical/Fundamental Analysis Engine Engineer for StockAnalysis. Owns src/lib/technical-analysis/, src/lib/fundamental-analysis/, src/lib/investment-advisor/, src/services/analysis.service.js, and src/services/backtest.service.js.`
- **SystemPrompt**: Read from `.agents/agents/quant-engine-dev.md`

---

## 2. `data-infra-dev`
- **Name**: `data-infra-dev`
- **EnableWriteTools**: `true`
- **EnableMCPTools**: `true`
- **EnableSubagentTools**: `false`
- **Description**: `External Data Fetcher & Database Infrastructure Architect for StockAnalysis. Owns src/external/data-fetcher/, src/external/database/, src/lib/finnhub/, src/lib/stock-map.js, and src/services/data-sync.service.js.`
- **SystemPrompt**: Read from `.agents/agents/data-infra-dev.md`

---

## 3. `ai-agent-dev`
- **Name**: `ai-agent-dev`
- **EnableWriteTools**: `true`
- **EnableMCPTools**: `true`
- **EnableSubagentTools**: `false`
- **Description**: `AI/LLM, LangChain DeepAgent & Financial Prompt Engineer for StockAnalysis. Owns src/external/gemini/, src/lib/chatbot/, src/lib/news-analysis/, src/services/chatbot.service.js, and AI-powered API routes.`
- **SystemPrompt**: Read from `.agents/agents/ai-agent-dev.md`

---

## 4. `frontend-chart-dev`
- **Name**: `frontend-chart-dev`
- **EnableWriteTools**: `true`
- **EnableMCPTools**: `true`
- **EnableSubagentTools**: `false`
- **Description**: `Financial Data Visualization & Next.js Frontend Engineer for StockAnalysis. Owns src/app/**/page.js, src/app/**/*Tab.jsx, src/components/**, src/app/globals.css, and tailwind.config.js.`
- **SystemPrompt**: Read from `.agents/agents/frontend-chart-dev.md`

---

## 5. `qa-arch-reviewer`
- **Name**: `qa-arch-reviewer`
- **EnableWriteTools**: `true`
- **EnableMCPTools**: `true`
- **EnableSubagentTools**: `false`
- **Description**: `QA Test Engineer & Clean Architecture Reviewer for StockAnalysis. Owns tests/** and performs spec compliance, Clean Architecture boundary verification, and Jest test suite validation.`
- **SystemPrompt**: Read from `.agents/agents/qa-arch-reviewer.md`
