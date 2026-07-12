const { fetchStockData, fetchHistoricalData } = require('./data-fetcher');
const { performTechnicalAnalysis } = require('./technical-analysis');
const { performFundamentalAnalysis } = require('./fundamental-analysis');
const { performNewsAnalysis } = require('./news-analysis');
const { generateInvestmentAdvice } = require('./investment-advisor');

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

  // 3. Prepare fundamental metrics
  // In a real system, these would come from a financial API or db.
  // We supply mock/default metrics for demonstration.
  const fundamentalData = {
    price: stockInfo.price,
    eps: 6.2,
    peRatio: stockInfo.price / 6.2,
    debtRatio: 0.45,
    historicalEps: [5.1, 5.5, 6.2],
    revenueGrowth: 0.12,
    operatingCashFlow: 12000000000,
    capitalExpenditures: 3000000000
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
