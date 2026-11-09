# Task P2: AI Prompt Centralization & Zod Validation

## 角色指派
- **主攻**：`ai-agent-dev`
- **審查**：`qa-arch-reviewer`

## 任務目標
提升 AI 調用穩定性與提示詞工程架構：

1. **集中管理提示詞 (Prompt Centralization)**：
   - 建立 `src/lib/prompts/` 目錄：
     - `technical-ai.prompt.js`：資深量化交易員解讀提示詞。
     - `financial-trend.prompt.js`：財報五維度評分與趨勢提示詞。
     - `funds-flow.prompt.js`：市場資金流向分析提示詞。
   - 統一支援版本管理與參數注入格式化函式。

2. **Zod 結構化輸出解析與防禦性容錯**：
   - 針對所有需要模型輸出 JSON 的場景（如回測評估 `/api/backtest/evaluate`）：
     - 定義明確的 Zod Schema（`z.object({...})`）。
     - 取代容易失敗的裸 `JSON.parse`，支援 markdown code block 剝除與自動修復。
     - 完善 fallback 降級邏輯。

3. **驗證方式**：
   - 執行 `npm test` 確保 AI 相關單元測試與 API 測試全數通過。
