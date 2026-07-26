const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
import logger  from '../../lib/logger';

/**
 * Helper to fetch a URL with automatic retries and exponential backoff.
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Base delay in milliseconds (default: 300)
 * @returns {Promise<Response>} Fetch Response
 */
async function fetchWithRetry(url, options = {}, retries = 3, delay = 300) {
  const actualDelay = process.env.NODE_ENV === 'test' ? 1 : delay;
  let currentDelay = actualDelay;
  
  // Why: Next.js aggressively caches fetch requests by default. 
  // We must bypass the cache to ensure we get real-time stock quotes.
  const fetchOptions = { ...options, cache: 'no-store' };

  for (let i = 0; i < retries; i++) {
    try {
      logger.info('FETCH_YAHOO_RAW', `Sending request to: ${url} (Attempt ${i + 1}/${retries})`);
      const response = await fetch(url, fetchOptions);
      
      // Why: Retry on temporary server errors (5xx) or rate limit hits (429).
      if (response.status >= 500 || response.status === 429) {
        if (i < retries - 1) {
          logger.warn('FETCH_YAHOO_RAW', `Fetch returned status ${response.status} for URL ${url}. Retrying in ${currentDelay}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= 2;
          continue;
        }
      }
      logger.info('FETCH_YAHOO_RAW', `Received response status ${response.status} from URL: ${url}`);
      return response;
    } catch (err) {
      // Why: Retry on network-level failures (e.g. DNS resolve failures, connection reset, connection timed out).
      if (i < retries - 1) {
        logger.warn('FETCH_YAHOO_RAW', `Fetch error for URL ${url}: ${err.message}. Retrying in ${currentDelay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= 2;
        continue;
      }
      logger.error('FETCH_YAHOO_RAW', `Fetch failed after ${retries} attempts for URL ${url}`, err);
      throw err;
    }
  }
}

/**
 * Fetches current stock data from Yahoo Finance.
 * @param {string} symbol - Stock symbol (e.g. 'AAPL')
 * @returns {Promise<Object>} Standardized stock data
 */
async function fetchStockData(symbol) {
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  logger.info('FETCH_YAHOO', `Fetching current stock data for: ${symbol}`);
  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    logger.error('FETCH_YAHOO', `Yahoo Finance stock data API error for ${symbol}: ${response.status} ${response.statusText}`);
    throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
    logger.warn('FETCH_YAHOO', `No stock data found in Yahoo response for symbol: ${symbol}`);
    throw new Error(`No data found for symbol: ${symbol}`);
  }

  const result = data.chart.result[0];
  const meta = result.meta;
  const quote = result.indicators.quote[0];

  const price = meta.regularMarketPrice;
  const previousClose = meta.previousClose ?? meta.chartPreviousClose;
  const change = price - previousClose;
  const changePercent = (change / previousClose) * 100;

  const parsedData = {
    symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    volume: meta.regularMarketVolume ?? (quote.volume ? quote.volume[quote.volume.length - 1] : 0),
    high: meta.regularMarketDayHigh ?? (quote.high ? quote.high[quote.high.length - 1] : price),
    low: meta.regularMarketDayLow ?? (quote.low ? quote.low[quote.low.length - 1] : price),
    open: meta.regularMarketOpen ?? (quote.open ? quote.open[quote.open.length - 1] : price),
    previousClose,
    timestamp: result.timestamp ? result.timestamp[result.timestamp.length - 1] * 1000 : Date.now()
  };

  logger.info('FETCH_YAHOO', `Successfully parsed stock data for ${symbol}`, parsedData);
  return parsedData;
}

/**
 * Fetches historical price data from Yahoo Finance.
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time range: '1d', '5d', '1mo', '3mo', '6mo', '1y', '5y', 'max'
 * @returns {Promise<Object>} Standardized historical data
 */
async function fetchHistoricalData(symbol, period = '1mo') {
  const intervalMap = {
    '1d': '1m',
    '5d': '5m',
    '1mo': '1d',
    '3mo': '1d',
    '6mo': '1d',
    '1y': '1d',
    '2y': '1d',
    '5y': '1mo',
    '10y': '1mo',
    'max': '3mo'
  };

  const interval = intervalMap[period] || '1d';
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?range=${period}&interval=${interval}`;

  logger.info('FETCH_YAHOO', `Fetching historical data for: ${symbol} (period: ${period})`);
  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    logger.error('FETCH_YAHOO', `Yahoo Finance historical API error for ${symbol}: ${response.status} ${response.statusText}`);
    throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
  }

  const raw = await response.json();

  if (!raw.chart || !raw.chart.result || raw.chart.result.length === 0) {
    logger.warn('FETCH_YAHOO', `No historical data found in Yahoo response for symbol: ${symbol}`);
    throw new Error(`No historical data found for symbol: ${symbol}`);
  }

  const result = raw.chart.result[0];
  const timestamps = result.timestamp || [];
  const quote = result.indicators.quote[0];
  const adjclose = result.indicators.adjclose ? result.indicators.adjclose[0].adjclose : null;

  const data = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quote.open[i] ?? null,
      high: quote.high[i] ?? null,
      low: quote.low[i] ?? null,
      close: quote.close[i] ?? null,
      volume: quote.volume[i] ?? 0,
      adjClose: adjclose ? adjclose[i] ?? null : null
    }))
    .filter(item => item.open !== null && item.close !== null);

  if (data.length === 0) {
    logger.warn('FETCH_YAHOO', `No valid historical data points found for symbol: ${symbol}`);
    throw new Error(`No valid historical data points for symbol: ${symbol}`);
  }

  logger.info('FETCH_YAHOO', `Successfully parsed historical data for ${symbol}`, {
    period,
    dataPointsCount: data.length,
    firstPoint: data[0],
    lastPoint: data[data.length - 1]
  });

  return {
    symbol,
    period,
    data
  };
}

let cachedCookie = null;
let cachedCrumb = null;

async function getSession() {
  if (cachedCookie && cachedCrumb) {
    logger.info('FETCH_YAHOO_SESSION', 'Using cached Yahoo cookie and crumb');
    return { cookie: cachedCookie, crumb: cachedCrumb };
  }

  logger.info('FETCH_YAHOO_SESSION', 'Establishing new session with fc.yahoo.com');

  // 1. Get cookie from fc.yahoo.com
  const fcResponse = await fetchWithRetry('https://fc.yahoo.com', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  
  const cookie = fcResponse.headers.get('set-cookie');
  if (!cookie) {
    logger.error('FETCH_YAHOO_SESSION', 'No set-cookie header received from fc.yahoo.com');
    throw new Error('No set-cookie header received from fc.yahoo.com');
  }

  // 2. Get crumb from getcrumb endpoint
  logger.info('FETCH_YAHOO_SESSION', 'Fetching crumb from getcrumb endpoint');
  const crumbResponse = await fetchWithRetry('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!crumbResponse.ok) {
    logger.error('FETCH_YAHOO_SESSION', `Failed to fetch crumb from Yahoo. Status: ${crumbResponse.status}`);
    throw new Error(`Failed to fetch crumb from Yahoo: ${crumbResponse.status}`);
  }

  const crumb = await crumbResponse.text();
  if (!crumb) {
    logger.error('FETCH_YAHOO_SESSION', 'No crumb content received from Yahoo');
    throw new Error('No crumb received from Yahoo');
  }

  cachedCookie = cookie;
  cachedCrumb = crumb;
  logger.info('FETCH_YAHOO_SESSION', `Successfully obtained new Yahoo session crumb: "${crumb}"`);
  return { cookie, crumb };
}

/**
 * Fetches actual stock fundamental metrics (key statistics, financial data, earnings) from Yahoo Finance.
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Fundamental metrics object
 */
async function fetchFundamentalData(symbol) {
  logger.info('FETCH_YAHOO', `Fetching fundamental data for: ${symbol}`);
  try {
    const { cookie, crumb } = await getSession();
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=financialData,defaultKeyStatistics,earnings&crumb=${crumb}`;
    
    logger.info('FETCH_YAHOO', `Sending fundamental request to: ${url}`);
    const response = await fetchWithRetry(url, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        logger.warn('FETCH_YAHOO', `quoteSummary API returned 401 for ${symbol}. Retrying with fresh session...`);
        cachedCookie = null;
        cachedCrumb = null;
        // Retry once after clearing cache
        const retrySession = await getSession();
        const retryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=financialData,defaultKeyStatistics,earnings&crumb=${retrySession.crumb}`;
        
        logger.info('FETCH_YAHOO', `Retrying fundamental request at: ${retryUrl}`);
        const retryResponse = await fetchWithRetry(retryUrl, {
          headers: {
            'Cookie': retrySession.cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (!retryResponse.ok) {
          logger.error('FETCH_YAHOO', `Yahoo Finance quoteSummary API retry failed for ${symbol} with status ${retryResponse.status}`);
          throw new Error(`Yahoo Finance quoteSummary API retry error: ${retryResponse.status}`);
        }
        const parsed = processSummaryResponse(await retryResponse.json(), symbol);
        logger.info('FETCH_YAHOO', `Successfully fetched and parsed fundamental data for ${symbol} (after 401 retry)`, parsed);
        return parsed;
      }
      logger.error('FETCH_YAHOO', `Yahoo Finance quoteSummary API error for ${symbol}: ${response.status}`);
      throw new Error(`Yahoo Finance quoteSummary API error: ${response.status}`);
    }

    const parsed = processSummaryResponse(await response.json(), symbol);
    logger.info('FETCH_YAHOO', `Successfully fetched and parsed fundamental data for ${symbol}`, parsed);
    return parsed;
  } catch (err) {
    logger.error('FETCH_YAHOO', `Failed to fetch fundamental data for ${symbol}`, err);
    throw new Error(`Failed to fetch fundamental data for ${symbol}: ${err.message}`);
  }
}

function processSummaryResponse(data, symbol) {
  if (!data.quoteSummary || !data.quoteSummary.result || data.quoteSummary.result.length === 0) {
    throw new Error(`No fundamental data found for symbol: ${symbol}`);
  }

  const result = data.quoteSummary.result[0];
  const financialData = result.financialData || {};
  const defaultKeyStats = result.defaultKeyStatistics || {};
  const earnings = result.earnings || {};

  // Extract EPS (Earnings Per Share)
  const eps = defaultKeyStats.trailingEps?.raw ?? defaultKeyStats.forwardEps?.raw ?? 0;
  
  // Extract debtToEquity
  const debtRatio = (financialData.debtToEquity?.raw ?? 0) / 100;

  // Extract revenueGrowth
  const revenueGrowth = financialData.revenueGrowth?.raw ?? 0;

  // Extract cash flows
  const operatingCashFlow = financialData.operatingCashflow?.raw ?? 0;
  const freeCashFlow = financialData.freeCashflow?.raw ?? 0;
  const capitalExpenditures = operatingCashFlow - freeCashFlow;

  // Extract historical EPS trend from earnings financialsChart
  let historicalEps = [];
  const yearlyChart = earnings.financialsChart?.yearly || [];
  if (yearlyChart.length > 0 && eps !== 0) {
    if (yearlyChart.length >= 3) {
      const netIncome2 = yearlyChart[yearlyChart.length - 1].earnings?.raw ?? 1;
      const netIncome1 = yearlyChart[yearlyChart.length - 2].earnings?.raw ?? 1;
      const netIncome0 = yearlyChart[yearlyChart.length - 3].earnings?.raw ?? 1;
      
      const ratio1 = netIncome2 !== 0 ? netIncome1 / netIncome2 : 1;
      const ratio0 = netIncome2 !== 0 ? netIncome0 / netIncome2 : 1;
      
      historicalEps = [
        Math.round((eps * ratio0) * 100) / 100,
        Math.round((eps * ratio1) * 100) / 100,
        eps
      ];
    }
  }
  
  // Fallback if empty or zero
  if (historicalEps.length === 0) {
    historicalEps = [
      Math.round((eps * 0.85) * 100) / 100,
      Math.round((eps * 0.93) * 100) / 100,
      eps
    ];
  }

  return {
    eps,
    debtRatio,
    revenueGrowth,
    operatingCashFlow,
    capitalExpenditures,
    historicalEps
  };
}

export {fetchStockData, fetchHistoricalData, fetchFundamentalData};


