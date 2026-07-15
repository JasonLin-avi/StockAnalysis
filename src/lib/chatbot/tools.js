const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { performFullAnalysis } = require('../integration');

let analysisCache = {};
let cacheTimestamp = {};

// Why: Cache analysis results for 10 seconds to avoid redundant API fetches when the agent calls multiple tools in a single turn.
// Cache the Promise itself to prevent concurrent duplicate calls.
function getCachedAnalysis(symbol) {
  const ticker = symbol.toUpperCase();
  const now = Date.now();
  if (analysisCache[ticker] && (now - cacheTimestamp[ticker] < 10000)) {
    return analysisCache[ticker];
  }
  cacheTimestamp[ticker] = now;
  analysisCache[ticker] = performFullAnalysis(ticker);
  return analysisCache[ticker];
}

// Why: Clear cache helper function to reset cache state between tests to prevent test contamination.
function clearCache() {
  analysisCache = {};
  cacheTimestamp = {};
}

const getTechnicalIndicatorsTool = new DynamicStructuredTool({
  name: 'get_technical_indicators',
  description: 'Get technical analysis indicators (RSI, MACD, MA) and closing prices for a given stock symbol.',
  schema: z.object({
    symbol: z.string().describe('The stock symbol, e.g., AAPL'),
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
  description: 'Get fundamental analysis metrics (valuation, growth, PE ratio) for a given stock symbol.',
  schema: z.object({
    symbol: z.string().describe('The stock symbol, e.g., AAPL'),
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
  description: 'Get recent news headlines and sentiment scores for a given stock symbol.',
  schema: z.object({
    symbol: z.string().describe('The stock symbol, e.g., AAPL'),
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
  description: 'Get compiled investment rating (Buy/Sell/Hold) and score breakdowns for a given stock symbol.',
  schema: z.object({
    symbol: z.string().describe('The stock symbol, e.g., AAPL'),
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

module.exports = {
  getTechnicalIndicatorsTool,
  getFundamentalMetricsTool,
  getNewsSentimentTool,
  getInvestmentAdviceTool,
  clearCache,
  getCachedAnalysis,
};
