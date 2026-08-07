/**
 * Backtest Service for Point-in-Time LLM Analysis & Evaluation
 *
 * Why: Separates historical data splitting logic from prediction/evaluation routines to strictly prevent lookahead bias.
 */

/**
 * Splits historical K-line data at a given cutoff date.
 * Past data up to and including the cutoff date is made available for analysis,
 * while future data after cutoff date is isolated for evaluation.
 *
 * @param {Array} klines - Array of K-line candle objects containing date/time and price fields.
 * @param {string} cutoffDate - ISO date string representing the cutoff point.
 * @param {number} predictionDays - Number of days to include in the future set (default: 20).
 * @returns {{ pastKlines: Array, futureKlines: Array }} Object containing past and future klines.
 */
export function splitHistoricalKlines(klines, cutoffDate, predictionDays = 20) {
  // Why: Guard against empty or invalid datasets to ensure system stability.
  if (!Array.isArray(klines) || klines.length === 0) {
    return { pastKlines: [], futureKlines: [] };
  }

  // Why: Attempt exact date match first to maintain candle sequence boundary integrity.
  const cutoffIndex = klines.findIndex(k => k.date === cutoffDate || k.time === cutoffDate);
  if (cutoffIndex === -1) {
    // Why: Fallback to string date filtering if exact index is not found (e.g. timestamp or weekend dates).
    const past = klines.filter(k => (k.date || k.time) <= cutoffDate);
    const future = klines.filter(k => (k.date || k.time) > cutoffDate).slice(0, predictionDays);
    return { pastKlines: past, futureKlines: future };
  }

  const pastKlines = klines.slice(0, cutoffIndex + 1);
  const futureKlines = klines.slice(cutoffIndex + 1, cutoffIndex + 1 + predictionDays);

  return { pastKlines, futureKlines };
}

/**
 * Preset historical backtest cases for easy demonstration and sandbox testing.
 *
 * Why: Allows users to immediately run benchmark historical scenarios without manually searching dates.
 */
export const PRESET_CASES = [
  {
    id: 'tsmc-2024-breakout',
    symbol: '2330.TW',
    cutoffDate: '2024-03-01',
    title: '台積電千元前夕突破點',
    description: '站在 2024-03-01 時間點，評估台積電突破多頭攻擊訊號。'
  },
  {
    id: 'nvda-2023-earnings',
    symbol: 'NVDA',
    cutoffDate: '2023-05-15',
    title: 'NVIDIA 財報大漲前夕',
    description: '站在 2023 年 AI 狂潮爆發初期，讓 LLM 分析型態。'
  }
];
