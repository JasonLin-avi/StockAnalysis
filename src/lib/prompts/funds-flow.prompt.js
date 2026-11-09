/**
 * @fileoverview Market Funds Flow Prompt Definition
 * 
 * Why:
 * Centralizes market liquidity and capital rotation prompt definitions,
 * supporting both Taiwan Stock Exchange (TW) and US Market (US) with date-anchored queries.
 */

export const FUNDS_FLOW_PROMPT_VERSION = '1.0.0';

/**
 * Formats market funds flow analysis prompt.
 * 
 * Why:
 * Guides the LLM to research capital rotation, institutional flows (三大法人 / institutional funds),
 * and leading sector performances using Google Search grounding.
 * 
 * @param {string|Object} marketOrOptions - Market indicator ('TW' | 'US') or options object
 * @param {string} [date] - Target ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted prompt string
 */
export function getFundsFlowPrompt(marketOrOptions, date) {
  let market;
  let targetDate = date;

  if (typeof marketOrOptions === 'object' && marketOrOptions !== null) {
    market = marketOrOptions.market;
    targetDate = marketOrOptions.date;
  } else {
    market = marketOrOptions;
  }

  const marketName = market === 'US' ? '美股' : '台股';
  return `你是一個專業的量化金融分析師。請利用 Google Search 網路搜尋功能，檢索並分析在 ${targetDate} 之前一個月內，${marketName} 市場的資金流動狀況。
請特別關注：
1. 資金主要流入與流出的板塊、行業或主要大型個股，尤其是這段時間內表現最為突出的幾隻科技股以及他們的資金流向的情況。
2. 三大法人（若為台股）或機構資金（若為美股）的最新主要動態。
3. 當前市場的熱點主題與板塊（特別是科技板塊）的輪動趨勢與資金流向數據。

請直接以精簡、專業的 Markdown 格式輸出你的分析報告，包含小標題、重點清單或比對表格，不要包含任何開場白或無關的贅詞。`;
}

// Backward-compatible alias
export const getPrompt = getFundsFlowPrompt;
