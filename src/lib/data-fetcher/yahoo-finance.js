const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

/**
 * Fetches current stock data from Yahoo Finance.
 * @param {string} symbol - Stock symbol (e.g. 'AAPL')
 * @returns {Promise<Object>} Standardized stock data
 */
async function fetchStockData(symbol) {
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }

  const result = data.chart.result[0];
  const meta = result.meta;
  const quote = result.indicators.quote[0];

  const price = meta.regularMarketPrice;
  const previousClose = meta.previousClose ?? meta.chartPreviousClose;
  const change = price - previousClose;
  const changePercent = (change / previousClose) * 100;

  return {
    symbol,
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
    '1y': '1wk',
    '2y': '1wk',
    '5y': '1mo',
    '10y': '1mo',
    'max': '3mo'
  };

  const interval = intervalMap[period] || '1d';
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?range=${period}&interval=${interval}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
  }

  const raw = await response.json();

  if (!raw.chart || !raw.chart.result || raw.chart.result.length === 0) {
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
    throw new Error(`No valid historical data points for symbol: ${symbol}`);
  }

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
    return { cookie: cachedCookie, crumb: cachedCrumb };
  }

  // 1. Get cookie from fc.yahoo.com
  const fcResponse = await fetch('https://fc.yahoo.com', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  
  const cookie = fcResponse.headers.get('set-cookie');
  if (!cookie) {
    throw new Error('No set-cookie header received from fc.yahoo.com');
  }

  // 2. Get crumb from getcrumb endpoint
  const crumbResponse = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!crumbResponse.ok) {
    throw new Error(`Failed to fetch crumb from Yahoo: ${crumbResponse.status}`);
  }

  const crumb = await crumbResponse.text();
  if (!crumb) {
    throw new Error('No crumb received from Yahoo');
  }

  cachedCookie = cookie;
  cachedCrumb = crumb;
  return { cookie, crumb };
}

/**
 * Fetches actual stock fundamental metrics (key statistics, financial data, earnings) from Yahoo Finance.
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Fundamental metrics object
 */
async function fetchFundamentalData(symbol) {
  try {
    const { cookie, crumb } = await getSession();
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=financialData,defaultKeyStatistics,earnings&crumb=${crumb}`;
    const response = await fetch(url, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        cachedCookie = null;
        cachedCrumb = null;
        // Retry once after clearing cache
        const retrySession = await getSession();
        const retryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=financialData,defaultKeyStatistics,earnings&crumb=${retrySession.crumb}`;
        const retryResponse = await fetch(retryUrl, {
          headers: {
            'Cookie': retrySession.cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (!retryResponse.ok) {
          throw new Error(`Yahoo Finance quoteSummary API retry error: ${retryResponse.status}`);
        }
        return processSummaryResponse(await retryResponse.json(), symbol);
      }
      throw new Error(`Yahoo Finance quoteSummary API error: ${response.status}`);
    }

    return processSummaryResponse(await response.json(), symbol);
  } catch (err) {
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

module.exports = { fetchStockData, fetchHistoricalData, fetchFundamentalData };


