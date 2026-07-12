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

module.exports = { fetchStockData, fetchHistoricalData };
