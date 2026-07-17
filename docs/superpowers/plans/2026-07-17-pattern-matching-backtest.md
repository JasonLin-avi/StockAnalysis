# 歷史相似環境回測引擎實作計畫 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作以歐氏距離技術指標相似度為核心的歷史相似日回測引擎，並搭配本地 stock_data 的增量同步補救與快取，提供前端可自訂配置的可視化勝率及相似日明細卡片。

**Architecture:** 
1. 資料庫端：在 `analysis_results` 表中動態增加 `backtest` 欄位，並於資料庫連線初始化時自動進行 Schema migration。
2. 數據同步端：在 `data-fetcher` 與資料庫查詢中新增增量更新邏輯，比對本地最高日期與今日，有缺漏才發起增量網路 API 請求並寫入資料庫，隨後唯讀本地庫存數據進行分析。
3. 計算引擎端：在 Node.js 中計算 3 年日 K 線的 RSI, MACD, MA，做向量歸一化與歐氏距離計算，並統計隨後 5/10/20 天上漲機率與平均回報。
4. 前端端點與 UI：新增 `HistoricalBacktestPanel.js` 展現數據，並整合至版面自訂控制 (Customizable Layout)。

**Tech Stack:** Next.js, React, SQLite3, Jest, Tailwind CSS

## Global Constraints

* 程式碼必須符合 Google Engineering Standards。註釋需說明 "Why" 而非 "What"。
* 嚴禁使用 `eval()`。
* 保持現有代碼的 documentation integrity，不得無故刪除無關的註釋或 docstring。

---

### Task 1: 資料表結構擴充與自動 Migration

**Files:**
- Modify: `src/lib/database/schema.js`
- Modify: `src/lib/database/connection.js`
- Test: `tests/unit/database-migration.test.js` (新建)

**Interfaces:**
- Consumes: `connectToDatabase` 方法自 `src/lib/database/connection.js`
- Produces: 升級後的 SQLite 資料庫連線，`analysis_results` 表保證擁有 `backtest` TEXT 欄位。

- [ ] **Step 1: 撰寫測試驗證 `backtest` 欄位存在與動態升級功能**

建立測試 `tests/unit/database-migration.test.js`：
```javascript
const { connectToDatabase } = require('../../src/lib/database/connection');
const sqlite3 = require('sqlite3');

describe('Database Migration Tests', () => {
  let db;
  beforeEach(async () => {
    // 建立一個在記憶體中的乾淨資料庫以進行隔離測試
    db = await connectToDatabase(':memory:');
  });

  afterEach((done) => {
    db.close(done);
  });

  test('analysis_results table should contain backtest column', (done) => {
    db.all("PRAGMA table_info(analysis_results);", (err, columns) => {
      expect(err).toBeNull();
      const hasBacktest = columns.some(col => col.name === 'backtest');
      expect(hasBacktest).toBe(true);
      done();
    });
  });
});
```

- [ ] **Step 2: 執行測試並確認其失敗**

執行：`npx jest tests/unit/database-migration.test.js`
預期輸出：`FAIL`，因為 schema 中尚無 `backtest` 欄位。

- [ ] **Step 3: 於 Schema 及 Connection 中實作 backtest 欄位與自動 ALTER TABLE**

修改 `src/lib/database/schema.js` 的 `schema` 字串（在第 44 行之後補上 `backtest TEXT,`）：
```javascript
  CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,
    date DATE NOT NULL,
    technical TEXT,   -- Serialized JSON containing technical indicators
    fundamental TEXT, -- Serialized JSON containing fundamental ratios
    news TEXT,        -- Serialized JSON containing media sentiment
    advice TEXT,      -- Serialized JSON containing portfolio & action advice
    backtest TEXT,    -- Serialized JSON containing pattern matching backtest results
    UNIQUE(stock_id, date),
    FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
  );
```

修改 `src/lib/database/connection.js` 的 `connectToDatabase` 方法，在第 49-56 行處更新為：
```javascript
          // Apply schema DDL script.
          db.exec(schema, (execErr) => {
            if (execErr) {
              return reject(new Error(`Failed to apply schema DDL: ${execErr.message}`));
            }
            
            // Why: Run dynamic schema check to add 'backtest' column if it does not exist in an already created physical database file.
            db.all("PRAGMA table_info(analysis_results);", (infoErr, columns) => {
              if (infoErr) {
                return reject(new Error(`Failed to read table info: ${infoErr.message}`));
              }
              const hasBacktest = columns.some(col => col.name === 'backtest');
              if (!hasBacktest) {
                db.run("ALTER TABLE analysis_results ADD COLUMN backtest TEXT;", (alterErr) => {
                  if (alterErr) {
                    return reject(new Error(`Failed to alter table: ${alterErr.message}`));
                  }
                  resolve(db);
                });
              } else {
                resolve(db);
              }
            });
          });
```

- [ ] **Step 4: 執行測試並確認通過**

執行：`npx jest tests/unit/database-migration.test.js`
預期輸出：`PASS`

- [ ] **Step 5: 提交變更**

```bash
git add src/lib/database/schema.js src/lib/database/connection.js tests/unit/database-migration.test.js
git commit -m "feat(db): add backtest column to analysis_results with auto migration"
```

---

### Task 2: 歷史價格增量同步數據服務實作

**Files:**
- Modify: `src/lib/database/queries.js`
- Modify: `src/lib/data-fetcher/index.js`
- Test: `tests/unit/incremental-sync.test.js` (新建)

**Interfaces:**
- Consumes: Yahoo/Google fetcher from `src/lib/data-fetcher`
- Produces:
  * `syncStockPricesIncremental(db, stockId, symbol)` - 增量同步外部股價寫入 DB。
  * `getLocal3YearPrices(db, stockId)` - 唯讀本地庫存股價。

- [ ] **Step 1: 撰寫增量同步服務測試**

建立 `tests/unit/incremental-sync.test.js`：
```javascript
const { syncStockPricesIncremental, getLocal3YearPrices } = require('../../src/lib/data-fetcher');
const { connectToDatabase } = require('../../src/lib/database/connection');

describe('Incremental Price Sync Tests', () => {
  let db;
  beforeEach(async () => {
    db = await connectToDatabase(':memory:');
    // 預先寫入一檔股票
    await new Promise((resolve) => {
      db.run("INSERT INTO stocks (symbol, market) VALUES ('AAPL', 'US');", resolve);
    });
  });

  afterEach((done) => {
    db.close(done);
  });

  test('should sync data incrementally and fetch from local database', async () => {
    // 測試同步程序
    const success = await syncStockPricesIncremental(db, 1, 'AAPL');
    expect(success).toBe(true);

    const prices = await getLocal3YearPrices(db, 1);
    expect(prices.length).toBeGreaterThan(0);
    expect(prices[0]).toHaveProperty('close');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

執行：`npx jest tests/unit/incremental-sync.test.js`
預期輸出：`FAIL` (方法未定義)

- [ ] **Step 3: 實作增量同步與本地讀取方法**

修改 `src/lib/database/queries.js`，在尾部加入：
```javascript
/**
 * Retrieves the maximum date of price data stored in database.
 * @param {sqlite3.Database} db 
 * @param {number} stockId 
 * @returns {Promise<string|null>} YYYY-MM-DD date string or null
 */
function getMaxPriceDate(db, stockId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT max(date) as maxDate FROM stock_data WHERE stock_id = ?;", [stockId], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.maxDate : null);
    });
  });
}

/**
 * Batch inserts stock data entries.
 * @param {sqlite3.Database} db 
 * @param {number} stockId 
 * @param {Array} prices 
 * @returns {Promise<void>}
 */
function insertStockDataBatch(db, stockId, prices) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION;");
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO stock_data (stock_id, date, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `);
      
      for (const p of prices) {
        stmt.run([stockId, p.date, p.open, p.high, p.low, p.close, p.volume]);
      }
      
      stmt.finalize((err) => {
        if (err) {
          db.run("ROLLBACK;");
          return reject(err);
        }
        db.run("COMMIT;", (commitErr) => {
          if (commitErr) return reject(commitErr);
          resolve();
        });
      });
    });
  });
}

/**
 * Retrieves 3 years of local historical prices.
 * @param {sqlite3.Database} db 
 * @param {number} stockId 
 * @returns {Promise<Array>}
 */
function getHistoricalPricesFromDB(db, stockId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT date, open, high, low, close, volume 
      FROM stock_data 
      WHERE stock_id = ? 
      ORDER BY date ASC;
    `, [stockId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  // 保持原有 export，並加上：
  getMaxPriceDate,
  insertStockDataBatch,
  getHistoricalPricesFromDB,
  // ... 其他
};
```

修改 `src/lib/data-fetcher/index.js`，在結尾實作並匯出 `syncStockPricesIncremental` 與 `getLocal3YearPrices`。
因為我們在生產環境中使用 Yahoo / Google，當要抓取增量或是 3 年歷史資料時，可以直接呼叫 `yahoo-finance.js` 中現有的 `fetchHistoricalData` 方法。

在 `src/lib/data-fetcher/index.js` 中：
```javascript
const { getMaxPriceDate, insertStockDataBatch, getHistoricalPricesFromDB } = require('../database/queries');
const { fetchHistoricalData } = require('./yahoo-finance');

/**
 * Incrementally syncs prices from Yahoo/Google Finance to SQLite local db.
 * @param {sqlite3.Database} db 
 * @param {number} stockId 
 * @param {string} symbol 
 * @returns {Promise<boolean>}
 */
async function syncStockPricesIncremental(db, stockId, symbol) {
  try {
    const maxDateStr = await getMaxPriceDate(db, stockId);
    let historicalData = [];

    if (!maxDateStr) {
      // Why: First time query, pull 3 years of historical data to build pattern sample library.
      historicalData = await fetchHistoricalData(symbol, '3y');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const maxDate = new Date(maxDateStr);
      const now = new Date(today);
      const diffDays = Math.ceil((now - maxDate) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        // Why: Only fetch incremental data if there are missing days.
        // Yahoo allows fetching 1mo or 3mo period, which is small and fast.
        const rawData = await fetchHistoricalData(symbol, '1mo');
        // Filter out dates we already have
        historicalData = rawData.filter(d => d.date > maxDateStr);
      }
    }

    if (historicalData.length > 0) {
      await insertStockDataBatch(db, stockId, historicalData);
    }
    return true;
  } catch (error) {
    console.error(`[SYNC] Failed to sync ${symbol}:`, error);
    return false;
  }
}

/**
 * Fetches local persistent 3-year prices for analysis.
 * @param {sqlite3.Database} db 
 * @param {number} stockId 
 * @returns {Promise<Array>}
 */
async function getLocal3YearPrices(db, stockId) {
  return await getHistoricalPricesFromDB(db, stockId);
}

module.exports = {
  // 原有匯出，加上：
  syncStockPricesIncremental,
  getLocal3YearPrices
};
```

- [ ] **Step 4: 執行測試並確認通過**

執行：`npx jest tests/unit/incremental-sync.test.js`
預期輸出：`PASS`

- [ ] **Step 5: 提交變更**

```bash
git add src/lib/database/queries.js src/lib/data-fetcher/index.js tests/unit/incremental-sync.test.js
git commit -m "feat(data-fetcher): implement incremental price sync and DB fallback"
```

---

### Task 3: 歐氏距離回測引擎實作與單元測試

**Files:**
- Create: `src/lib/technical-analysis/backtest.js`
- Test: `tests/unit/backtest-engine.test.js` (新建)

**Interfaces:**
- Produces: `calculateBacktest(prices)` - 計算當前指標特徵在 3 年歷史中的歐式距離匹配與勝率統計。

- [ ] **Step 1: 撰寫回測引擎數學計算測試**

建立 `tests/unit/backtest-engine.test.js`：
```javascript
const { calculateBacktest } = require('../../src/lib/technical-analysis/backtest');

describe('Backtest Engine Mathematical Verification', () => {
  test('should return correct win rates and similarity rankings', () => {
    // 建立模擬的 100 天價格序列，每天微幅上漲
    const prices = Array.from({ length: 100 }, (_, i) => ({
      date: new Date(2023, 0, i + 1).toISOString().slice(0, 10),
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100.5 + i,
      volume: 100000
    }));

    const result = calculateBacktest(prices);
    expect(result).toHaveProperty('winRate5d');
    expect(result).toHaveProperty('winRate10d');
    expect(result.similarDays.length).toBeGreaterThan(0);
    expect(result.similarDays[0]).toHaveProperty('similarity');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

執行：`npx jest tests/unit/backtest-engine.test.js`
預期輸出：`FAIL` (module not found)

- [ ] **Step 3: 實作 K 線技術指標與特徵歐氏距離匹配演算法**

建立 `src/lib/technical-analysis/backtest.js`：
```javascript
/**
 * Backtest Engine for Pattern Matching using Euclidean Distance
 * @module technical-analysis/backtest
 */

// Helper to compute Simple Moving Average
function computeSMA(prices, period) {
  const sma = new Array(prices.length).fill(null);
  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    sum += prices[i].close;
    if (i >= period - 1) {
      if (i >= period) {
        sum -= prices[i - period].close;
      }
      sma[i] = sum / period;
    }
  }
  return sma;
}

// Helper to compute RSI
function computeRSI(prices, period = 14) {
  const rsi = new Array(prices.length).fill(null);
  if (prices.length < period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i].close - prices[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i].close - prices[i - 1].close;
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

// Helper to compute MACD
function computeMACD(prices) {
  const macdHist = new Array(prices.length).fill(null);
  if (prices.length < 26) return macdHist;

  // Simple implementation of EMA
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    const result = new Array(data.length).fill(null);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i].close;
    result[period - 1] = sum / period;

    for (let i = period; i < data.length; i++) {
      result[i] = data[i].close * k + result[i - 1] * (1 - k);
    }
    return result;
  };

  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  
  const macdLine = new Array(prices.length).fill(null);
  for (let i = 25; i < prices.length; i++) {
    macdLine[i] = ema12[i] - ema26[i];
  }

  // Signal line (9 EMA of MACD Line)
  const signal = new Array(prices.length).fill(null);
  const k9 = 2 / (9 + 1);
  let sumMacd = 0;
  for (let i = 25; i < 25 + 9; i++) sumMacd += macdLine[i];
  signal[33] = sumMacd / 9;

  for (let i = 34; i < prices.length; i++) {
    signal[i] = macdLine[i] * k9 + signal[i - 1] * (1 - k9);
  }

  for (let i = 33; i < prices.length; i++) {
    macdHist[i] = macdLine[i] - signal[i];
  }
  return macdHist;
}

/**
 * Calculates historical pattern match based on Euclidean Distance
 * @param {Array} prices - Chronological array of price ticks
 * @returns {Object} Backtest metrics and Top similar dates
 */
function calculateBacktest(prices) {
  if (prices.length < 50) {
    return { winRate5d: 0.5, winRate10d: 0.5, winRate20d: 0.5, avgReturn5d: 0, avgReturn10d: 0, avgReturn20d: 0, similarDays: [] };
  }

  const rsi = computeRSI(prices, 14);
  const ma20 = computeSMA(prices, 20);
  const macdHist = computeMACD(prices);

  // Normalize features
  const features = prices.map((p, idx) => {
    if (rsi[idx] === null || ma20[idx] === null || macdHist[idx] === null) return null;
    return {
      date: p.date,
      close: p.close,
      rsi: rsi[idx] / 100, // Range [0, 1]
      maBias: (p.close / ma20[idx]) - 1, // Deviation %
      macdRatio: macdHist[idx] / p.close // Scaleless MACD
    };
  });

  const nowIdx = features.length - 1;
  const vNow = features[nowIdx];

  if (!vNow) {
    return { winRate5d: 0.5, winRate10d: 0.5, winRate20d: 0.5, avgReturn5d: 0, avgReturn10d: 0, avgReturn20d: 0, similarDays: [] };
  }

  // Calculate distances for historical days (exclude last 20 days to avoid lookahead prediction overlap)
  const distances = [];
  for (let i = 33; i < nowIdx - 20; i++) {
    const vHist = features[i];
    if (!vHist) continue;

    const dist = Math.sqrt(
      Math.pow(vHist.rsi - vNow.rsi, 2) +
      Math.pow(vHist.maBias - vNow.maBias, 2) +
      Math.pow(vHist.macdRatio - vNow.macdRatio, 2)
    );

    distances.push({
      idx: i,
      date: vHist.date,
      distance: dist,
      similarity: parseFloat((Math.max(0, 1 - dist) * 100).toFixed(1))
    });
  }

  // Sort by Euclidean distance (ascending) and take Top 20
  distances.sort((a, b) => a.distance - b.distance);
  const top20 = distances.slice(0, 20);

  if (top20.length === 0) {
    return { winRate5d: 0.5, winRate10d: 0.5, winRate20d: 0.5, avgReturn5d: 0, avgReturn10d: 0, avgReturn20d: 0, similarDays: [] };
  }

  // Calculate forward returns and win rates
  let up5d = 0, up10d = 0, up20d = 0;
  let sumRet5d = 0, sumRet10d = 0, sumRet20d = 0;

  const similarDays = top20.map(item => {
    const baseClose = prices[item.idx].close;
    
    const ret5d = ((prices[item.idx + 5].close - baseClose) / baseClose) * 100;
    const ret10d = ((prices[item.idx + 10].close - baseClose) / baseClose) * 100;
    const ret20d = ((prices[item.idx + 20].close - baseClose) / baseClose) * 100;

    if (ret5d > 0) up5d++;
    if (ret10d > 0) up10d++;
    if (ret20d > 0) up20d++;

    sumRet5d += ret5d;
    sumRet10d += ret10d;
    sumRet20d += ret20d;

    return {
      date: item.date,
      similarity: item.similarity,
      return5d: parseFloat(ret5d.toFixed(2)),
      return10d: parseFloat(ret10d.toFixed(2)),
      return20d: parseFloat(ret20d.toFixed(2))
    };
  });

  return {
    winRate5d: parseFloat((up5d / top20.length).toFixed(2)),
    winRate10d: parseFloat((up10d / top20.length).toFixed(2)),
    winRate20d: parseFloat((up20d / top20.length).toFixed(2)),
    avgReturn5d: parseFloat((sumRet5d / top20.length).toFixed(2)),
    avgReturn10d: parseFloat((sumRet10d / top20.length).toFixed(2)),
    avgReturn20d: parseFloat((sumRet20d / top20.length).toFixed(2)),
    currentPattern: {
      rsi: parseFloat((vNow.rsi * 100).toFixed(1)),
      ma20Bias: parseFloat((vNow.maBias * 100).toFixed(2)),
      macdRatio: parseFloat((vNow.macdRatio * 1000).toFixed(4)) // Multiplied for scale readability
    },
    similarDays
  };
}

module.exports = { calculateBacktest };
```

- [ ] **Step 4: 執行測試確認通過**

執行：`npx jest tests/unit/backtest-engine.test.js`
預期輸出：`PASS`

- [ ] **Step 5: 提交變更**

```bash
git add src/lib/technical-analysis/backtest.js tests/unit/backtest-engine.test.js
git commit -m "feat(backtest): implement Euclidean distance calculation and pattern matching"
```

---

### Task 4: API 路由端點整合與整合測試

**Files:**
- Modify: `src/lib/integration.js`
- Modify: `src/app/api/analyze/route.js`
- Test: `tests/integration/backtest-api.test.js` (新建)

**Interfaces:**
- Consumes: `calculateBacktest` from `src/lib/technical-analysis/backtest`
- Produces: `/api/analyze` 輸出的 JSON 中包含完整 `backtest` 物件。

- [ ] **Step 1: 建立 API 整合測試**

建立 `tests/integration/backtest-api.test.js`：
```javascript
const { performFullAnalysis } = require('../../src/lib/integration');
const { connectToDatabase } = require('../../src/lib/database/connection');

describe('Backtest API Integration Tests', () => {
  let db;
  beforeEach(async () => {
    db = await connectToDatabase(':memory:');
    // 預置股票
    await new Promise((resolve) => {
      db.run("INSERT INTO stocks (symbol, market) VALUES ('AAPL', 'US');", resolve);
    });
  });

  afterEach((done) => {
    db.close(done);
  });

  test('performFullAnalysis should return backtest object with structured metrics', async () => {
    const result = await performFullAnalysis('AAPL');
    expect(result).toHaveProperty('backtest');
    expect(result.backtest).toHaveProperty('winRate5d');
    expect(result.backtest.similarDays.length).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

執行：`npx jest tests/integration/backtest-api.test.js`
預期輸出：`FAIL` (無 backtest 屬性)

- [ ] **Step 3: 於整合分析流程中注入增量同步與回測計算**

修改 `src/lib/integration.js`：
* 在頂部引入增量同步與回測計算方法：
```javascript
const { syncStockPricesIncremental, getLocal3YearPrices } = require('./data-fetcher');
const { calculateBacktest } = require('./technical-analysis/backtest');
```
* 在 `performFullAnalysis(symbol)` 方法中（約在 `fetchStockData` 拿到基本數據後），以增量同步將價格持久化，並讀出進行回測：
```javascript
    // 1. Sync price data incrementally and cache in local database
    await syncStockPricesIncremental(db, stock.id, symbol);
    
    // 2. Fetch full 3 years local historical data for backtesting
    const localPrices = await getLocal3YearPrices(db, stock.id);
    
    // 3. Run pattern matching backtest
    const backtestResult = calculateBacktest(localPrices);
```
* 將 `backtestResult` 寫入最終回傳的 Analysis 物件，並在寫入 SQLite `analysis_results` 表時一併序列化儲存。

修改 `src/app/api/analyze/route.js` 的 `GET` 方法，確保從 `performFullAnalysis` 取得的 `backtest` 物件能正確印出日誌並回傳給前端。

- [ ] **Step 4: 執行測試確認通過**

執行：`npx jest tests/integration/backtest-api.test.js`
預期輸出：`PASS`

- [ ] **Step 5: 提交變更**

```bash
git add src/lib/integration.js src/app/api/analyze/route.js tests/integration/backtest-api.test.js
git commit -m "feat(api): integrate incremental sync and backtest calculations into analyze endpoint"
```

---

### Task 5: 前端回測卡片與佈局控制實作

**Files:**
- Create: `src/components/HistoricalBacktestPanel.js`
- Modify: `src/app/stock/[symbol]/page.js`
- Modify: `src/components/CustomizableLayout.js`
- Test: `tests/unit/historical-backtest-panel.test.js` (新建)

**Interfaces:**
- Consumes: `backtest` data structure from `/api/analyze`
- Produces:
  * 視覺化回測卡片渲染
  * 佈局開關連動

- [ ] **Step 1: 建立前端卡片元件單元測試**

建立 `tests/unit/historical-backtest-panel.test.js`：
```javascript
/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoricalBacktestPanel from '../../src/components/HistoricalBacktestPanel';

const mockBacktestData = {
  winRate5d: 0.65,
  winRate10d: 0.70,
  winRate20d: 0.58,
  avgReturn5d: 1.24,
  avgReturn10d: 2.50,
  avgReturn20d: 3.10,
  currentPattern: { rsi: 32.5, ma20Bias: -2.3, macdRatio: 0.012 },
  similarDays: [
    { date: '2024-05-12', similarity: 98.2, return5d: 2.3, return10d: 4.1, return20d: 5.2 }
  ]
};

describe('HistoricalBacktestPanel Component', () => {
  test('renders backtest statistics and table correctly', () => {
    render(<HistoricalBacktestPanel backtest={mockBacktestData} />);
    expect(screen.getByText('歷史相似環境回測')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('2024-05-12')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

執行：`npx jest tests/unit/historical-backtest-panel.test.js`
預期輸出：`FAIL` (module not found)

- [ ] **Step 3: 實作前端 React 視覺化卡片元件**

建立 `src/components/HistoricalBacktestPanel.js`：
```javascript
import React from 'react';

export default function HistoricalBacktestPanel({ backtest }) {
  if (!backtest || !backtest.similarDays) return null;

  const { winRate5d, winRate10d, winRate20d, avgReturn5d, avgReturn10d, avgReturn20d, currentPattern, similarDays } = backtest;

  const getRateColor = (rate) => {
    if (rate >= 0.6) return 'text-emerald-400';
    if (rate <= 0.4) return 'text-rose-400';
    return 'text-slate-400';
  };

  const getReturnColor = (ret) => {
    if (ret > 0) return 'text-emerald-400';
    if (ret < 0) return 'text-rose-400';
    return 'text-slate-400';
  };

  return (
    <div className="border border-slate-900 bg-slate-950/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-900">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>📊</span> 歷史相似環境回測
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            基於歐氏距離匹配最近 3 年（750 交易日）特徵最相近的 Top 20 個歷史交易日
          </p>
        </div>
        <div className="flex gap-2 mt-3 md:mt-0 text-xs text-slate-400">
          <span className="bg-slate-900 px-3 py-1.5 rounded-full font-mono">
            RSI: {currentPattern.rsi}%
          </span>
          <span className="bg-slate-900 px-3 py-1.5 rounded-full font-mono">
            均線乖離: {currentPattern.ma20Bias}%
          </span>
        </div>
      </div>

      {/* Grid of Win Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: '5 天持有期', rate: winRate5d, ret: avgReturn5d },
          { label: '10 天持有期', rate: winRate10d, ret: avgReturn10d },
          { label: '20 天持有期', rate: winRate20d, ret: avgReturn20d }
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-900/30 border border-slate-900/50 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-semibold">{item.label}</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className={`text-3xl font-extrabold tracking-tight ${getRateColor(item.rate)}`}>
                {Math.round(item.rate * 100)}%
                <span className="text-xs text-slate-500 font-normal ml-1">勝率</span>
              </span>
              <span className={`text-sm font-mono font-semibold ${getReturnColor(item.ret)}`}>
                {item.ret > 0 ? '+' : ''}{item.ret}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Similar Dates Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400">Top 5 相似歷史日期表現</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 font-semibold">
                <th className="py-2.5">歷史日期</th>
                <th>相似度</th>
                <th>5 日漲跌</th>
                <th>10 日漲跌</th>
                <th>20 日漲跌</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50 font-mono text-slate-300">
              {similarDays.slice(0, 5).map((day, idx) => (
                <tr key={idx} className="hover:bg-slate-900/20">
                  <td className="py-3 text-slate-400 font-semibold">{day.date}</td>
                  <td>{day.similarity}%</td>
                  <td className={getReturnColor(day.return5d)}>{day.return5d > 0 ? '+' : ''}{day.return5d}%</td>
                  <td className={getReturnColor(day.return10d)}>{day.return10d > 0 ? '+' : ''}{day.return10d}%</td>
                  <td className={getReturnColor(day.return20d)}>{day.return20d > 0 ? '+' : ''}{day.return20d}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

修改 `src/components/CustomizableLayout.js`，將新面板 `HistoricalBacktestPanel` 加入到版面元件清單與設定勾選控制中，並確保 `localStorage` 正確同步。
修改 `src/app/stock/[symbol]/page.js`，從後端取得 `backtest` 資料並傳遞給新元件進行渲染。

- [ ] **Step 4: 執行測試確認通過**

執行：`npx jest tests/unit/historical-backtest-panel.test.js`
預期輸出：`PASS`

- [ ] **Step 5: 提交變更**

```bash
git add src/components/HistoricalBacktestPanel.js src/components/CustomizableLayout.js src/app/stock/[symbol]/page.js tests/unit/historical-backtest-panel.test.js
git commit -m "feat(ui): implement HistoricalBacktestPanel and layout toggle integration"
```
