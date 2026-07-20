# K線技術分析 - 量化技術診斷面板設計規格 (Design Spec)

## 概述 (Overview)
在個股分析頁面的 **「K線技術分析」 (KlineTab)** 分頁中，新增獨立的 **右側量化技術診斷面板 (Quant AI Summary Block)**。
將 `src/lib/technical-analysis/klineanalysis.js` 的 `generateLLMTechnicalSummary` 運算結果整合至 `/api/stock/[symbol]/kline` 響應，並在 `KlineTab.jsx` 前端介面中以雙欄響應式網格 (`2:1` 比例) 呈現專業技術指標評級、長短線趨勢、支撐壓力位與量能分析。

---

## 系統架構與 API 異動 (System Architecture & API Changes)

### 1. API 路由擴充：`src/app/api/stock/[symbol]/kline/route.js`
* 引用 `generateLLMTechnicalSummary` 模組：
  ```javascript
  const { generateLLMTechnicalSummary } = require('@/lib/technical-analysis/klineanalysis');
  ```
* 將從 SQLite 資料庫讀取的歷史價格點整理為 `rawData` 物件（包含 `dates`, `opens`, `highs`, `lows`, `closes`, `volumes`）。
* 當歷史價格資料筆數 `>= 60` 時，呼叫 `generateLLMTechnicalSummary(rawData)` 產出結構化診斷結果。
* 將診斷結果附加至 API 響應 `summary` 欄位：
  ```json
  {
    "candles": [...],
    "volume": [...],
    "ma5": [...],
    "ma20": [...],
    "ma60": [...],
    "summary": {
      "date": "2026-06-80",
      "price_action": { "current_close": 949.5, "support_level_20d": 880.1, "resistance_level_20d": 939.8, "support_level_60d": 880.1, "resistance_level_60d": 939.8 },
      "technical_indicators": { "MA5": 947.2, "MA20": 932.1, "MA60": 910.5, "trend_short_term": "...", "trend_long_term": "...", "RSI_14": 62.4, "MACD_status": "..." },
      "volume_analysis": { "current_volume": 45200, "volume_vs_5d_avg": "量能平穩" }
    }
  }
  ```

---

## 前端 UI 設計與元件變更 (Frontend & UI Specifications)

### 2. 前端元件重構：`src/app/stock/[symbol]/KlineTab.jsx`
* 改為 **2:1 對稱雙欄響應式網格**：`grid grid-cols-1 lg:grid-cols-3 gap-6`。
* **左側 2 欄 (`lg:col-span-2`)**：放置 TradingView 互動式 K 線圖表與 1M/3M/6M/1Y/3Y 時間切換鈕。
* **右側 1 欄 (`lg:col-span-1`)**：新增 `🧠 量化技術診斷 (Quant AI Summary)` 卡片面板：
  1. **價格與支撐壓力位**：最新收盤價、漲跌幅、20日 / 60日支撐位與壓力位。
  2. **長短線趨勢標籤**：MA5/MA20/MA60 均線即時數值、短線趨勢標籤 (綠/紅徽章)、長線趨勢標籤 (季線架構徽章)。
  3. **動態指標**：RSI(14) 強弱度、MACD 狀態解讀。
  4. **量能狀態**：5 日量能對比標籤（如 `爆量` / `量能平穩`）。

---

## 自我審查 (Self-Review Checklist)
- [x] **無占位符 (No Placeholders)**：指定完整的 API 欄位、傳參與 UI 卡片佈局細節。
- [x] **架構一致性 (Consistency)**：無縫對接 `klineanalysis.js` 的 JSON 規格與現有 App Router 結構。
- [x] **響應式佈局 (Responsive Layout)**：桌面端 2:1 雙欄併排，行動端自動下壓堆疊。
