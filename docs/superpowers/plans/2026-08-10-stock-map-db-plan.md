# Stock Map SQLite Integration & Reverse Search Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate TWSE/TPEx stock mapping into SQLite database, recording `created_at`, with `.TW`/`.TWO` suffix handling and reverse name-to-code lookup.

**Architecture:** Extend SQLite `stocks` schema to support `created_at`, add `getCompanyNameFromDB`, `getCodeFromDB`, and `batchUpsertStocks` in `queries.js`, and implement `getCompanyNameByCode` & `getCodeByCompanyName` in `stock-map.js` using a Read-through cache-aside pattern.

**Tech Stack:** Node.js (ESM), SQLite (`libsql-adapter`), Jest.

## Global Constraints
- Language: Traditional Chinese for documentation and comments.
- Code style: Google Engineering Standards; comments explain "Why".
- DB: SQLite with `libsql-adapter`.

---

### Task 1: Extend Database Schema and Queries for Stock Mapping

**Files:**
- Modify: `src/external/database/schema.js`
- Modify: `src/external/database/connection.js`
- Modify: `src/external/database/queries.js`
- Test: `tests/unit/stock-map-db-queries.test.js`

**Interfaces:**
- Produces:
  - `getCompanyNameFromDB(db, code: string): Promise<{ symbol: string, name: string, market: string, created_at: string } | null>`
  - `getCodeFromDB(db, name: string): Promise<{ symbol: string, name: string, market: string, created_at: string } | null>`
  - `batchUpsertStocks(db, stocksList: Array<{ symbol: string, name: string, market: string }>): Promise<void>`

- [ ] **Step 1: Write failing tests for DB query functions**

Create `tests/unit/stock-map-db-queries.test.js`:
```javascript
import { connectToDatabase } from '@/external/database/connection';
import { getCompanyNameFromDB, getCodeFromDB, batchUpsertStocks } from '@/external/database/queries';

describe('Stock Map DB Queries', () => {
  let db;

  beforeEach(async () => {
    db = await connectToDatabase(':memory:');
  });

  test('batchUpsertStocks 成功批次寫入並自動包含 created_at', async () => {
    const mockList = [
      { symbol: '2330', name: '台積電', market: '上市' },
      { symbol: '8454', name: '富邦媒', market: '上櫃' }
    ];

    await batchUpsertStocks(db, mockList);

    const tsmc = await getCompanyNameFromDB(db, '2330');
    expect(tsmc).not.toBeNull();
    expect(tsmc.name).toBe('台積電');
    expect(tsmc.market).toBe('上市');
    expect(tsmc.created_at).toBeDefined();

    const fubon = await getCodeFromDB(db, '富邦媒');
    expect(fubon).not.toBeNull();
    expect(fubon.symbol).toBe('8454');
    expect(fubon.market).toBe('上櫃');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/stock-map-db-queries.test.js`
Expected: FAIL with `batchUpsertStocks is not a function` or similar.

- [ ] **Step 3: Update `schema.js`, `connection.js`, and `queries.js`**

1. In `src/external/database/schema.js`:
Update `stocks` table schema definition:
```javascript
  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT,
    market TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
```

2. In `src/external/database/connection.js`:
Add dynamic column migration for existing database files:
```javascript
db.all("PRAGMA table_info(stocks);", (stocksErr, stocksCols) => {
  if (!stocksErr && stocksCols) {
    const hasCreatedAt = stocksCols.some(col => col.name === 'created_at');
    if (!hasCreatedAt) {
      db.run("ALTER TABLE stocks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;");
    }
  }
});
```

3. In `src/external/database/queries.js`:
Implement and export `getCompanyNameFromDB`, `getCodeFromDB`, `batchUpsertStocks`:
```javascript
/**
 * 依據個股代碼查詢股票名稱與市場標籤
 */
function getCompanyNameFromDB(db, code) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT symbol, name, market, created_at FROM stocks WHERE symbol = ?;`,
      [String(code).toUpperCase().trim()],
      (err, row) => {
        if (err) return reject(new Error(`Failed to query stock by code: ${err.message}`));
        resolve(row || null);
      }
    );
  });
}

/**
 * 依據公司名稱查詢股票代碼與市場標籤
 */
function getCodeFromDB(db, name) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT symbol, name, market, created_at FROM stocks WHERE name = ?;`,
      [String(name).trim()],
      (err, row) => {
        if (err) return reject(new Error(`Failed to query stock by name: ${err.message}`));
        resolve(row || null);
      }
    );
  });
}

/**
 * 批次寫入或更新股票對照資料至 stocks 資料表
 */
function batchUpsertStocks(db, stocksList) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION;');

      // Why: 使用 INSERT ON CONFLICT(symbol) DO UPDATE 可以保護已有數據（如 ID 與外鍵關聯），
      // 同時覆蓋更新最新名稱、市場類型與更新時間戳記 (created_at = CURRENT_TIMESTAMP)，不會清空或破壞舊有記錄。
      const stmt = db.prepare(`
        INSERT INTO stocks (symbol, name, market, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(symbol) DO UPDATE SET
          name = excluded.name,
          market = excluded.market,
          created_at = CURRENT_TIMESTAMP;
      `);

      let errOccurred = null;

      stocksList.forEach((stock) => {
        if (errOccurred) return;
        stmt.run([stock.symbol, stock.name, stock.market], (err) => {
          if (err) errOccurred = err;
        });
      });

      stmt.finalize((finalizeErr) => {
        if (errOccurred || finalizeErr) {
          db.run('ROLLBACK;');
          return reject(errOccurred || finalizeErr);
        }
        db.run('COMMIT;', (commitErr) => {
          if (commitErr) {
            db.run('ROLLBACK;');
            return reject(commitErr);
          }
          resolve();
        });
      });
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/stock-map-db-queries.test.js`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/external/database/schema.js src/external/database/connection.js src/external/database/queries.js tests/unit/stock-map-db-queries.test.js
git commit -m "feat(db): add created_at to stocks schema and batchUpsertStocks query"
```

---

### Task 2: Implement `getCompanyNameByCode` and `getCodeByCompanyName` in `stock-map.js`

**Files:**
- Modify: `src/lib/stock-map.js`
- Test: `tests/unit/stock-map-db-service.test.js`

**Interfaces:**
- Consumes: `getCompanyNameFromDB`, `getCodeFromDB`, `batchUpsertStocks`, `connectToDatabase`
- Produces:
  - `getCompanyNameByCode(code: string | number, options?: Object)`
  - `getCodeByCompanyName(name: string, options?: Object)`

- [ ] **Step 1: Write failing tests for `getCompanyNameByCode` and `getCodeByCompanyName`**

Create `tests/unit/stock-map-db-service.test.js`:
```javascript
import { connectToDatabase } from '@/external/database/connection';
import { getCompanyNameByCode, getCodeByCompanyName, resetStockMap } from '@/lib/stock-map';

describe('Stock Map Service DB Read-Through Integration', () => {
  let db;

  const mockTwseData = [
    { Code: '2330', Name: '台積電' },
    { Code: '2603', Name: '長榮' }
  ];

  const mockTpexData = [
    { SecuritiesCompanyCode: '8454', CompanyName: '富邦媒' }
  ];

  const mockFetcher = jest.fn().mockImplementation((url) => {
    if (url.includes('twse')) return Promise.resolve({ json: () => Promise.resolve(mockTwseData) });
    if (url.includes('tpex')) return Promise.resolve({ json: () => Promise.resolve(mockTpexData) });
    return Promise.reject(new Error('Unknown URL'));
  });

  beforeEach(async () => {
    resetStockMap();
    db = await connectToDatabase(':memory:');
    mockFetcher.mockClear();
  });

  test('getCompanyNameByCode 傳入 2330.TW 時能正確去除後綴並解析市場名稱與更新 DB', async () => {
    const result = await getCompanyNameByCode('2330.TW', { db, fetcher: mockFetcher });

    expect(result.success).toBe(true);
    expect(result.code).toBe('2330');
    expect(result.rawSymbol).toBe('2330.TW');
    expect(result.name).toBe('台積電');
    expect(result.market).toBe('上市');
    expect(mockFetcher).toHaveBeenCalledTimes(2);

    // 第二次呼叫，直接命中 DB，不發起網路請求
    const resultCached = await getCompanyNameByCode('2603', { db, fetcher: mockFetcher });
    expect(resultCached.success).toBe(true);
    expect(resultCached.name).toBe('長榮');
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  test('getCodeByCompanyName 能由公司名稱查出代號並附帶市場後綴', async () => {
    // 觸發首次同步
    await getCompanyNameByCode('2330', { db, fetcher: mockFetcher });

    const res = await getCodeByCompanyName('富邦媒', { db, fetcher: mockFetcher });

    expect(res.success).toBe(true);
    expect(res.code).toBe('8454');
    expect(res.symbolWithSuffix).toBe('8454.TWO');
    expect(res.name).toBe('富邦媒');
    expect(res.market).toBe('上櫃');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/stock-map-db-service.test.js`
Expected: FAIL with `getCompanyNameByCode is not a function` or unexpected signature.

- [ ] **Step 3: Implement `getCompanyNameByCode` and `getCodeByCompanyName` in `stock-map.js`**

Update [`src/lib/stock-map.js`](file:///D:/Programming/StockAnalysis/src/lib/stock-map.js):
```javascript
import { connectToDatabase } from '../external/database/connection';
import { getCompanyNameFromDB, getCodeFromDB, batchUpsertStocks } from '../external/database/queries';

/**
 * 解析純數字股票代碼與市場資訊
 * @param {string|number} rawCode - 如 '2330', '2330.TW', '8454.TWO'
 */
export function parseStockCode(rawCode) {
  if (rawCode === null || rawCode === undefined) return { code: '', inferredMarket: null };

  const str = String(rawCode).trim().toUpperCase();
  const code = str.replace(/\.(TW|TWO)$/i, '');

  let inferredMarket = null;
  if (str.endsWith('.TW')) inferredMarket = '上市';
  else if (str.endsWith('.TWO')) inferredMarket = '上櫃';

  return { code, inferredMarket };
}

/**
 * 將記憶體 / 抓取到的對照表同步持久化至 DB
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
 * 依據個股代碼取得公司名稱與詳細資訊（優先讀取 DB，若缺資料自動進行全量同步）
 */
export async function getCompanyNameByCode(code, options = {}) {
  const { code: searchCode, inferredMarket } = parseStockCode(code);

  if (!searchCode) {
    return { success: false, message: '無效的股票代碼' };
  }

  const db = options.db || (await connectToDatabase());

  // 1. 先自 DB 讀取
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

  // 2. DB 無資料時，發起 API 初始化
  await initializeStockMap(options);

  // 檢查重新抓取後全量 Map 中是否存在該個股代碼，避免無效號碼陷入無窮迴圈或無謂 DB 操作
  const fetchedInfo = stockCacheMap.get(searchCode);
  if (!fetchedInfo) {
    return {
      success: false,
      message: `找不到代碼為 ${searchCode} 的股票，請確認代碼是否正確或是否已下市。`
    };
  }

  // 存在才寫入 DB 進行同步
  await syncStockMapToDB(db, stockCacheMap);

  // 3. 再次自 DB 讀取
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

  const inMemory = stockCacheMap.get(searchCode);
  if (inMemory) {
    return {
      success: true,
      code: searchCode,
      rawSymbol: String(code),
      name: inMemory.name,
      market: inMemory.market
    };
  }

  return {
    success: false,
    message: `找不到代碼為 ${searchCode} 的股票，請確認代碼是否正確或是否已下市。`
  };
}

/**
 * 依據公司名稱取得股票代碼 (支援包含 .TW / .TWO 後綴的完整 Symbol)
 */
export async function getCodeByCompanyName(name, options = {}) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { success: false, message: '無效的公司名稱' };
  }

  const searchName = name.trim();
  const db = options.db || (await connectToDatabase());

  // 1. 先自 DB 查詢
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

  // 2. DB 無資料，進行全量同步
  await initializeStockMap(options);
  await syncStockMapToDB(db, stockCacheMap);

  // 3. 再次查詢
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

  return {
    success: false,
    message: `找不到名稱為 ${searchName} 的台股代碼`
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/stock-map-db-service.test.js`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/lib/stock-map.js tests/unit/stock-map-db-service.test.js
git commit -m "feat(stock-map): add getCompanyNameByCode and getCodeByCompanyName with DB read-through cache"
```
