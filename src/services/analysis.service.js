// Why: Centralize core stock analysis orchestration in a service layer, 
// separating API delivery concerns from business logic workflow.
// Following Google Engineering Standards, we define performFullAnalysis as the service's primary export.

import { fetchStockData, fetchHistoricalData, fetchFundamentalData, getLocal3YearPrices } from '../external/data-fetcher';
import { syncStockPrices }  from './data-sync.service.js';
import { performTechnicalAnalysis }  from '../lib/technical-analysis/index.js';
import { performFundamentalAnalysis }  from '../lib/fundamental-analysis/index.js';
import { performNewsAnalysis }  from '../lib/news-analysis/index.js';
import { generateInvestmentAdvice }  from '../lib/investment-advisor/index.js';
import { calculateBacktest }  from '../lib/technical-analysis/backtest.js';
import { connectToDatabase, getActiveDatabase }  from '../external/database/connection.js';
import { saveStock, insertStockDataBatch, saveStockData, saveAnalysisResults, getLatestAnalysisResults } from '../external/database/queries.js';
import logger  from '../lib/logger.js';

/**
 * Performs a comprehensive multi-factor stock analysis.
 * @param {string} symbol - Stock ticker symbol
 * @param {Object} db - Optional database connection override
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
  await syncStockPrices(activeDb, stockId, ticker);
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
    logger.error('INTEGRATION_DB_SAVE', `Failed to auto-save results for ${ticker}`, dbError);
  }

  return finalResult;
}

/**
 * Fetches the latest stock price and backtest results for a list of symbols.
 * If data is missing or incomplete, triggers performance analysis in-flight.
 * Formats the prices and change percentages, compiling all backtest horizons.
 * 
 * @param {Array<string>} symbols - Array of stock symbols
 * @returns {Promise<Object>} Compiled results map
 */
async function getLatestPricesAndBacktest(symbols) {
  const results = {};
  if (!symbols || symbols.length === 0) {
    return results;
  }

  // Why: Connect to database to check for cached analysis results.
  let db = null;
  try {
    db = getActiveDatabase() || await connectToDatabase();
  } catch (e) {
    logger.warn('ANALYSIS_SERVICE', 'Database connection unavailable for backtest metrics', e);
  }


  // Why: Fetch stock data and backtests in parallel to optimize latency.
  await Promise.all(symbols.map(async (symbol) => {
    try {
      const data = await fetchStockData(symbol);
      const horizons = [5, 10, 20, 40, 60, 120, 240];
      const backtestMetrics = {};

      horizons.forEach(h => {
        backtestMetrics[`winRate${h}d`] = 0;
        backtestMetrics[`avgReturn${h}d`] = 0;
      });

      if (db) {
        try {
          let analysis = await getLatestAnalysisResults(db, symbol);

          // Why: Incomplete analysis means it is missing critical horizons like 40d or 240d.
          const hasCompleteBacktest = analysis && 
                                     analysis.backtest && 
                                     analysis.backtest.winRate40d !== undefined && 
                                     analysis.backtest.winRate240d !== undefined;

          if (!hasCompleteBacktest) {
            logger.info('ANALYSIS_SERVICE', `No complete backtest found for ${symbol}. Triggering performFullAnalysis in-flight...`);
            analysis = await performFullAnalysis(symbol, db);
          }

          if (analysis && analysis.backtest) {
            horizons.forEach(h => {
              backtestMetrics[`winRate${h}d`] = analysis.backtest[`winRate${h}d`] || 0;
              backtestMetrics[`avgReturn${h}d`] = analysis.backtest[`avgReturn${h}d`] || 0;
            });
          }
        } catch (dbErr) {
          logger.warn('ANALYSIS_SERVICE', `Could not fetch or calculate backtest for ${symbol}`, dbErr);
        }
      }

      if (!data) {
        logger.warn('ANALYSIS_SERVICE', `No data returned for symbol: ${symbol}`);
        results[symbol] = {
          price: '$0.00',
          change: '+0.00%',
          color: 'text-emerald-400',
          ...backtestMetrics
        };
        return;
      }

      const isPriceValid = typeof data.price === 'number' && !isNaN(data.price);
      const isChangePercentValid = typeof data.changePercent === 'number' && !isNaN(data.changePercent);

      const priceVal = isPriceValid ? data.price : 0;
      const changePercentVal = isChangePercentValid ? data.changePercent : 0;

      // Why: Select colors dynamically (rose for negative, emerald for positive changes) to conform to design aesthetic standards.
      const color = changePercentVal >= 0 ? 'text-emerald-400' : 'text-rose-400';
      const sign = changePercentVal >= 0 ? '+' : '';
      results[symbol] = {
        price: `$${priceVal.toFixed(2)}`,
        change: `${sign}${changePercentVal.toFixed(2)}%`,
        color,
        ...backtestMetrics
      };

      logger.info('ANALYSIS_SERVICE', `Successfully fetched price for ${symbol}: ${results[symbol].price} (${results[symbol].change})`);
    } catch (err) {
      logger.error('ANALYSIS_SERVICE', `Failed to fetch price for ${symbol}`, err);
    }
  }));

  return results;
}

export {performFullAnalysis, getLatestPricesAndBacktest};
