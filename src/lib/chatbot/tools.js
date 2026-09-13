import { DynamicStructuredTool }  from '@langchain/core/tools';
import { z }  from 'zod';
import { performFullAnalysis }  from '../integration';

let analysisCache = {};
let cacheTimestamp = {};

// Why: Cache analysis results for 10 seconds to avoid redundant API fetches when the agent calls multiple tools in a single turn.
// Cache the Promise itself to prevent concurrent duplicate calls.
function getCachedAnalysis(symbol) {
  const cleanSymbol = (symbol || '').trim();
  // Why: Guard against un-interpolated template placeholders passed by LLMs
  if (/^\{.*\}$/.test(cleanSymbol)) {
    throw new Error(`無效的股票代碼: "${cleanSymbol}"。請使用實際股票代碼（如 2330.TW 或 AAPL），切勿傳入佔位符。`);
  }
  let ticker = cleanSymbol.toUpperCase();
  // Why: Automatically append .TW suffix for numeric Taiwan stock tickers (e.g., 2330 -> 2330.TW) if omitted by LLM.
  if (/^\d{4,6}$/.test(ticker)) {
    ticker = `${ticker}.TW`;
  }

  const now = Date.now();
  if (analysisCache[ticker] && (now - cacheTimestamp[ticker] < 10000)) {
    return analysisCache[ticker];
  }
  cacheTimestamp[ticker] = now;
  analysisCache[ticker] = performFullAnalysis(ticker).catch(err => {
    // Why: If the analysis fails, clear the cache entry immediately so subsequent requests can try again.
    delete analysisCache[ticker];
    delete cacheTimestamp[ticker];
    throw err;
  });
  return analysisCache[ticker];
}

// Why: Clear cache helper function to reset cache state between tests to prevent test contamination.
function clearCache() {
  analysisCache = {};
  cacheTimestamp = {};
}

const getTechnicalIndicatorsTool = new DynamicStructuredTool({
  name: 'get_technical_indicators',
  description: 'Get technical analysis indicators (RSI, MACD, MA) and closing prices for a given stock symbol (e.g., 2330.TW or AAPL).',
  schema: z.object({
    symbol: z.string().describe('The stock symbol, e.g., 2330.TW or AAPL'),
  }),
  func: async ({ symbol }) => {
    try {
      const data = await getCachedAnalysis(symbol);
      return JSON.stringify({
        symbol: data.symbol,
        price: data.price,
        technical: data.technical,
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
});

const getFundamentalMetricsTool = new DynamicStructuredTool({
  name: 'get_fundamental_metrics',
  description: 'Get fundamental analysis metrics (valuation, growth, PE ratio) for a given stock symbol (e.g., 2330.TW or AAPL).',
  schema: z.object({
    symbol: z.string().describe('The stock symbol, e.g., 2330.TW or AAPL'),
  }),
  func: async ({ symbol }) => {
    try {
      const data = await getCachedAnalysis(symbol);
      return JSON.stringify({
        symbol: data.symbol,
        price: data.price,
        fundamental: data.fundamental,
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
});

const getNewsSentimentTool = new DynamicStructuredTool({
  name: 'get_news_sentiment',
  description: 'Get recent news headlines and sentiment scores for a given stock symbol (e.g., 2330.TW or AAPL).',
  schema: z.object({
    symbol: z.string().describe('The stock symbol, e.g., 2330.TW or AAPL'),
  }),
  func: async ({ symbol }) => {
    try {
      const data = await getCachedAnalysis(symbol);
      return JSON.stringify({
        symbol: data.symbol,
        news: data.news,
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
});

const getInvestmentAdviceTool = new DynamicStructuredTool({
  name: 'get_investment_advice',
  description: 'Get compiled investment rating (Buy/Sell/Hold) and score breakdowns for a given stock symbol (e.g., 2330.TW or AAPL).',
  schema: z.object({
    symbol: z.string().describe('The stock symbol, e.g., 2330.TW or AAPL'),
  }),
  func: async ({ symbol }) => {
    try {
      const data = await getCachedAnalysis(symbol);
      return JSON.stringify({
        symbol: data.symbol,
        advice: data.advice,
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
});

export {getTechnicalIndicatorsTool,
  getFundamentalMetricsTool,
  getNewsSentimentTool,
  getInvestmentAdviceTool,
  clearCache,
  getCachedAnalysis,};
