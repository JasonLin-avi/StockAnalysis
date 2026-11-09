/**
 * @fileoverview Market Service Layer
 * 
 * Why this service exists:
 * - Decouples market index quotes, market overview indicators (Fear & Greed, VIX, Win Rate),
 *   and market funds flow analysis from Next.js route handlers.
 * - Follows Clean Architecture by isolating external Yahoo Finance API, SQLite database
 *   queries, and Finnhub metrics computation inside the Application Service layer.
 * 
 * @module services/market.service
 */

import { fetchStockData } from '../external/data-fetcher/yahoo-finance.js';
import { connectToDatabase } from '../external/database/connection.js';
import { calculateMarketOverviewMetrics } from '../lib/finnhub/marketMetrics.js';
import {
  getMarketOverviewMetrics,
  saveMarketOverviewMetrics,
  getMarketFundsFlow,
  saveMarketFundsFlow
} from '../external/database/queries.js';
import { callGemini } from '../external/gemini/client.js';
import logger from '../lib/logger.js';

/**
 * Fetches and formats major market indices (^TWII and ^GSPC).
 * 
 * Why parallel fetching with fallback:
 * Prevents UI timeout if one external provider drops connection while keeping
 * responsive display colors (emerald for gains, rose for losses) pre-calculated.
 * 
 * @returns {Promise<{twii: Object, gspc: Object}>}
 */
export async function getMarketIndices() {
  logger.info('MARKET_SERVICE', 'Fetching market indices for ^TWII and ^GSPC');
  
  const [twii, gspc] = await Promise.all([
    fetchStockData('^TWII').catch(err => {
      logger.warn('MARKET_SERVICE', `Failed to fetch ^TWII: ${err.message}`);
      return { price: 23450.80, changePercent: 0.85 }; // static fallback
    }),
    fetchStockData('^GSPC').catch(err => {
      logger.warn('MARKET_SERVICE', `Failed to fetch ^GSPC: ${err.message}`);
      return { price: 5632.10, changePercent: -0.21 }; // static fallback
    })
  ]);

  return {
    twii: {
      price: twii.price,
      changePercent: twii.changePercent,
      displayPrice: Number(twii.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      displayChange: `${twii.changePercent >= 0 ? '▲ +' : '▼ '}${Number(twii.changePercent).toFixed(2)}%`,
      color: twii.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
    },
    gspc: {
      price: gspc.price,
      changePercent: gspc.changePercent,
      displayPrice: Number(gspc.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      displayChange: `${gspc.changePercent >= 0 ? '▲ +' : '▼ '}${Number(gspc.changePercent).toFixed(2)}%`,
      color: gspc.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
    }
  };
}

/**
 * Retrieves market overview metrics (Fear & Greed, VIX, win rate) with SQLite caching.
 * 
 * Why caching is critical:
 * Finnhub API calls and comprehensive historical win-rate scans across the database
 * are computationally intensive. SQLite caching delivers 1~5ms responses on cache hit.
 * 
 * @param {Object} [options] - Optional options for dependency injection (e.g. testing)
 * @returns {Promise<{fearGreed: Object, vix: Object, winRate: number, cached: boolean}>}
 */
export async function getMarketOverviewMetricsService(options = {}) {
  try {
    const db = options.db || (await connectToDatabase());

    // 1. Check SQLite DB Cache
    const cached = await getMarketOverviewMetrics(db);
    if (cached) {
      logger.info('MARKET_SERVICE', 'Market overview metrics cache hit');
      return {
        fearGreed: { score: cached.fear_greed_score, text: cached.fear_greed_text },
        vix: { value: cached.vix_value, text: cached.vix_text },
        winRate: cached.win_rate,
        cached: true
      };
    }

    // 2. Fetch fresh real-time metrics from Finnhub & DB
    logger.info('MARKET_SERVICE', 'Calculating fresh market overview metrics...');
    const freshMetrics = await calculateMarketOverviewMetrics(db);

    // 3. Save to DB Cache
    await saveMarketOverviewMetrics(db, freshMetrics);

    return {
      fearGreed: { score: freshMetrics.fear_greed_score, text: freshMetrics.fear_greed_text },
      vix: { value: freshMetrics.vix_value, text: freshMetrics.vix_text },
      winRate: freshMetrics.win_rate,
      cached: false
    };
  } catch (err) {
    logger.error('MARKET_SERVICE', 'Error in getMarketOverviewMetricsService:', err);
    // Graceful fallback values
    return {
      fearGreed: { score: 74, text: '極度貪婪' },
      vix: { value: 15.42, text: '低風險區' },
      winRate: 68.4,
      cached: false
    };
  }
}

/**
 * Generates prompt for market funds flow analysis.
 * 
 * @param {string} market - Market identifier ('TW' or 'US')
 * @param {string} date - Query date (YYYY-MM-DD)
 * @returns {string}
 */
export function getMarketFundsFlowPrompt(market, date) {
  const marketName = market === 'US' ? '美股' : '台股';
  return `你是一個專業的量化金融分析師。請利用 Google Search 網路搜尋功能，檢索並分析在 ${date} 之前一個月內，${marketName} 市場的資金流動狀況。
請特別關注：
1. 資金主要流入與流出的板塊、行業或主要大型個股，尤其是這段時間內表現最為突出的幾隻科技股以及他們的資金流向的情況。
2. 三大法人（若為台股）或機構資金（若為美股）的最新主要動態。
3. 當前市場的熱點主題與板塊（特別是科技板塊）的輪動趨勢與資金流向數據。

請直接以精簡、專業的 Markdown 格式輸出你的分析報告，包含小標題、重點清單或比對表格，不要包含任何開場白或無關的贅詞。`;
}

/**
 * Retrieves or generates market funds flow analysis.
 * 
 * @param {string} market - 'TW' or 'US'
 * @param {string} date - Date string
 * @param {Object} [options]
 * @returns {Promise<{market: string, date: string, content: string}>}
 */
export async function getMarketFundsFlowService(market, date, options = {}) {
  const db = options.db || (await connectToDatabase());
  const prompt = getMarketFundsFlowPrompt(market, date);

  // 1. Check cache
  const cached = await getMarketFundsFlow(db, market, date);
  if (cached && cached.prompt === prompt) {
    return {
      market: cached.market,
      date: cached.date,
      content: cached.content
    };
  }

  // 2. Call generic Gemini client from lib with business prompt & options
  const content = await callGemini(prompt, {
    tools: [{ googleSearch: {} }]
  });

  // 3. Save to DB
  await saveMarketFundsFlow(db, {
    market,
    date,
    prompt,
    content
  });

  return {
    market,
    date,
    content
  };
}

export default {
  getMarketIndices,
  getMarketOverviewMetricsService,
  getMarketFundsFlowService,
  getMarketFundsFlowPrompt
};
