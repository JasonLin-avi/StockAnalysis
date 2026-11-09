/**
 * @fileoverview Backtest Evaluation Prompt Definition
 * 
 * Why:
 * Centralizes the objective referee prompt that scores LLM price forecasts
 * against actual historical market outcomes post-cutoff date.
 */

import { backtestEvaluateSchema } from './schemas.js';

export const BACKTEST_EVALUATE_PROMPT_VERSION = '1.0.0';

/**
 * Formats the evaluation prompt for the referee LLM.
 * 
 * Why:
 * Injects historical forecast details alongside actual future price performance
 * to instruct the LLM to output a structured scoring report adhering to backtestEvaluateSchema.
 * 
 * @param {Object} params
 * @param {string} params.symbol - Stock ticker
 * @param {string} params.cutoffDate - Point-in-time benchmark date
 * @param {number} params.futureDays - Number of revealed future trading days
 * @param {Object} [params.predictionResult] - Prior forecast object
 * @param {number} params.startPrice - Price at cutoff date
 * @param {string} params.startDate - Actual trading date at cutoff
 * @param {number} params.endPrice - Closing price after futureDays
 * @param {string} params.endDate - Actual trading date at horizon
 * @param {number} params.actualReturnPct - Percentage change over horizon
 * @param {boolean} params.directionCorrect - Whether forecast trend matched actual sign
 * @param {boolean} params.priceRangeHit - Whether endPrice landed within forecast range
 * @param {number|string} [params.minTarget] - Lower boundary of forecast target price
 * @param {number|string} [params.maxTarget] - Upper boundary of forecast target price
 * @returns {string} Formatted prompt string
 */
export function getBacktestEvaluatePrompt({
  symbol,
  cutoffDate,
  futureDays,
  predictionResult = {},
  startPrice,
  startDate,
  endPrice,
  endDate,
  actualReturnPct,
  directionCorrect,
  priceRangeHit,
  minTarget = 'N/A',
  maxTarget = 'N/A',
}) {
  return `你是一位客觀嚴謹的金融裁判。
請針對 Predictor LLM 在歷史時間點【${cutoffDate}】對 ${symbol} 發布的預測，對比【未來 ${futureDays} 個交易日】的真實市場表現進行客觀評估：

【AI 歷史預測內容】
- 看法方向: ${predictionResult?.trend || 'N/A'}
- 目標價區間: $${minTarget} - $${maxTarget}
- 建議停損價: $${predictionResult?.stopLossPrice || 'N/A'}
- 推理說明: ${predictionResult?.rationale || 'N/A'}

【實際市場後續表現】
- 基準日價格: $${startPrice} (${startDate})
- 經過 ${futureDays} 個交易日後收盤價: $${endPrice} (${endDate})
- 實際漲跌幅: ${actualReturnPct}%
- 方向是否正確: ${directionCorrect ? '是' : '否'}

請嚴格輸出 JSON 格式（不要包含 markdown 標籤或其餘文字）：
{
  "accuracyScore": 0到100的整數數字,
  "directionCorrect": ${directionCorrect},
  "priceRangeHit": ${priceRangeHit},
  "actualReturnPct": ${actualReturnPct},
  "evaluationSummary": "詳細精簡的覆盤評語"
}`;
}

export { backtestEvaluateSchema };
