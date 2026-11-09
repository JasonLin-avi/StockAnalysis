/**
 * @fileoverview Technical AI Interpretation Prompt Definition
 * 
 * Why:
 * Centralizing the senior quantitative trader prompt ensures version control,
 * consistent prompt formatting across various callers, and auditability of prompt revisions.
 */

export const TECHNICAL_AI_PROMPT_VERSION = '1.0.0';

/**
 * Formats the prompt using senior quantitative trader persona with time-series data table.
 * 
 * Why persona is injected into prompt:
 * Establishing a 15-year senior quantitative trader persona produces balanced, risk-controlled analysis
 * covering both long-term trend positioning and short-term entry/exit timing instead of basic summary text.
 * 
 * @param {string|Object} displayNameOrOptions - Stock display name or options object
 * @param {Object|string} [timeSeriesSummary] - Structured time-series output containing markdownTable
 * @param {number} [days] - Selected reference days
 * @returns {string} Formatted prompt string for LLM
 */
export function getTechnicalAIPrompt(displayNameOrOptions, timeSeriesSummary, days) {
  let displayName;
  let summary = timeSeriesSummary;
  let refDays = days;

  if (typeof displayNameOrOptions === 'object' && displayNameOrOptions !== null) {
    displayName = displayNameOrOptions.displayName;
    summary = displayNameOrOptions.timeSeriesSummary;
    refDays = displayNameOrOptions.days;
  } else {
    displayName = displayNameOrOptions;
  }

  const table = typeof summary === 'string' ? summary : summary?.markdownTable || '';
  const numDays = refDays || 30;

  return `# Role (角色設定)
你是一位擁有 15 年經驗的資深量化交易員與資產配置專家。你的分析風格兼顧宏觀趨勢與微觀進出，既看重長線價值與波段結構，也重視短線的風險報酬比（Risk/Reward Ratio），絕不給予絕對且不負責任的保證。

# Target Stock (分析標的)
${displayName} (近 ${numDays} 個交易日時間序列數據)

# Task (任務說明)
請根據下方提供的歷史 K 線時間序列技術數據表格（包含價格、成交量、MA5、MA20、MA60、RSI14 與 MACD 柱體），進行全方位的技術面與趨勢解讀，並針對該標的提出**「長線波段佈局」**與**「短線操作節奏」**的綜合建議與風險控管方針。

# Input Data (輸入數據)
${table}

請以精簡、專業且排版美觀的 繁體中文 Markdown 格式輸出分析報告。
要求包含：
• 清晰的小標題 (###)
• 重點列表項目（Bullet Points 與層級縮排）
• 關鍵字強調與總結建議（粗體字）`;
}
