# Turso 雲端資料庫遷移與 Vercel 部署相容性實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除 Next.js 專案中的 `sqlite3` 套件以避開 Vercel GLIBC 編譯錯誤，引入 `@libsql/client` 並透過 `libsql-adapter.js` 進行 API 相容性封裝，實現雙模自動切換（本地檔案/Turso 雲端）。

**Architecture:** 
1. 建立 `src/lib/database/libsql-adapter.js` 適配器封裝，在無 C++ 原生綁定的情況下支援原有的 `Database`、`run`、`get`、`all`、`exec` 和 `Statement`（Prepared Statements）介面。
2. 將 `connection.js` 與 `/api/watchlist/route.js` 中的 `sqlite3` 參照替換為此適配器。
3. 在 `.env.local` 存在 `TURSO_DATABASE_URL` 時自動轉向雲端，否則使用 `file:` 驅動連接本地 SQLite 檔案。

**Tech Stack:** Next.js (14.2.0), @libsql/client, Jest

## Global Constraints
- 禁止引入任何含有原生 C++ 綁定的資料庫套件，以防止 Vercel 部署失敗。
- 連線字串的切換必須是自動的，不可寫死。
- 所有原有的 `sqlite3` 呼叫與 prepared statements callback 行為必須相容。

---

### Task 1: 安裝依賴與建立 libsql-adapter 適配器

**Files:**
- Create: `src/lib/database/libsql-adapter.js`
- Create: `tests/unit/libsql-adapter.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `@libsql/client` 的 `createClient` 方法
- Produces: 導出與 `sqlite3` 相容的 `Database` 類別與 `verbose()` 方法

- [ ] **Step 1: 更新 package.json 依賴**

修改 `package.json` 的 `dependencies`：
*   **移除** `"sqlite3": "^6.0.1"`
*   **新增** `"@libsql/client": "^0.6.0"`

- [ ] **Step 2: 安裝依賴套件**

Run: `npm install`
Expected: 成功安裝，且 `node_modules` 中無 `sqlite3`，已新增 `@libsql/client`。

- [ ] **Step 3: 撰寫 libsql-adapter 核心功能測試**

建立 `tests/unit/libsql-adapter.test.js` 驗證適配器在 `:memory:` 下的行爲：

```javascript
// tests/unit/libsql-adapter.test.js
const { Database } = require('../../src/lib/database/libsql-adapter');

describe("Libsql Adapter - sqlite3 Compatibility API", () => {
  let db;

  beforeEach((done) => {
    // 使用記憶體模式初始化適配器
    db = new Database(':memory:', (err) => {
      expect(err).toBeNull();
      done();
    });
  });

  afterEach((done) => {
    db.close((err) => {
      expect(err).toBeNull();
      done();
    });
  });

  test("should execute basic table creation and query (all/get/run)", (done) => {
    db.serialize(() => {
      db.run("CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT);", (err) => {
        expect(err).toBeUndefined();
      });

      db.run("INSERT INTO test_table (name) VALUES (?), (?);", ["Alice", "Bob"], function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(2);
        // libsql 在批量插入時的 lastInsertRowid 可能回傳 bigint，我們需要轉為 Number
        expect(this.lastID).toBeGreaterThan(0);
      });

      db.get("SELECT name FROM test_table WHERE id = ?;", [1], (err, row) => {
        expect(err).toBeNull();
        expect(row).toEqual({ id: 1, name: "Alice" });
      });

      db.all("SELECT name FROM test_table ORDER BY id ASC;", (err, rows) => {
        expect(err).toBeNull();
        expect(rows).toEqual([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);
        done();
      });
    });
  });

  test("should support prepared statements (prepare/finalize)", (done) => {
    db.run("CREATE TABLE prep_table (id INTEGER PRIMARY KEY, score REAL);", (err) => {
      expect(err).toBeUndefined();

      const stmt = db.prepare("INSERT INTO prep_table (score) VALUES (?);");
      stmt.run([85.5], function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
      });
      stmt.run([92.0]);

      stmt.finalize((err) => {
        expect(err).toBeUndefined();
        // 驗證寫入成功
        db.all("SELECT score FROM prep_table ORDER BY id ASC;", (err, rows) => {
          expect(err).toBeNull();
          expect(rows).toEqual([{ id: 1, score: 85.5 }, { id: 2, score: 92.0 }]);
          done();
        });
      });
    });
  });
});
```

- [ ] **Step 4: 執行測試並驗證其失敗**

Run: `npx jest tests/unit/libsql-adapter.test.js`
Expected: 測試失敗，並提示找不到 `src/lib/database/libsql-adapter` 模組。

- [ ] **Step 5: 實作 `src/lib/database/libsql-adapter.js`**

建立 `src/lib/database/libsql-adapter.js` 檔案：

```javascript
// src/lib/database/libsql-adapter.js
const { createClient } = require('@libsql/client');

class Database {
  constructor(dbPath, callback) {
    let url;
    const authToken = process.env.TURSO_AUTH_TOKEN || '';

    if (process.env.TURSO_DATABASE_URL) {
      url = process.env.TURSO_DATABASE_URL;
    } else {
      if (dbPath === ':memory:') {
        url = 'file::memory:';
      } else {
        url = dbPath.startsWith('file:') ? dbPath : `file:${dbPath}`;
      }
    }

    this.client = createClient({ url, authToken });

    if (callback) {
      setTimeout(() => callback(null), 10);
    }
  }

  close(callback) {
    try {
      this.client.close();
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  exec(sql, callback) {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => ({ sql: s, args: [] }));

    this.client.batch(statements, 'write')
      .then(() => {
        if (callback) callback(null);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }

  serialize(callback) {
    if (callback) callback();
  }

  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    this.client.execute({ sql, args: params || [] })
      .then(res => {
        if (callback) {
          const ctx = {
            lastID: res.lastInsertRowid ? Number(res.lastInsertRowid) : undefined,
            changes: res.rowsAffected
          };
          callback.call(ctx, null);
        }
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }

  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    this.client.execute({ sql, args: params || [] })
      .then(res => {
        const row = res.rows[0] ? { ...res.rows[0] } : undefined;
        if (callback) callback(null, row);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }

  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    this.client.execute({ sql, args: params || [] })
      .then(res => {
        const rows = res.rows.map(row => ({ ...row }));
        if (callback) callback(null, rows);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }

  prepare(sql, callback) {
    const stmt = new Statement(this.client, sql);
    if (callback) callback(null, stmt);
    return stmt;
  }
}

class Statement {
  constructor(client, sql) {
    this.client = client;
    this.sql = sql;
    this.promises = [];
  }

  run(params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    const p = this.client.execute({ sql: this.sql, args: params || [] })
      .then(res => {
        if (callback) {
          const ctx = {
            lastID: res.lastInsertRowid ? Number(res.lastInsertRowid) : undefined,
            changes: res.rowsAffected
          };
          callback.call(ctx, null);
        }
      })
      .catch(err => {
        if (callback) callback(err);
        throw err;
      });

    this.promises.push(p);
    return this;
  }

  finalize(callback) {
    Promise.all(this.promises)
      .then(() => {
        if (callback) callback();
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }
}

module.exports = {
  Database,
  verbose: function() { return this; }
};
```

- [ ] **Step 6: 重新執行測試驗證其通過**

Run: `npx jest tests/unit/libsql-adapter.test.js`
Expected: 2 個測試全部通過。

- [ ] **Step 7: Commit 變更**

```bash
git add package.json package-lock.json src/lib/database/libsql-adapter.js tests/unit/libsql-adapter.test.js
git commit -m "feat: install @libsql/client and implement libsql-adapter to replace sqlite3 native dependency"
```

---

### Task 2: 替換資料庫引用點與全案單元測試驗證

**Files:**
- Modify: `src/lib/database/connection.js`
- Modify: `src/app/api/watchlist/route.js`

**Interfaces:**
- Consumes: `src/lib/database/libsql-adapter.js`
- Produces: 運作正常的專案級資料庫連線與 Watchlist API。

- [ ] **Step 1: 修改資料庫連線代碼 `src/lib/database/connection.js`**

修改第 17 行的引言：

```javascript
// src/lib/database/connection.js
// 替換原生 sqlite3 為我們的 libsql-adapter
const sqlite3 = require('./libsql-adapter');
```

- [ ] **Step 2: 修改 Watchlist API 路由 `src/app/api/watchlist/route.js`**

修改第 1 行的引言：

```javascript
// src/app/api/watchlist/route.js
// 替換原生 sqlite3 為 libsql-adapter
import sqlite3 from '@/lib/database/libsql-adapter';
```

- [ ] **Step 3: 執行全專案的單元測試，驗證相容性**

Run: `npm test`
Expected: 所有的 36 個測試套件 (202 個測試) 全數通過。這代表 `libsql-adapter` 與原本的資料庫呼叫（包含 queries.js 中的 prepared statements 和 transactions）有著完美的相容性。

- [ ] **Step 4: Commit 變更**

```bash
git add src/lib/database/connection.js src/app/api/watchlist/route.js
git commit -m "feat: route database connection and watchlist api through libsql-adapter"
```

---

### Task 3: Turso 雲端實體整合測試

**Files:**
- None (僅在本地驗證與部署)

**Interfaces:**
- Consumes: `process.env.TURSO_DATABASE_URL`, `process.env.TURSO_AUTH_TOKEN`
- Produces: 成功同步數據到 Turso 雲端，且 Vercel 部署能編譯成功。

- [ ] **Step 1: 在本地端驗證雲端寫入**

暫時保留 `.env.local` 裡的 `TURSO_DATABASE_URL` 與 `TURSO_AUTH_TOKEN`。
啟動本地伺服器並執行初始化，或者運行單個整合測試。
確認本地能夠順利透過網址與 Token 連結至 Turso（可以連上代表專案已能在生產環境跑雲端庫）。

- [ ] **Step 2: 在本地暫時移除或註解 Turso 環境變數以切換回本地開發模式**

為確保日常本地開發與測試不受雲端影響：
將 `.env.local` 裡的 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 註解。
再次執行測試，確認可以自動無縫降級切換回本地 SQLite 檔案。

- [ ] **Step 3: 推送變更至 GitHub 遠端**

Run: `git push origin main`
Expected: 程式碼成功推送到 GitHub。由於 package.json 已無 `"sqlite3"`，Vercel build 期間將不再觸發原生 native 編譯 GLIBC 錯誤。
