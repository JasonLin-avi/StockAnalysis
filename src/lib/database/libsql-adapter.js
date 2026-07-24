// src/lib/database/libsql-adapter.js
// Wrap @libsql/client (Turso) to provide a sqlite3-compatible interface (Database, Statement, run, get, all, exec, serialize).
// This adapter allows seamlessly replacing native sqlite3 in Vercel/Next.js serverless environments.

const { createClient } = require('@libsql/client');

class Database {
  /**
   * Initialize Libsql client based on database path or environment variables.
   * Remote Turso URLs take precedence if present; otherwise local file or in-memory sqlite is used.
   */
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
    
    // Why: Support stateless transaction buffering over HTTP remote connections.
    // We queue SQL commands executed inside BEGIN/COMMIT blocks and execute them atomically via client.batch on COMMIT.
    this.inTransaction = false;
    this.txQueue = [];

    // Simulate async callback mechanism expected by sqlite3 connection constructor
    if (callback) {
      process.nextTick(() => callback(null));
    }
  }

  /**
   * Close database connection client gracefully.
   */
  close(callback) {
    try {
      this.client.close();
      if (callback) {
        setTimeout(() => callback(null), 50);
      }
    } catch (err) {
      if (callback) callback(err);
    }
  }

  /**
   * Execute batch multi-statement SQL text.
   * Split statements by semicolon as @libsql client batch API expects structured individual statement objects.
   */
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

  /**
   * No-op implementation of serialize for sqlite3 API compatibility.
   * Libsql operations are handled asynchronously over HTTP/WebSockets or local driver.
   */
  serialize(callback) {
    if (callback) callback();
  }

  /**
   * Run write query and return context with lastID and changes count.
   * Intercepts transaction flow (BEGIN/COMMIT/ROLLBACK) for buffering.
   */
  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    const cleanSql = sql.trim().toUpperCase();

    // 1. Intercept BEGIN TRANSACTION
    if (cleanSql.startsWith("BEGIN TRANSACTION") || cleanSql.startsWith("BEGIN;")) {
      this.inTransaction = true;
      this.txQueue = [];
      if (callback) {
        const ctx = { changes: 0, lastID: 0 };
        process.nextTick(() => callback.call(ctx, null));
      }
      return;
    }

    // 2. Intercept COMMIT
    if (cleanSql.startsWith("COMMIT") || cleanSql.startsWith("END TRANSACTION")) {
      if (!this.inTransaction) {
        if (callback) {
          process.nextTick(() => callback(new Error("cannot commit - no transaction is active")));
        }
        return;
      }

      this.inTransaction = false;
      const statements = [...this.txQueue];
      this.txQueue = [];

      if (statements.length === 0) {
        if (callback) {
          const ctx = { changes: 0, lastID: 0 };
          process.nextTick(() => callback.call(ctx, null));
        }
        return;
      }

      // Execute all buffered transaction queries atomically in a single HTTP batch request
      this.client.batch(statements, 'write')
        .then(results => {
          if (callback) {
            const lastRes = results[results.length - 1];
            const ctx = {
              lastID: (lastRes?.lastInsertRowid !== undefined && lastRes?.lastInsertRowid !== null) ? Number(lastRes.lastInsertRowid) : undefined,
              changes: lastRes?.rowsAffected || 0
            };
            callback.call(ctx, null);
          }
        })
        .catch(err => {
          if (callback) callback(err);
        });
      return;
    }

    // 3. Intercept ROLLBACK
    if (cleanSql.startsWith("ROLLBACK")) {
      this.inTransaction = false;
      this.txQueue = [];
      if (callback) {
        const ctx = { changes: 0, lastID: 0 };
        process.nextTick(() => callback.call(ctx, null));
      }
      return;
    }

    // 4. Buffer ordinary queries if inside transaction block
    if (this.inTransaction) {
      this.txQueue.push({ sql, args: params || [] });
      if (callback) {
        const ctx = { changes: 1, lastID: 1 };
        process.nextTick(() => callback.call(ctx, null));
      }
      return;
    }

    // 5. Normal stateless query execution
    this.client.execute({ sql, args: params || [] })
      .then(res => {
        if (callback) {
          const ctx = {
            lastID: (res.lastInsertRowid !== undefined && res.lastInsertRowid !== null) ? Number(res.lastInsertRowid) : undefined,
            changes: res.rowsAffected
          };
          callback.call(ctx, null);
        }
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }

  /**
   * Fetch single matching row.
   */
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

  /**
   * Fetch all matching rows.
   */
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

  /**
   * Create prepared statement object.
   */
  prepare(sql, callback) {
    const stmt = new Statement(this, sql);
    if (callback) callback(null, stmt);
    return stmt;
  }
}

class Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.promises = [];
  }

  /**
   * Execute prepared statement. Diverts to database.run buffering if inside a transaction block.
   */
  run(params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (this.database.inTransaction) {
      this.database.run(this.sql, params, callback);
      return this;
    }

    const p = this.database.client.execute({ sql: this.sql, args: params || [] })
      .then(res => {
        if (callback) {
          const ctx = {
            lastID: (res.lastInsertRowid !== undefined && res.lastInsertRowid !== null) ? Number(res.lastInsertRowid) : undefined,
            changes: res.rowsAffected
          };
          callback.call(ctx, null);
        }
      })
      .catch(err => {
        if (callback) callback(err);
      });

    this.promises.push(p);
    return this;
  }

  /**
   * Wait for all queued execution promises to complete before resolving.
   */
  finalize(callback) {
    Promise.all(this.promises)
      .then(() => {
        if (callback) callback(null);
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
