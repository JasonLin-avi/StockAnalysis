/**
 * @fileoverview Financial Trend Prompt Definition
 * 
 * Why:
 * Centralizes the 5-year financial trend analysis and five-dimension scoring prompt
 * to guarantee uniform evaluation criteria across all financial analysis endpoints.
 */

export const FINANCIAL_TREND_PROMPT_VERSION = '1.0.0';

/**
 * Formats the financial trend analysis prompt.
 * 
 * Why:
 * Guides the LLM to inspect revenue growth, net profit, free cash flow, profit margins,
 * debt levels, and ROE to synthesize a balanced financial health rating.
 * 
 * @param {string|Object} displayNameOrOptions - Stock display name or options object
 * @param {number} [years=5] - Number of years to analyze
 * @returns {string} Formatted prompt string
 */
export function getFinancialTrendPrompt(displayNameOrOptions, years = 5) {
  let displayName;
  let periodYears = years;

  if (typeof displayNameOrOptions === 'object' && displayNameOrOptions !== null) {
    displayName = displayNameOrOptions.displayName;
    periodYears = displayNameOrOptions.years || 5;
  } else {
    displayName = displayNameOrOptions;
  }

  return `分析股票 ${displayName} 過去 ${periodYears} 年的財務數據。
請拆解：
• 營收成長
• 淨利趨勢
• 自由現金流
• 利潤率
• 負債水準
• 股東權益報酬率（ROE）

並判斷這家公司目前是財務體質正在變強，還是開始走弱。
請以精簡、專業的 繁體中文 Markdown 格式輸出，包含清晰的小標題、重點清單與比較表格。`;
}
