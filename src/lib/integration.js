const { 
  fetchStockData, 
  fetchHistoricalData, 
  fetchFundamentalData,
  syncStockPricesIncremental,
  getLocal3YearPrices
} = require('./data-fetcher');
const { performTechnicalAnalysis } = require('./technical-analysis');
const { performFundamentalAnalysis } = require('./fundamental-analysis');
const { performNewsAnalysis } = require('./news-analysis');
const { generateInvestmentAdvice } = require('./investment-advisor');
const { calculateBacktest } = require('./technical-analysis/backtest');
const { connectToDatabase, getActiveDatabase } = require('./database/connection');
const { saveStock } = require('./database/queries');



/**
 * Performs a comprehensive multi-factor stock analysis.
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Consolidated analysis results
 */
async function performFullAnalysis(symbol, db = null) {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const ticker = symbol.toUpperCase();
  
  // 1. Fetch current quote, historical prices and fundamental metrics from live API
  const [stockInfo, historical, rawFundamentals] = await Promise.all([
    fetchStockData(ticker),
    fetchHistoricalData(ticker, '3mo'), // 3 months for reliable MACD/MA
    fetchFundamentalData(ticker)
  ]);

  // Connect to the active database (or open default one) to perform price sync and backtest.
  // We use this pattern so that in integration tests, we automatically inherit the :memory: database.
  const activeDb = db || getActiveDatabase() || await connectToDatabase();
  const stockId = await saveStock(activeDb, { symbol: ticker, market: ticker.includes('.') ? 'TW' : 'US' });

  // 1. Sync price data incrementally and cache in local database
  await syncStockPricesIncremental(activeDb, stockId, ticker);
  
  // 2. Fetch full 3 years local historical data for backtesting
  const localPrices = await getLocal3YearPrices(activeDb, stockId);
  
  // 3. Run pattern matching backtest
  const backtestResult = calculateBacktest(localPrices);

  // 2. Perform technical analysis
  const prices = historical.data.map(item => item.close);
  const technical = performTechnicalAnalysis({ prices });

  // 3. Prepare fundamental metrics using live data only
  const epsVal = rawFundamentals.eps;
  const debtRatioVal = rawFundamentals.debtRatio;
  const revenueGrowthVal = rawFundamentals.revenueGrowth;
  const operatingCashFlowVal = rawFundamentals.operatingCashFlow;
  const capitalExpendituresVal = rawFundamentals.capitalExpenditures;

  const historicalEps = rawFundamentals.historicalEps || [];

  const fundamentalData = {
    price: stockInfo.price,
    eps: epsVal,
    peRatio: epsVal !== 0 ? stockInfo.price / epsVal : 0,
    debtRatio: debtRatioVal,
    historicalEps,
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
    name: stockInfo.name || ticker,
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
    advice,
    backtest: backtestResult
  };
}

module.exports = { performFullAnalysis };
