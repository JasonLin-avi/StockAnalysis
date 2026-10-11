/**
 * @fileoverview 多週期 K 線聚合工具函式 (Multi-Timeframe Bar Aggregation Utility)
 * 
 * 為何設計此模組：
 * - 技術分析圖表支援切換日線 ('1d')、週線 ('1w') 與月線 ('1mo') 等不同時間維度。
 * - 本地端聚合能避免頻繁向後端伺服器請求重疊歷史資料，有效降低網路開銷並提升圖表切換流暢度。
 * - 聚合原則遵循金融市場標準規範：保留週期首日之開盤價 (Open)、期間最高價 (High)、
 *   期間最低價 (Low)、週期末日之收盤價 (Close)、累計總成交量 (Volume)，
 *   並以該週期最後一個實際交易日之日期作為該根 K 棒之時間標記。
 * 
 * @module lib/technical-analysis/aggregation
 */

/**
 * 取得給定 YYYY-MM-DD 日期的 ISO 週別代碼 (例如 "2026-W02")
 * 
 * 為何採用 ISO 週別演算法：
 * - 股票市場習慣將週一至週日視為同一交易週，週線以此為基礎聚合。
 * - 依循 ISO-8601 標準，能跨年份正確處理歲末年初跨週歸屬問題。
 * 
 * @param {string} dateStr - 日期字串 (YYYY-MM-DD 或 ISO 格式)
 * @returns {string} 週別唯一識別鍵值 (YYYY-Www)
 */
function getWeekKey(dateStr) {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00Z'));
  const day = d.getUTCDay() || 7; // 週日調整為 7，週一為 1
  d.setUTCDate(d.getUTCDate() + 4 - day); // 移至該週週四以定位正確 ISO 年份
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * 將日 K 線陣列依據指定週期聚合為日線、週線或月線
 * 
 * @param {Array<{date: string, open: number, high: number, low: number, close: number, volume: number}>} prices - 原始日 K 線陣列
 * @param {'1d'|'1w'|'1mo'} [interval='1d'] - 目標時間維度
 * @returns {Array<{date: string, open: number, high: number, low: number, close: number, volume: number}>} 聚合後之 K 線陣列
 */
export function aggregateBars(prices, interval = '1d') {
  // 輸入防禦：非陣列或空陣列直接返回空陣列
  if (!Array.isArray(prices) || prices.length === 0) {
    return [];
  }

  const normInterval = (interval || '1d').toLowerCase();

  // 日線維度不需進行聚合，直接返回原始陣列
  if (normInterval === '1d') {
    return prices;
  }

  const groups = new Map();

  for (const bar of prices) {
    const dateStr = String(bar.date || bar.time || '');
    let key;

    if (normInterval === '1w') {
      key = getWeekKey(dateStr);
    } else if (normInterval === '1mo') {
      // 擷取 YYYY-MM 作為月份聚合群組鍵值
      key = dateStr.slice(0, 7);
    } else {
      key = dateStr;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(bar);
  }

  const aggregated = [];

  for (const [, bars] of groups) {
    if (bars.length === 0) continue;

    const first = bars[0];
    const last = bars[bars.length - 1];

    let maxHigh = -Infinity;
    let minLow = Infinity;
    let totalVolume = 0;

    for (const b of bars) {
      if (typeof b.high === 'number' && b.high > maxHigh) {
        maxHigh = b.high;
      }
      if (typeof b.low === 'number' && b.low < minLow) {
        minLow = b.low;
      }
      if (typeof b.volume === 'number' && !Number.isNaN(b.volume)) {
        totalVolume += b.volume;
      }
    }

    aggregated.push({
      date: last.date || last.time, // 依循金融慣例，使用該週期內最後一個交易日作為 K 棒日期
      open: first.open,             // 週期首日開盤價
      high: maxHigh === -Infinity ? first.high : maxHigh,
      low: minLow === Infinity ? first.low : minLow,
      close: last.close,           // 週期末日收盤價
      volume: totalVolume          // 週期累計總成交量
    });
  }

  return aggregated;
}
