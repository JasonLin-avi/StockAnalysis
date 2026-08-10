/**
 * 台股股票代碼與名稱對照服務 (Taiwan Stock Map Service)
 * 
 * Why this service is created:
 * - Provides efficient lookup (O(1)) for TWSE (上市) and TPEx (上櫃) stock symbols and names.
 * - Caches fetching results in-memory to prevent repeated network overhead.
 * - Supports custom OpenAPI endpoints or fallback data fetchers for robust operation.
 */
import { connectToDatabase } from '../external/database/connection.js';
import { getCompanyNameFromDB, getCodeFromDB, batchUpsertStocks } from '../external/database/queries.js';

// 官方及開放資料 API 端點
const DEFAULT_TWSE_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL';
const DEFAULT_TPEX_URL = 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O';

let stockCacheMap = new Map();
let isInitialized = false;

/**
 * 清除快取與重設初始化狀態 (供測試與重新載入使用)
 */
export function resetStockMap() {
  stockCacheMap.clear();
  isInitialized = false;
}

/**
 * 取得當前快取中的股票總數
 * @returns {number}
 */
export function getStockCount() {
  return stockCacheMap.size;
}

/**
 * 解析純數字股票代碼與市場資訊
 * 
 * Why:
 * 台股市場常用代碼如 '2330.TW' (上市) 與 '8454.TWO' (上櫃)。
 * 解析與剝離後綴可以規範化查詢代碼，並從後綴推斷市場類別。
 * 
 * @param {string|number} rawCode - 如 '2330', '2330.TW', '8454.TWO'
 * @returns {{ code: string, inferredMarket: string|null }}
 */
export function parseStockCode(rawCode) {
  if (rawCode === null || rawCode === undefined) {
    return { code: '', inferredMarket: null };
  }

  const str = String(rawCode).trim().toUpperCase();
  if (!str) {
    return { code: '', inferredMarket: null };
  }

  let inferredMarket = null;
  if (str.endsWith('.TW')) {
    inferredMarket = '上市';
  } else if (str.endsWith('.TWO')) {
    inferredMarket = '上櫃';
  }

  const code = str.replace(/\.(TW|TWO)$/i, '');

  return { code, inferredMarket };
}

/**
 * 將記憶體 / 抓取到的對照表同步持久化至 DB
 * 
 * Why:
 * 批次將快取對照寫入 SQLite，減少未來的網路請求與處理時間。
 * 
 * @param {Object} dbInstance - SQLite 數據庫實例
 * @param {Map<string, {name: string, market: string}>} stocksMap - 股票快取 Map
 */
export async function syncStockMapToDB(dbInstance, stocksMap) {
  if (!stocksMap || stocksMap.size === 0) return;

  const stocksList = [];
  stocksMap.forEach((info, code) => {
    stocksList.push({
      symbol: code,
      name: info.name,
      market: info.market
    });
  });

  await batchUpsertStocks(dbInstance, stocksList);
}

/**
 * 初始化股票代碼對照表
 * @param {Object} [options]
 * @param {Function} [options.fetcher] - 自訂網路請求函式 (預設為 fetch)
 * @param {string} [options.twseUrl] - 上市股票 API 端點
 * @param {string} [options.tpexUrl] - 上櫃股票 API 端點
 * @param {boolean} [options.force] - 是否強制重新初始化
 */
export async function initializeStockMap(options = {}) {
  const {
    fetcher = globalThis.fetch,
    twseUrl = DEFAULT_TWSE_URL,
    tpexUrl = DEFAULT_TPEX_URL,
    force = false
  } = options;

  if (isInitialized && !force) return;

  try {
    const [twseRes, tpexRes] = await Promise.allSettled([
      fetcher(twseUrl).then(res => (typeof res.json === 'function' ? res.json() : res)),
      fetcher(tpexUrl).then(res => (typeof res.json === 'function' ? res.json() : res))
    ]);

    stockCacheMap.clear();

    // 1. 解析上市股票 (TWSE)
    if (twseRes.status === 'fulfilled' && Array.isArray(twseRes.value)) {
      twseRes.value.forEach(item => {
        const code = item.Code || item.code || item.SecuritiesCompanyCode;
        const name = item.Name || item.name || item.CompanyName;
        if (code && name) {
          stockCacheMap.set(String(code).trim(), {
            name: String(name).trim(),
            market: '上市'
          });
        }
      });
    }

    // 2. 解析上櫃股票 (TPEx)
    if (tpexRes.status === 'fulfilled' && Array.isArray(tpexRes.value)) {
      tpexRes.value.forEach(item => {
        const code = item.SecuritiesCompanyCode || item.Code || item.code;
        const name = item.CompanyName || item.Name || item.name;
        if (code && name) {
          stockCacheMap.set(String(code).trim(), {
            name: String(name).trim(),
            market: '上櫃'
          });
        }
      });
    }

    isInitialized = true;
  } catch (error) {
    console.error('初始化股票資料失敗:', error.message || error);
    throw error;
  }
}

/**
 * 透過股票代碼查詢股票資訊 (僅記憶體查詢)
 * @param {string|number} code - 股票代碼 (例如: '2330' 或 2330)
 * @param {Object} [options] - 傳遞給 initializeStockMap 的選項
 * @returns {Promise<{success: boolean, code?: string, name?: string, market?: string, message?: string}>}
 */
export async function queryStockByCode(code, options = {}) {
  await initializeStockMap(options);

  if (code === null || code === undefined) {
    return {
      success: false,
      message: '無效的股票代碼'
    };
  }

  const searchCode = String(code).trim();
  const stockInfo = stockCacheMap.get(searchCode);

  if (stockInfo) {
    return {
      success: true,
      code: searchCode,
      name: stockInfo.name,
      market: stockInfo.market
    };
  } else {
    return {
      success: false,
      message: `找不到代碼為 ${searchCode} 的股票，請確認代碼是否正確或是否已下市。`
    };
  }
}

/**
 * 依據個股代碼取得公司名稱與詳細資訊（優先讀取 DB，若缺資料自動進行全量同步）
 * Read-through cache 模式: DB -> API -> 檢查 fetched Map -> DB 批次 Upsert -> 回傳結果
 * 
 * Why:
 * - 避免每次查詢都發起 OpenAPI 請求。
 * - 若網路 API 抓取後發現該號碼根本不存在，立即回傳失敗，防範無窮迴圈重試與無謂寫入 DB。
 * 
 * @param {string|number} code - 股票代碼 (例如: '2330', '2330.TW')
 * @param {Object} [options]
 * @param {Object} [options.db] - 數據庫連線實例
 * @param {Function} [options.fetcher] - 自訂 API fetcher
 * @param {boolean} [options.forceSync] - 是否強制重新同步
 * @returns {Promise<{success: boolean, code?: string, rawSymbol?: string, name?: string, market?: string, message?: string}>}
 */
export async function getCompanyNameByCode(code, options = {}) {
  const { code: searchCode, inferredMarket } = parseStockCode(code);

  if (!searchCode) {
    return {
      success: false,
      message: '無效的股票代碼'
    };
  }

  const db = options.db || (await connectToDatabase());

  // 1. 優先從 DB 讀取
  if (!options.forceSync) {
    const cached = await getCompanyNameFromDB(db, searchCode);
    if (cached && cached.name) {
      return {
        success: true,
        code: cached.symbol,
        rawSymbol: String(code),
        name: cached.name,
        market: cached.market || inferredMarket || '上市'
      };
    }
  }

  // 2. DB Miss 時發起全量初始化 API
  await initializeStockMap(options);

  // 3. 關鍵: 檢查抓取到的對照表是否包含該股票代碼，避免無效代碼陷入無窮迴圈與無謂寫入 DB
  const fetchedInfo = stockCacheMap.get(searchCode);
  if (!fetchedInfo) {
    return {
      success: false,
      message: `找不到代碼為 ${searchCode} 的股票，請確認代碼是否正確或是否已下市。`
    };
  }

  // 存在時寫入 DB 做同步
  await syncStockMapToDB(db, stockCacheMap);

  // 4. 再次自 DB 讀取
  const updated = await getCompanyNameFromDB(db, searchCode);
  if (updated && updated.name) {
    return {
      success: true,
      code: updated.symbol,
      rawSymbol: String(code),
      name: updated.name,
      market: updated.market || inferredMarket || '上市'
    };
  }

  // 備用快取回傳
  return {
    success: true,
    code: searchCode,
    rawSymbol: String(code),
    name: fetchedInfo.name,
    market: fetchedInfo.market
  };
}

/**
 * 依據公司名稱取得股票代碼 (支援反向查詢與帶有 .TW / .TWO 的完整 Symbol)
 * 
 * Why:
 * 允許使用者輸入中文公司名稱（如 "台積電" 或 "富邦媒"）直接查詢相對應的代碼與完整 Symbol。
 * 
 * @param {string} name - 公司名稱 (例如: '台積電')
 * @param {Object} [options]
 * @param {Object} [options.db] - 數據庫連線實例
 * @param {Function} [options.fetcher] - 自訂 API fetcher
 * @param {boolean} [options.forceSync] - 是否強制重新同步
 * @returns {Promise<{success: boolean, code?: string, symbolWithSuffix?: string, name?: string, market?: string, message?: string}>}
 */
export async function getCodeByCompanyName(name, options = {}) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return {
      success: false,
      message: '無效的公司名稱'
    };
  }

  const searchName = name.trim();
  const db = options.db || (await connectToDatabase());

  // 1. 優先自 DB 查詢
  if (!options.forceSync) {
    const cached = await getCodeFromDB(db, searchName);
    if (cached && cached.symbol) {
      const suffix = cached.market === '上櫃' ? '.TWO' : '.TW';
      return {
        success: true,
        code: cached.symbol,
        symbolWithSuffix: `${cached.symbol}${suffix}`,
        name: cached.name,
        market: cached.market
      };
    }
  }

  // 2. DB Miss 時發起 API 初始化
  await initializeStockMap(options);

  // 檢查記憶體中是否存在此公司名稱
  let foundCode = null;
  let foundInfo = null;
  for (const [c, info] of stockCacheMap.entries()) {
    if (info.name === searchName) {
      foundCode = c;
      foundInfo = info;
      break;
    }
  }

  if (!foundCode) {
    return {
      success: false,
      message: `找不到名稱為 ${searchName} 的台股代碼`
    };
  }

  // 存在時同步寫入 DB
  await syncStockMapToDB(db, stockCacheMap);

  // 3. 再次自 DB 查詢
  const updated = await getCodeFromDB(db, searchName);
  if (updated && updated.symbol) {
    const suffix = updated.market === '上櫃' ? '.TWO' : '.TW';
    return {
      success: true,
      code: updated.symbol,
      symbolWithSuffix: `${updated.symbol}${suffix}`,
      name: updated.name,
      market: updated.market
    };
  }

  const suffix = foundInfo.market === '上櫃' ? '.TWO' : '.TW';
  return {
    success: true,
    code: foundCode,
    symbolWithSuffix: `${foundCode}${suffix}`,
    name: foundInfo.name,
    market: foundInfo.market
  };
}

/**
 * 格式化股票名稱與代碼標籤 (Format Stock Name with Symbol)
 * 
 * Why:
 * 當股票名稱存在且不同於代碼時，格式化顯示為 "公司名稱 (代碼)" (例如 "台積電 (2330.TW)")；
 * 否則僅顯示代碼本身 (例如 "AAPL")。
 * 
 * @param {string} [name] - 公司名稱
 * @param {string} symbol - 股票代碼
 * @returns {string} 格式化後的顯示字串
 */
export function formatStockName(name, symbol) {
  if (!symbol) return name || '';
  if (name && name !== symbol) {
    return `${name} (${symbol})`;
  }
  return symbol;
}

