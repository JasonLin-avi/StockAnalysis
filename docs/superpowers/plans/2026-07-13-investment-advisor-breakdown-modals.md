# 投資顧問指標說明彈窗與算分明細實作計劃 (Investment Advisor Breakdown Modals Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在評級、權重及置信度指標說明的彈窗中渲染出對應個股的真實數值與詳細計分大表，將計算過程完全透明化。

**Architecture:** 
1. 後端 `buy-sell.js` 與 `portfolio.js` 在打分時，將各項指標得分與真實值儲存在 `breakdown` 對象中一同回傳。
2. 前端 `AdvisoryModal` 依據傳入的 `breakdown` 資料，以精美子表格及動態數值代入推導式呈現明細。

**Tech Stack:** React, Tailwind CSS, Jest

## Global Constraints

*   必須遵循 Google Engineering Standards，註釋需說明 "Why" 而非 "What"。
*   UI 部分需完全滿足無障礙設計（Aria 標籤與角色定位）。
*   任何情況下都不允許寫入假數據或 Placeholders。

---

### Task 1: Backend Advice Breakdown Schemas

**Files:**
*   Modify: `src/lib/investment-advisor/buy-sell.js`
*   Modify: `src/lib/investment-advisor/portfolio.js`
*   Test: `tests/unit/investment-advisor.test.js`

**Interfaces:**
*   Produces: `totalScore`, `healthScore`, `sentimentScore` and `breakdown` objects inside buySell and portfolio advice payload.

- [ ] **Step 1: Write backend tests verifying breakdown schema and scores**
  
  修改 `tests/unit/investment-advisor.test.js`，在 `generateBuySellAdvice` 的測試區塊中，追加以下測試：
  
  ```javascript
    test('returns correct breakdown details and total score', () => {
      const result = generateBuySellAdvice(mockStrongStock);
      expect(result).toHaveProperty('totalScore');
      expect(result).toHaveProperty('breakdown');
      expect(result.breakdown.technical.rsi.value).toBe(25);
      expect(result.breakdown.technical.rsi.score).toBe(10);
      expect(result.breakdown.fundamental.pe.status).toBe('Undervalued');
      expect(result.breakdown.fundamental.pe.score).toBe(10);
    });
  ```
  
  在 `generatePortfolioAdvice` 的測試區塊中，追加以下測試：
  
  ```javascript
    test('returns correct health score and fundamental breakdown', () => {
      const result = generatePortfolioAdvice(mockStrongStock);
      expect(result).toHaveProperty('healthScore');
      expect(result).toHaveProperty('breakdown');
      expect(result.healthScore).toBe(10); // All 5 mock fundamentals are healthy
      expect(result.breakdown.pe.score).toBe(2);
    });
  ```

- [ ] **Step 2: Run tests and verify failure**
  
  Run: `npm test tests/unit/investment-advisor.test.js`
  Expected: FAIL (因為後端目前沒有 `totalScore` 及 `breakdown` 等屬性)

- [ ] **Step 3: Refactor [buy-sell.js](file:///D:/Programming/opencodeTest/src/lib/investment-advisor/buy-sell.js) to calculate and package breakdown metrics**
  
  修改 `buy-sell.js`，宣告獨立的子得分變數，並最終將 `breakdown` 與 `totalScore` 包裝回傳。
  
  ```javascript
  // 範例變更：將原本的累積記分改為獨立變數便於組裝 breakdown
  let rsiScore = 5;
  let latestRsi = null;
  if (technical && Array.isArray(technical.rsi) && technical.rsi.length > 0) {
    latestRsi = technical.rsi[technical.rsi.length - 1];
    if (latestRsi !== null && latestRsi !== undefined) {
      if (latestRsi < 30) rsiScore = 10;
      else if (latestRsi > 70) rsiScore = 3;
      else rsiScore = 7;
    }
  }
  
  // 同理為 maScore, macdScore, peScore, epsScore, debtScore, revenueScore, cashScore 進行賦值與重構
  // ...
  // 最後回傳對象包含 breakdown 明細與 totalScore 欄位
  ```

- [ ] **Step 4: Refactor [portfolio.js](file:///D:/Programming/opencodeTest/src/lib/investment-advisor/portfolio.js) to package healthScore breakdown metrics**
  
  修改 `portfolio.js`，累加 `healthScore`，並封裝 `breakdown` 回傳。
  
  ```javascript
  // 範例變更：在累積 healthScore 的同時記錄子項狀態與分數
  let debtScore = 0;
  if (fundamental.debtRatio) {
    if (fundamental.debtRatio.status === 'Healthy') {
      healthScore += 2;
      debtScore = 2;
    } else if (fundamental.debtRatio.status === 'Moderate') {
      healthScore += 1;
      debtScore = 1;
    }
  }
  // 同理為 epsScore, revenueScore, cashScore, peScore 進行賦值與重構
  // ...
  // 回傳 breakdown 對象
  ```

- [ ] **Step 5: Run tests and verify they pass**
  
  Run: `npm test tests/unit/investment-advisor.test.js`
  Expected: PASS

- [ ] **Step 6: Commit backend changes**
  
  ```bash
  git add src/lib/investment-advisor/ tests/unit/investment-advisor.test.js
  git commit -m "feat: package detailed scoring breakdowns in buy-sell and portfolio advice"
  ```

---

### Task 2: Frontend Advisory Modal Table and Formula Rendering

**Files:**
*   Modify: `src/components/InvestmentAdvicePanel.js`
*   Test: `tests/unit/components.test.js`

**Interfaces:**
*   Consumes: `totalScore`, `healthScore`, `sentimentScore` and `breakdown` from properties inside `InvestmentAdvicePanel`

- [ ] **Step 1: Write component unit tests for breakdown rendering**
  
  在 `tests/unit/components.test.js` 中的 `renders modals and handles Escape key closure` 測試案例中，擴展為使用帶有真實 `breakdown` 的 mock 資料進行 render，並斷言 Modal 中繪製了正確的數據表格。
  
  ```javascript
      // 模擬帶有 breakdown 數據的 advice 物件
      const mockAdviceWithBreakdown = {
        portfolio: { 
          targetWeight: 0.12, 
          allocationClass: 'Overweight', 
          rationale: 'Excellent health',
          healthScore: 8,
          sentimentScore: 0.6,
          breakdown: {
            debtRatio: { status: 'Healthy', score: 2 },
            eps: { status: 'Strong', score: 2 },
            revenueGrowth: { status: 'High Growth', score: 2 },
            cashFlow: { status: 'Strong', score: 2 },
            pe: { status: 'Fair', score: 0 }
          }
        },
        buySell: { 
          action: 'Buy', 
          confidenceScore: 0.81, 
          summary: 'Highly recommended',
          totalScore: 83,
          breakdown: {
            technical: {
              score: 23,
              rsi: { value: 28.4, status: 'Oversold', score: 10 },
              ma: { value: 155.2, ma: 150.0, status: 'Bullish', score: 10 },
              macd: { value: -0.05, status: 'Bearish', score: 3 }
            },
            fundamental: {
              score: 47,
              pe: { value: 18.5, status: 'Fair', score: 7 },
              eps: { value: 4.2, status: 'Strong', score: 10 },
              debtRatio: { value: 0.45, status: 'Healthy', score: 10 },
              revenueGrowth: { value: 0.12, status: 'High Growth', score: 10 },
              cashFlow: { value: 1200000000, status: 'Strong', score: 10 }
            },
            sentiment: {
              score: 13,
              news: { value: 0.4, score: 7 },
              social: { value: 0.2, score: 6 }
            }
          }
        },
        risk: { riskLevel: 'Low', riskFactors: [], riskMitigation: '' }
      };
      
      const { rerender } = render(<InvestmentAdvicePanel advice={mockAdviceWithBreakdown} />);
      // 點擊問號並斷言對話框渲染了 RSI 與 P/E 原始值表格行
      const ratingBtn = screen.getByLabelText('查看評級策略公式與說明');
      fireEvent.click(ratingBtn);
      
      expect(screen.getByText('28.4')).toBeInTheDocument();
      expect(screen.getByText('Oversold (超賣)')).toBeInTheDocument();
      expect(screen.getByText('83 / 100')).toBeInTheDocument();
  ```

- [ ] **Step 2: Run tests and verify failure**
  
  Run: `npm test tests/unit/components.test.js`
  Expected: FAIL (無法在 document 中找到 "28.4" 與 "83 / 100" 等文字)

- [ ] **Step 3: Update `AdvisoryModal` in [InvestmentAdvicePanel.js](file:///D:/Programming/opencodeTest/src/components/InvestmentAdvicePanel.js) to render sub-tables**
  
  重構 `AdvisoryModal` 組件：
  1. 接收 `advice` 參數物件。
  2. 依據 `type` 讀取 `buySell` 與 `portfolio`。
  3. 使用 HTML `<table>` 將 `breakdown` 中的每一個大項與子指標繪製成精美的子表格。
  4. 評估置信度時，代入 `buySell.totalScore` 動態產生推導式。
  
  *(注意：註釋應使用 "Why" 說明阻斷冒泡與無障礙標籤設計的考量，符合 Google 規範)*

- [ ] **Step 4: Run tests to verify all tests pass**
  
  Run: `npm test`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  
  ```bash
  git add src/components/InvestmentAdvicePanel.js tests/unit/components.test.js
  git commit -m "feat: render detailed indicator tables and math formulas inside info modals"
  ```
