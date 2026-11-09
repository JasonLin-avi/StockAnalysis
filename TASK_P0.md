# Task P0: Clean Architecture Refactoring

## 角色指派
- **主攻**：`ai-agent-dev`、`data-infra-dev`
- **審查**：`qa-arch-reviewer`

## 任務目標
依照專案 `AGENTS.md` 之 Clean Architecture 規範，消除 Presentation / API 層與 UI 層的直接跨層直連違規：

1. **抽離 API 商業邏輯至 Application Service**：
   - 建立 `src/services/technical-ai.service.js`：
     - 將 `src/app/api/stock/[symbol]/technical-ai/route.js` 內的 Prompt 組裝、SQLite 快取查詢/寫入、Gemini 調用邏輯封裝至 Service。
     - 讓 API Route 僅負責驗證參數、調用 Service、回傳 HTTP 狀態碼與 JSON。
   - 建立 `src/services/market.service.js`：
     - 將 `src/app/api/market/route.js` 與 `src/app/api/market/overview-metrics/route.js` 呼叫外部 Yahoo Finance 及資料庫 queries 的部分封裝至 Service。
   - 整理 `src/app/api/fundamental/route.js` 與 `src/app/api/financial-trend/route.js`。

2. **修正 UI 直連 External 資料庫**：
   - 重構 `src/app/reports/page.js`：不得直接 `import { connectToDatabase } from '../../external/database/connection'`，改經由 `src/services/report.service.js` 或 API 取得資料。

3. **驗證方式**：
   - 執行 `npm test` 確保所有 58 個測試套件均順利通過且無架構違規。
