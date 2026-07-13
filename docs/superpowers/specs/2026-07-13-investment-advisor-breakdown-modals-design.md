# 投資顧問指標說明彈窗與算分明細設計規格書 (Investment Advisor Breakdown Modals Design Spec)

- **日期**: 2026-07-13
- **主題**: 評級策略、配置權重、評估置信度之真實數值與算分明細 (Breakdown) 彈窗呈現
- **狀態**: 已批准 (Approved)
- **設計方案**: 方案 B (後端封裝 Breakdown 回傳 + 前端子表格帶入渲染)

---

## 1. 背景與動機 (Background & Context)
用戶希望在點擊說明問號「?」彈窗時，除了看到靜態的公式之外，還能看到**當前這檔個股真實獲取到的指標數值**（例如：真實的 RSI 數值、本益比、EPS 等）以及對應的得分明細。這能讓計算邏輯 100% 透明，幫助用戶理清 AI 決策背後的具體依據。

為了避免在前端重複編寫打分與權重判定邏輯（違反 DRY 原則），本設計採用**方案 B**：由後端 advice 模組（`buy-sell.js` 與 `portfolio.js`）在計算分數的同時，將中間變數與得分明細封裝進 `breakdown` 物件隨報告一同返回，前端僅負責讀取該結構並以精美的子表格呈現。

---

## 2. 功能需求 (Functional Requirements)
1.  **後端 Breakdown 數據輸出**:
    *   **評級模組 (Buy-Sell)**: 輸出技術分析 (RSI, MA, MACD)、基本面分析 (PE, EPS, 負債比, 營收成長, 現金流)、市場情緒 (新聞, 社群) 的真實數值、判定狀態與得分，並回傳總分。
    *   **配置模組 (Portfolio)**: 輸出 5 大基本面因子的健康分 (0-2 分)、健康度總分 (0-10 分) 以及輿情情緒合計修正值。
2.  **前端 Modal 詳細子表格與數值帶入**:
    *   **評級彈窗**: 以表格形式展示每個板塊的子指標名稱、當前數值、狀態、得分與滿分，底部顯示總得分 (0-100)。
    *   **權重彈窗**: 展示基本面財務因子打分表、輿情情緒修正值計算，並用文字說明最終權重（如 12%）的判定匹配原因。
    *   **置信度彈窗**: 根據當前評級套用對應的公式，將真實總分代入推導式中（例如：`70% + ((83 - 70) / 30) * 25% = 81%`）進行視覺展示。

---

## 3. 技術設計與數據結構 (Technical Design & Schema)

### 3.1 評級 (Buy/Sell) breakdown 數據格式
後端 [buy-sell.js](file:///D:/Programming/opencodeTest/src/lib/investment-advisor/buy-sell.js) 返回對象中增加 `totalScore` 與 `breakdown`：
```json
{
  "action": "Buy",
  "confidenceScore": 0.81,
  "summary": "...",
  "totalScore": 83,
  "breakdown": {
    "technical": {
      "score": 23,
      "rsi": { "value": 28.4, "status": "Oversold", "score": 10 },
      "ma": { "value": 155.2, "ma": 150.0, "status": "Bullish", "score": 10 },
      "macd": { "value": -0.05, "status": "Bearish", "score": 3 }
    },
    "fundamental": {
      "score": 47,
      "pe": { "value": 18.5, "status": "Fair", "score": 7 },
      "eps": { "value": 4.2, "status": "Strong", "score": 10 },
      "debtRatio": { "value": 0.45, "status": "Healthy", "score": 10 },
      "revenueGrowth": { "value": 0.12, "status": "High Growth", "score": 10 },
      "cashFlow": { "value": 1200000000, "status": "Strong", "score": 10 }
    },
    "sentiment": {
      "score": 13,
      "news": { "value": 0.4, "score": 7 },
      "social": { "value": 0.2, "score": 6 }
    }
  }
}
```

### 3.2 配置權重 (Weight) breakdown 數據格式
後端 [portfolio.js](file:///D:/Programming/opencodeTest/src/lib/investment-advisor/portfolio.js) 返回對象中增加 `healthScore`、`sentimentScore` 與 `breakdown`：
```json
{
  "targetWeight": 0.12,
  "allocationClass": "Overweight",
  "rationale": "...",
  "healthScore": 8,
  "sentimentScore": 0.6,
  "breakdown": {
    "debtRatio": { "value": 0.45, "status": "Healthy", "score": 2 },
    "eps": { "value": 4.2, "status": "Strong", "score": 2 },
    "revenueGrowth": { "value": 0.12, "status": "High Growth", "score": 2 },
    "cashFlow": { "value": 1200000000, "status": "Strong", "score": 2 },
    "pe": { "value": 18.5, "status": "Fair", "score": 0 }
  }
}
```

---

## 4. 測試策略 (Test Plan)
1.  **後端算分測試**:
    *   於 `tests/unit/investment-advisor.test.js` 驗證回傳的 `breakdown` 對象架構完整性，確保每個欄位的 `value`、`status`、`score` 皆有值且符合規則。
2.  **前端元件渲染測試**:
    *   於 `tests/unit/components.test.js` 模擬點擊 3 個 `?` 按鈕，檢查渲染出來的 Modal 對話框中是否正確包含對應的真實數值與表格行內容（例如：斷言畫面上出現 `Oversold` 或 `RSI: 28.4` 的文字內容）。
