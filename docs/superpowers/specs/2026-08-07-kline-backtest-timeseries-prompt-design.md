# Embedded K-Line LLM Backtest with Dynamic Lookback & Full Time-Series Prompt Design Specification

## 1. Executive Summary

This document specifies the upgrade of the **Embedded K-Line LLM Backtest Feature** inside `KlineTab.jsx`.
Key enhancements:
1. **Dynamic Lookback History Controls**: Users can specify how many historical trading days (`lookbackDays`) the LLM should inspect before `cutoffDate` (options: 1 week/5d, 1 month/20d, 3 months/60d [Default], or Custom/Other).
2. **Full Time-Series K-Line Prompt (15-Year Senior Quant Persona)**: The `/api/backtest/predict` prompt will render a complete daily time-series Markdown table containing OHLCV, MA5, MA20, MA60, RSI(14), and MACD histogram values for every day in the lookback window. This enables true pattern recognition (e.g. W-bottoms, breakout bars, volume confirmation) over continuous lines.

---

## 2. UI / UX Design (`EmbeddedBacktestPanel.jsx`)

### 2.1 Control Panel Inputs

The control bar will display three input groups:

1. **Cutoff Date (`cutoffDate`)**: Date picker defaulting to 6 months prior to today.
2. **Historical Lookback Selector (`lookbackDays`)**:
   - `5` (1 週 / 5 交易日)
   - `20` (1 個月 / 20 交易日)
   - `60` (3 個月 / 60 交易日 - Default)
   - `custom` (自訂天數 / Other) ➔ Renders numeric input for custom lookback days.
3. **Prediction Horizon Selector (`predictionDays`)**:
   - `5` (1 週 / 5 交易日)
   - `20` (1 個月 / 20 交易日 - Default)
   - `60` (3 個月 / 60 交易日)
   - `custom` (自訂天數 / Other) ➔ Renders numeric input for custom prediction horizon.

---

## 3. Backend Prompt Design (`/api/backtest/predict/route.js`)

### 3.1 Time-Series Data Assembly & Exact Prompt Template

The backend retrieves `lookbackDays` trading days prior to `cutoffDate`, computes moving averages (MA5/20/60), RSI(14), and MACD histogram for each bar, and formats them into a continuous daily Markdown table.

#### Full Prompt Template:

```markdown
# Role (角色設定)
你是一位擁有 15 年經驗的資深量化交易員與資產配置專家。你的分析風格兼顧宏觀趨勢與微觀進出，既重視長線價值與波段型態，也重視短中線的風險報酬比（Risk/Reward Ratio）。

# Current Temporal Context (歷史時間點)
你目前身處在【${cutoffDate}】這個歷史時間點。
你對 ${cutoffDate} 之後的任何股市新聞、財報與價格走勢完全一無所知！

# Target & Prediction Horizon (分析標的與展望天數)
- 股票代碼: ${symbol}
- 歷史基準日 (Cutoff Date): ${cutoffDate}
- 預測展望天數: 未來 ${predictionDays} 個交易日
- 歷史參考長度: 過去 ${lookbackDays} 個交易日

# Historical K-Line Price & Indicator Time-Series (過去 ${lookbackDays} 個交易日連續走勢軌跡)
以下為至 ${cutoffDate} 為止，過去 ${lookbackDays} 個交易日的每日 K 線價格、成交量與關鍵技術指標軌跡序列（包含 MA5、MA20、MA60、RSI(14) 與 MACD 柱體）：

| 日期 | 開盤價 | 最高價 | 最低價 | 收盤價 | 成交量 | MA5 | MA20 | MA60 | RSI(14) | MACD柱體 |
|---|---|---|---|---|---|---|---|---|---|---|
${timeSeriesTableRows}

# Task (分析任務)
請站在 ${cutoffDate} 的當下視角，完整檢視上方過去 ${lookbackDays} 個交易日的 K 線波動軌跡、K 線型態 (如 W 底/頭肩頂/帶量突破/支撐扣抵)、價量關係與指標變化。
請預測 ${symbol} 在【未來 ${predictionDays} 個交易日】內的走勢。

請嚴格輸出 JSON 格式（不要包含 markdown 標籤或其餘文字）：
{
  "trend": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": 1到10的數字,
  "targetPriceRange": [最小預估價, 最大預估價],
  "stopLossPrice": 建議停損價數字,
  "keySupport": 關鍵支撐價,
  "keyResistance": 關鍵壓力價,
  "rationale": "詳細推理分析說明（包含對過去 ${lookbackDays} 天 K 線走勢軌跡、型態學、價量配合與未來 ${predictionDays} 個交易日展望的綜合剖析）"
}
```
