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
const { saveStock, insertStockDataBatch } = require('./database/queries');



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
  const activeDb = db || getActiveDatabase() || await connectToDatabase();
  const stockId = await saveStock(activeDb, { symbol: ticker, market: ticker.includes('.') ? 'TW' : 'US' });
  // Sync recent price data
  await syncStockPricesIncremental(activeDb, stockId, ticker);
  // Ensure we have at least one year of historical data for backtesting
  const ONE_YEAR_DAYS = 365; // target coverage
  // Get all local prices (could be more than needed)
  let localPrices = await getLocal3YearPrices(activeDb, stockId);
  // Determine if we have enough recent data (within the past year)
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setDate(oneYearAgo.getDate() - ONE_YEAR_DAYS);
  const startDateStr = oneYearAgo.toISOString().slice(0,10);
  const recentPrices = localPrices.filter(p => p.date >= startDateStr);
  if (recentPrices.length < ONE_YEAR_DAYS) {
    // Missing data for the past year; fetch exactly one year of history
    const missingDataResult = await fetchHistoricalData(ticker, '1y');
    const missingData = missingDataResult.data || [];
    if (missingData.length > 0) {
      await insertStockDataBatch(activeDb, stockId, missingData);
      // Refresh localPrices after insertion
      localPrices = await getLocal3YearPrices(activeDb, stockId);
    }
  }
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

  const finalResult = {
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

  // Unify and encapsulate DB write logic directly in the integration layer
  try {
    const { saveStockData, saveAnalysisResults } = require('./database/queries');
    const dailyPrices = historical.data.map(item => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    }));
    await saveStockData(activeDb, ticker, dailyPrices);
    await saveAnalysisResults(activeDb, ticker, finalResult.date, finalResult);
  } catch (dbError) {
    const logger = require('./logger');
    logger.error('INTEGRATION_DB_SAVE', `Failed to auto-save results for ${ticker}`, dbError);
  }

  return finalResult;
}

module.exports = { performFullAnalysis };
