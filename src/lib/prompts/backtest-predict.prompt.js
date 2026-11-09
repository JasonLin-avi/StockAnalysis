/**
 * @fileoverview Backtest Predict Prompt Definition
 * 
 * Why:
 * Centralizes the 15-year senior quantitative trader prompt used for point-in-time
 * technical backtesting with strict lookahead protection.
 */

import { backtestPredictSchema } from './schemas.js';

export const BACKTEST_PREDICT_PROMPT_VERSION = '1.0.0';

/**
 * Formats the point-in-time prediction prompt for the LLM.
 * 
 * Why:
 * Enforces historical isolation by explicitly informing the LLM of the cutoff date,
 * supplying the chronological daily K-line & indicator table, and demanding structured JSON.
 * 
 * @param {Object} params
 * @param {string} params.symbol - Stock symbol
 * @param {string} params.cutoffDate - Point-in-time benchmark date
 * @param {number} params.lastClose - Close price on cutoff date
 * @param {number} params.recentPastLength - Number of lookback days
 * @param {number} params.maxClose - Maximum close in lookback window
 * @param {number} params.minClose - Minimum close in lookback window
 * @param {number|string} params.avgClose - Average close in lookback window
 * @param {string} params.markdownTable - Markdown table containing OHLCV & technical indicators
 * @returns {string} Formatted prompt string
 */
export function getBacktestPredictPrompt({
  symbol,
  cutoffDate,
  lastClose,
  recentPastLength,
  maxClose,
  minClose,
  avgClose,
  markdownTable,
}) {
  const avgCloseStr = typeof avgClose === 'number' ? avgClose.toFixed(2) : avgClose;

  return `你是一位擁有 15 年實戰經驗的資深量化交易員與技術分析專家。
你目前身處在【${cutoffDate}】這個歷史時間點，你對這個日期之後的任何股市新聞、財報與價格走勢一無所知！

請僅依據以下在 ${cutoffDate} 時刻獲得的 ${symbol} 歷史 K 線數據與技術指標時間序列進行客觀、嚴謹的技術分析與趨勢預測。
請特別觀察型態學發展（如頭肩頂/底、雙重底、盤整突破）、價量關係、多空均線排列與動能指標（RSI, MACD 柱體）：

【標的與時間點資訊】
- 股票代碼: ${symbol}
- 基準日期 (Cutoff Date): ${cutoffDate}
- 基準日當天收盤價: $${lastClose}
- 過去 ${recentPastLength} 個交易日區間最高價: $${maxClose}
- 過去 ${recentPastLength} 個交易日區間最低價: $${minClose}
- 過去 ${recentPastLength} 個交易日平均收盤價: $${avgCloseStr}

【歷史日 K 線與技術指標完整時間序列 (近 ${recentPastLength} 天)】
${markdownTable}

請根據上述數據與量化觀點，嚴格輸出 JSON 格式（不要包含 markdown 標籤或其餘文字）：
{
  "trend": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": 1到10的數字,
  "targetPriceRange": [最小預估價, 最大預估價],
  "stopLossPrice": 數字,
  "keySupport": 數字,
  "keyResistance": 數字,
  "rationale": "詳細推理分析說明 (請使用良好的 Markdown 格式排版，包含條列點、重點粗體、型態、均線、動能與價量關係)，請使用繁體中文撰寫，並提供精簡、專業且排版美觀的分析報告，包含清晰的小標題、重點列表項目與關鍵字強調。"
}`;
}

export { backtestPredictSchema };
