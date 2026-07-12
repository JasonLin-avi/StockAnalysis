const GOOGLE_BASE = 'https://finance.google.com/finance';

/**
 * Fetches current stock data from Google Finance.
 * @param {string} symbol - Stock symbol (e.g. 'AAPL')
 * @returns {Promise<Object>} Standardized stock data
 */
async function fetchStockData(symbol) {
  const url = `${GOOGLE_BASE}/info?client=ig&q=${encodeURIComponent(symbol)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Google Finance API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  // Google Finance returns JSON with a "// " prefix to prevent XSS
  const jsonStr = text.replace(/^\/\/\s*/, '');
  let quotes;
  try {
    quotes = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse Google Finance response for ${symbol}`);
  }

  if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }

  const q = quotes[0];
  const price = parseFloat(q.l) || parseFloat(q.l_fix) || 0;
  const change = parseFloat(q.c) || parseFloat(q.c_fix) || 0;
  const changePercent = parseFloat(q.cp) || parseFloat(q.cp_fix) || 0;
  const previousClose = parseFloat(q.pcls_fix);

  return {
    symbol,
    price,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    volume: parseInt(q.vo, 10) || 0,
    high: parseFloat(q.hi) || price,
    low: parseFloat(q.lo) || price,
    open: parseFloat(q.op) || price,
    previousClose: isNaN(previousClose) ? price - change : previousClose,
    timestamp: Date.now()
  };
}

/**
 * Fetches historical data from Google Finance.
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time range: '1d', '1mo', '3mo', '6mo', '1y', '5y'
 * @returns {Promise<Object>} Standardized historical data
 */
async function fetchHistoricalData(symbol, period = '1mo') {
  // Google Finance historical: use getprices endpoint
  // Parameters: q=symbol, i=interval(seconds), p=period, f=fields
  const interval = '86400'; // daily
  const url = `${GOOGLE_BASE}/getprices?q=${encodeURIComponent(symbol)}&i=${interval}&p=${period}&f=d,o,h,l,c,v`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Google Finance API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const lines = text.split('\n');
  const data = [];
  let baseTimestamp = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('TIMEZONE_OFFSET=') || trimmed.startsWith('COLUMNS=') || trimmed.startsWith('DATA=')) {
      continue;
    }

    if (trimmed.startsWith('a')) {
      // Line with absolute timestamp: aTIMESTAMP,OPEN,HIGH,LOW,CLOSE,VOLUME
      const parts = trimmed.split(',');
      if (parts.length >= 6) {
        baseTimestamp = parseInt(parts[0].substring(1), 10);
        if (!isNaN(baseTimestamp)) {
          data.push({
            date: new Date(baseTimestamp * 1000).toISOString().split('T')[0],
            open: parseFloat(parts[1]),
            high: parseFloat(parts[2]),
            low: parseFloat(parts[3]),
            close: parseFloat(parts[4]),
            volume: parseInt(parts[5], 10)
          });
        }
      }
    } else if (baseTimestamp > 0 && trimmed.includes(',')) {
      // Relative offset line: OFFSET,OPEN,HIGH,LOW,CLOSE,VOLUME
      const parts = trimmed.split(',');
      if (parts.length >= 6) {
        const offset = parseInt(parts[0], 10);
        if (!isNaN(offset)) {
          const timestamp = baseTimestamp + offset * 86400;
          data.push({
            date: new Date(timestamp * 1000).toISOString().split('T')[0],
            open: parseFloat(parts[1]),
            high: parseFloat(parts[2]),
            low: parseFloat(parts[3]),
            close: parseFloat(parts[4]),
            volume: parseInt(parts[5], 10)
          });
        }
      }
    }
  }

  if (data.length === 0) {
    throw new Error(`No historical data found for symbol: ${symbol} from Google Finance`);
  }

  return {
    symbol,
    period,
    data
  };
}

module.exports = { fetchStockData, fetchHistoricalData };
