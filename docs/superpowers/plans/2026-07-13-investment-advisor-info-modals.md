# 投資顧問指標說明彈窗實作計劃 (Investment Advisor Info Modals Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 AI 智能投資決策報告的評級、權重及置信度卡片旁新增「?」按鈕，點擊時彈出玻璃擬態風格的 Modal 說明彈窗。

**Architecture:** 在 `InvestmentAdvicePanel` 組件內引入 `activeModal` 狀態，點擊問號時設定狀態，藉此條件渲染內聚的 `AdvisoryModal` 子組件。使用 `useEffect` 監聽鍵盤事件來支援 `Esc` 關閉彈窗，並在 `globals.css` 中配置 Tailwind 的 CSS 動畫。

**Tech Stack:** React, Tailwind CSS

## Global Constraints

*   CSS 類名必須符合 Tailwind CSS 規範。
*   無障礙設計：每個 `?` 按鈕需配備 `aria-label`。
*   動畫需平滑且採用 backdrop blur 進行毛玻璃虛化。

---

### Task 1: CSS Animation Setup

**Files:**
*   Modify: `src/app/globals.css`

**Interfaces:**
*   Produces: `.animate-fade-in` and `.animate-scale-up` utility classes

- [ ] **Step 1: Write keyframes and utility classes to `src/app/globals.css`**
  
  在 `src/app/globals.css` 的末尾追加以下 CSS 樣式：
  
  ```css
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleUp {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .animate-fade-in {
    animation: fadeIn 0.2s ease-out forwards;
  }

  .animate-scale-up {
    animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  ```

- [ ] **Step 2: Commit CSS Changes**

  ```bash
  git add src/app/globals.css
  git commit -m "style: add custom fade-in and scale-up animation utilities for modals"
  ```

---

### Task 2: Implement Modal Component and React State

**Files:**
*   Modify: `src/components/InvestmentAdvicePanel.js`
*   Test: `tests/unit/components.test.js`

**Interfaces:**
*   Consumes: `.animate-fade-in` and `.animate-scale-up` from `globals.css`
*   Produces: `AdvisoryModal` sub-component and state hook within `InvestmentAdvicePanel`

- [ ] **Step 1: Write unit test verifying the keyboard ESC listener and basic rendering**

  在 `tests/unit/components.test.js` 檔案最後的 `InvestmentAdvicePanel` 測試區塊中（約 160 行處），加入以下測試：
  
  ```javascript
    test('renders modals and handles Escape key closure', () => {
      const mockAdvice = {
        portfolio: { targetWeight: 0.12, allocationClass: 'Overweight', rationale: 'Strong balance sheet' },
        buySell: { action: 'Buy', confidenceScore: 0.85, summary: 'Highly recommended' },
        risk: { riskLevel: 'Low', riskFactors: ['Minor competition'], riskMitigation: 'Set 10% stop loss' }
      };

      const { container } = render(<InvestmentAdvicePanel advice={mockAdvice} />);
      
      // Initially, no modal should be visible
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  ```

- [ ] **Step 2: Run tests and verify failure**

  Run: `npm test tests/unit/components.test.js`
  Expected: PASS (由於只加了初期的 null 斷言，所以此時應該是通過的)

- [ ] **Step 3: Add `activeModal` State and AdvisoryModal implementation in `src/components/InvestmentAdvicePanel.js`**

  修改 [InvestmentAdvicePanel.js](file:///D:/Programming/opencodeTest/src/components/InvestmentAdvicePanel.js)，引入 `activeModal` 狀態、`Esc` 監聽以及 `AdvisoryModal` 彈窗。
  
  在組件最頂部新增狀態：
  ```javascript
  const [activeModal, setActiveModal] = React.useState(null);
  
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    if (activeModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeModal]);
  ```

  在 `InvestmentAdvicePanel.js` 檔案的最底部，加入 `AdvisoryModal` 內部元件：
  ```javascript
  function AdvisoryModal({ type, onClose }) {
    const contentMap = {
      rating: {
        title: '評級策略 (Rating) 指標說明',
        formula: '總分 (100) = 基本面評分 (50) + 技術面評分 (30) + 情緒評分 (20)',
        details: [
          '基本面 (50分): 依據 PE 估值、EPS 增長、負債比、營收成長與現金流進行判定。',
          '技術面 (30分): 依據 RSI 動能、MA 趨勢與 MACD 柱狀體判定。',
          '情緒面 (20分): 轉換新聞輿情與社群熱度指數計分。',
          '總分 >= 70 為 Buy，<= 40 為 Sell，介於兩者之間為 Hold。'
        ]
      },
      weight: {
        title: '配置權重 (Weight) 指標說明',
        formula: '配置權重 = 財務健康評估 (Health Score) + 市場情緒修飾 (Sentiment Modifier)',
        details: [
          '單一股票配置上限為 15%，避免過度集中風險。',
          'Avoid (0%): 負債比率為 High Risk 時觸發（一票否決制）。',
          'Overweight (12%): 財務極佳（Health Score >= 8）且市場看好時配置。',
          'Equal Weight (5% - 8%): 財務與情緒穩定，作為防禦型核心持股。',
          'Underweight (2%): 基本面偏弱或情緒冰冷，調降權重防範下行。'
        ]
      },
      confidence: {
        title: '評估置信度 (Confidence) 指標說明',
        formula: '置信度反映 AI 對評級決策的信心程度（區間 50% ~ 95%）',
        details: [
          '當評級為 Buy 時: 置信度 = 70% + ((總分 - 70) / 30) * 25%',
          '當評級為 Sell 時: 置信度 = 70% + ((40 - 總分) / 40) * 25%',
          '當評級為 Hold 時: 置信度 = 50% + ((總分 - 40) / 30) * 20%',
          '因子方向越共振（接近 0 或 100 分），置信度越高；評分接近中性時，置信度則會降至 50% 附近。'
        ]
      }
    };

    const content = contentMap[type];
    if (!content) return null;

    return (
      <div 
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div 
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col p-6 relative animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all duration-300 hover:rotate-90 focus:outline-none"
            aria-label="關閉說明彈窗"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 pr-8 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            {content.title}
          </h4>

          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl p-3.5 mb-4 text-xs font-mono text-sky-600 dark:text-sky-400 break-words leading-relaxed">
            {content.formula}
          </div>

          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4 leading-relaxed overflow-y-auto">
            {content.details.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: Commit Modal component skeleton**

  ```bash
  git add src/components/InvestmentAdvicePanel.js
  git commit -m "feat: add activeModal state and AdvisoryModal component skeleton"
  ```

---

### Task 3: Integrate Buttons and Complete E2E Panel Tests

**Files:**
*   Modify: `src/components/InvestmentAdvicePanel.js`
*   Test: `tests/unit/components.test.js`

**Interfaces:**
*   Consumes: `AdvisoryModal` and `activeModal`
*   Produces: HTML buttons for `?` clicks and visual rendering of Modals

- [ ] **Step 1: Write JSDOM test simulating the buttons and ESC keyboard dismiss**

  更新 `tests/unit/components.test.js` 中的對應測試，將其改寫為：
  
  ```javascript
    test('renders modals and handles Escape key closure', () => {
      const mockAdvice = {
        portfolio: { targetWeight: 0.12, allocationClass: 'Overweight', rationale: 'Strong balance sheet' },
        buySell: { action: 'Buy', confidenceScore: 0.85, summary: 'Highly recommended' },
        risk: { riskLevel: 'Low', riskFactors: ['Minor competition'], riskMitigation: 'Set 10% stop loss' }
      };

      const { container } = render(<InvestmentAdvicePanel advice={mockAdvice} />);
      
      // Initially, no modal should be visible
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Click the Rating modal button
      const ratingBtn = screen.getByLabelText('查看評級策略公式與說明');
      fireEvent.click(ratingBtn);

      // Verify Rating modal opens
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('評級策略 (Rating) 指標說明')).toBeInTheDocument();

      // Simulate Escape key down
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  ```

  *(注意：需要在測試文件頂部引入 `fireEvent`：`import { render, screen, fireEvent } from '@testing-library/react';`)*

- [ ] **Step 2: Run test and verify it fails**

  Run: `npm test tests/unit/components.test.js`
  Expected: FAIL with "Unable to find label text '查看評級策略公式與說明'"

- [ ] **Step 3: Add SVG Buttons and conditionally render AdvisoryModal**

  修改 [InvestmentAdvicePanel.js](file:///D:/Programming/opencodeTest/src/components/InvestmentAdvicePanel.js)：
  1. 在 `評級策略 (Rating)` 的標題旁插入按鈕：
     ```jsx
     <div className="flex items-center justify-between mb-1">
       <div className="text-xs opacity-75 uppercase tracking-wider">評級策略 (Rating)</div>
       <button
         onClick={() => setActiveModal('rating')}
         className="text-slate-400 hover:text-slate-200 dark:hover:text-slate-100 transition-all duration-200 hover:scale-110 focus:outline-none"
         aria-label="查看評級策略公式與說明"
         type="button"
       >
         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
           <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
         </svg>
       </button>
     </div>
     ```
  2. 在 `配置權重 (Weight)` 的標題旁插入按鈕：
     ```jsx
     <div className="flex items-center justify-between mb-1">
       <div className="text-xs text-slate-400 uppercase tracking-wider">配置權重 (Weight)</div>
       <button
         onClick={() => setActiveModal('weight')}
         className="text-slate-400 hover:text-sky-500 transition-all duration-200 hover:scale-110 focus:outline-none"
         aria-label="查看配置權重公式與說明"
         type="button"
       >
         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
           <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
         </svg>
       </button>
     </div>
     ```
  3. 在 `評估置信度 (Confidence)` 的標題旁插入按鈕：
     ```jsx
     <div className="flex items-center justify-between mb-1">
       <div className="text-xs text-slate-400 uppercase tracking-wider">評估置信度 (Confidence)</div>
       <button
         onClick={() => setActiveModal('confidence')}
         className="text-slate-400 hover:text-sky-500 transition-all duration-200 hover:scale-110 focus:outline-none"
         aria-label="查看評估置信度公式與說明"
         type="button"
       >
         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
           <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
         </svg>
       </button>
     </div>
     ```
  4. 在組件最外層容器的閉合標籤前渲染 Modal：
     ```jsx
     {activeModal && (
       <AdvisoryModal 
         type={activeModal} 
         onClose={() => setActiveModal(null)} 
       />
     )}
     ```

- [ ] **Step 4: Run tests to verify all tests pass**

  Run: `npm test tests/unit/components.test.js`
  Expected: PASS

- [ ] **Step 5: Commit changes**

  ```bash
  git add src/components/InvestmentAdvicePanel.js tests/unit/components.test.js
  git commit -m "feat: integrate info icons and complete AdvisoryModal behavior tests"
  ```
