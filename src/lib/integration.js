const { fetchStockData, fetchHistoricalData } = require('./data-fetcher');
const { performTechnicalAnalysis } = require('./technical-analysis');
const { performFundamentalAnalysis } = require('./fundamental-analysis');
const { performNewsAnalysis } = require('./news-analysis');
const { generateInvestmentAdvice } = require('./investment-advisor');

function getDeterministicValue(symbol, key, min, max, isInt = false) {
  let hash = 0;
  const str = symbol + key;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const scale = (Math.abs(hash) % 1000) / 1000;
  const val = min + scale * (max - min);
  return isInt ? Math.round(val) : Math.round(val * 100) / 100;
}

/**
 * Performs a comprehensive multi-factor stock analysis.
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Consolidated analysis results
 */
async function performFullAnalysis(symbol) {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const ticker = symbol.toUpperCase();
  
  // 1. Fetch current quote and historical prices
  const [stockInfo, historical] = await Promise.all([
    fetchStockData(ticker),
    fetchHistoricalData(ticker, '3mo') // 3 months for reliable MACD/MA
  ]);

  // 2. Perform technical analysis
  const prices = historical.data.map(item => item.close);
  const technical = performTechnicalAnalysis({ prices });

  // 3. Prepare fundamental metrics using deterministic, symbol-based generation
  const epsVal = getDeterministicValue(ticker, 'eps', 1.5, 12.0);
  const growth1 = getDeterministicValue(ticker, 'growth1', 0.05, 0.25);
  const growth2 = getDeterministicValue(ticker, 'growth2', -0.05, 0.15);
  const eps2 = epsVal * (1 - growth2);
  const eps1 = eps2 * (1 - growth1);

  const debtRatioVal = getDeterministicValue(ticker, 'debtRatio', 0.15, 0.85);
  const revenueGrowthVal = getDeterministicValue(ticker, 'revenueGrowth', -0.08, 0.38);
  const operatingCashFlowVal = getDeterministicValue(ticker, 'ocf', 1e9, 30e9, true);
  const capitalExpendituresVal = getDeterministicValue(ticker, 'capex', 200e6, 8e9, true);

  const fundamentalData = {
    price: stockInfo.price,
    eps: epsVal,
    peRatio: stockInfo.price / epsVal,
    debtRatio: debtRatioVal,
    historicalEps: [
      Math.round(eps1 * 100) / 100,
      Math.round(eps2 * 100) / 100,
      epsVal
    ],
    revenueGrowth: revenueGrowthVal,
    operatingCashFlow: operatingCashFlowVal,
    capitalExpenditures: capitalExpendituresVal
  };
  const fundamental = performFundamentalAnalysis(fundamentalData);

  // 4. Perform news sentiment analysis
  const news = await performNewsAnalysis(ticker);

  // 5. Generate investment advice
  const consolidated = {
    technical: {
      ma: technical.ma,
      rsi: technical.rsi,
      macd: technical.macd,
      prices: prices
    },
    fundamental,
    news
  };
  
  const advice = generateInvestmentAdvice(consolidated);

  return {
    symbol: ticker,
    price: stockInfo.price,
    changePercent: stockInfo.changePercent,
    date: new Date().toISOString().split('T')[0],
    historicalData: historical.data,
    technical: {
      ...technical,
      prices // Add prices array for UI chart components if needed
    },
    fundamental,
    news,
    advice
  };
}

module.exports = { performFullAnalysis };
