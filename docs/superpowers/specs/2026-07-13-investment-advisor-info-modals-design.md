# 投資顧問指標說明彈窗設計規格書 (Investment Advisor Info Modals Design Spec)

- **日期**: 2026-07-13
- **主題**: AI 智能投資決策報告之評級策略、配置權重、評估置信度說明彈窗
- **狀態**: 已批准 (Approved)
- **設計方案**: 方案 B (玻璃擬態微光彈窗)

---

## 1. 背景與動機 (Background & Context)
用戶希望在系統前端的「AI 智能投資決策報告」區塊中，能更透明地了解各核心指標（評級策略、配置權重、評估置信度）背後的計算公式與業務意義。
本設計旨在這三個指標卡片的標題旁新增一個精美的「?」說明按鈕，點擊後會彈出一個玻璃擬態風格的 Modal 彈窗，提供詳細且易讀的數學公式、判定門檻及業務邏輯說明，使用戶能更直觀地信任與分析數據。

---

## 2. 功能需求 (Functional Requirements)
1.  **獨立圖示與彈窗**:
    *   在「評級策略 (Rating)」、「配置權重 (Weight)」、「評估置信度 (Confidence)」三個卡片標題旁各自放置一個獨立的 `?` 圖示按鈕。
    *   點擊不同的 `?` 按鈕會開啟對應該指標說明的專屬彈窗，點擊另外兩個時，先前的彈窗應正常關閉。
2.  **玻璃擬態視覺風格 (Glassmorphic UI)**:
    *   **背景遮罩**: 提供 `backdrop-blur-sm` 毛玻璃模糊效果與半透明暗底色，淡化後方复杂的 K 線與報表，聚焦用戶視野。
    *   **彈窗主體**: 採用 `backdrop-blur-md` 結合半透明白色/深色背景、大圓角、亮色細邊框與深邃的投影效果，提升科技感。
    *   **過渡動畫**: 彈窗顯示與消失時，具有平滑的淡入淡出 (`fade-in`) 以及微縮放的彈出動畫 (`scale-up`)。
3.  **無障礙與關閉機制**:
    *   點擊彈窗右上角的「✕」關閉按鈕，或是點擊彈窗外部（背景遮罩區域）可關閉彈窗。
    *   支持鍵盤監聽，當按下 `Esc` 鍵時，自動關閉當前開啟的彈窗。

---

## 3. 技術設計與介面結構 (Technical Design & Components)

### 3.1 狀態設計 (State Design)
於 [InvestmentAdvicePanel.js](file:///D:/Programming/opencodeTest/src/components/InvestmentAdvicePanel.js) 中新增：
```javascript
const [activeModal, setActiveModal] = React.useState(null); 
// 狀態值：null (無開啟) | 'rating' (評級) | 'weight' (權重) | 'confidence' (置信度)
```

並新增 `useEffect` 監聽鍵盤事件以支援 `Esc` 鍵關閉：
```javascript
React.useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setActiveModal(null);
    }
  };
  
  if (activeModal) {
    window.addEventListener('keydown', handleKeyDown);
  }
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [activeModal]);
```

### 3.2 UI 組件與佈局 (UI Layout)
```
[ BackDrop Blur Mask (z-50) ]
        |
        +-- [ Glassmorphic Dialog Container ]
                    |
                    +-- [ Close Button (✕) ]
                    +-- [ Modal Title ]
                    +-- [ Modal Content (Detailed Formulas & Explanation) ]
```

#### CSS 動畫定義 (將寫入 `src/app/globals.css` 或 `index.css`)
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

---

## 4. 彈窗內容說明 (Modal Contents)

### 4.1 評級策略 (Rating) Modal
*   **公式展示區**:
    ```text
    總分 (100) = 基本面評分 (50) + 技術面評分 (30) + 情緒評分 (20)
    ```
*   **詳細解說**:
    *   **基本面 (50分)**: 依據本益比、EPS、負債比率、營收成長與現金流進行打分（各占10分）。
    *   **技術面 (30分)**: 依據 RSI、移動平均線 (MA) 與 MACD 指標的趨勢判定（各占10分）。
    *   **情緒面 (20分)**: 依據新聞輿情與社群熱度指數進行正負值轉換與計分。
*   **決策規則**:
    *   `總分 >= 70`: **Buy (買入)** — 基礎面扎實且多頭動能強勁。
    *   `總分 <= 40`: **Sell (賣出)** — 存在財務警訊或下行趨勢成形。
    *   `40 < 總分 < 70`: **Hold (持有)** — 趨勢中性，多空因素拉鋸。

### 4.2 配置權重 (Weight) Modal
*   **規則展示區**:
    ```text
    配置權重 = 財務健康評估 (Health Score) + 市場情緒修飾 (Sentiment Modifier)
    單一股票最高配置上限: 15% (避免過度集中風險)
    ```
*   **詳細解說**:
    *   **Avoid (0%)**: 負債比率為 `High Risk` 時觸發（一票否決制），防止嚴重債務風險。
    *   **Overweight (12%)**: 財務極佳（`Health Score >= 8`）且市場偏向多頭時配置，捕獲超額報酬。
    *   **Equal Weight (5% - 8%)**: 財務與情緒穩定，適合作為投資組合的防禦型主要持股。
    *   **Underweight (2%)**: 基本面偏弱或情緒冰冷，調降權重防範下行風險。

### 4.3 評估置信度 (Confidence) Modal
*   **公式展示區**:
    *   當評級為 **Buy** 且總分 $\ge 70$:
        $$\text{置信度} = 70\% + \frac{\text{總分} - 70}{30} \times 25\% \quad (\text{最高 } 95\%)$$
    *   當評級為 **Sell** 且總分 $\le 40$:
        $$\text{置信度} = 70\% + \frac{40 - \text{總分}}{40} \times 25\% \quad (\text{最高 } 95\%)$$
    *   當評級為 **Hold** 且 $40 < \text{總分} < 70$:
        $$\text{置信度} = 50\% + \frac{\text{總分} - 40}{30} \times 20\% \quad (\text{區間 } 50\% \sim 70\%)$$
*   **詳細解說**:
    置信度反映 AI 對評級操作的「確信程度」。多因子方向高度共振時（分數接近極端值 0 或 100），置信度逼近 95%；若因子表現分歧，評分接近中性區間時，置信度則會降至 50% 附近，提示用戶需謹慎看待。

---

## 5. 測試策略 (Test Plan)
1.  **單元與狀態測試**:
    *   測試 `activeModal` 狀態切換，確認點擊各按鈕能成功開啟對應 Modal，並在關閉時狀態正確歸零。
    *   模擬鍵盤事件，測試當 Modal 開啟時，按下 `Escape` 鍵能正確關閉 Modal。
2.  **DOM 與無障礙測試**:
    *   確認 Modal 開啟時，畫面出現包含 "✕"、"公式"、"關閉" 等關鍵字與無障礙標籤 (`aria-label`) 的元素。
    *   點擊背景遮罩元素，測試 Modal 關閉是否正確觸發。
