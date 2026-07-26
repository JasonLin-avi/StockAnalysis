// src/external/database/libsql-adapter.js
// CommonJS adapter providing sqlite3‑like interface using @libsql/client.

import { createClient } from '@libsql/client';

/**
 * Database class mimics the sqlite3.Database API but uses @libsql/client under the hood.
 * Why: Enables seamless replacement of the native sqlite3 driver with a cloud‑compatible implementation.
 */
class Database {
  /**
   * Initialize LibSQL client based on a path or environment variables.
   * @param {string} dbPath - Path to the SQLite file or ':memory:'.
   * @param {(err?: Error) => void} [callback] - Optional callback matching sqlite3 constructor signature.
   */
  constructor(dbPath, callback) {
    const authToken = process.env.TURSO_AUTH_TOKEN || '';
    let url;
    if (process.env.TURSO_DATABASE_URL) {
      url = process.env.TURSO_DATABASE_URL;
    } else if (dbPath === ':memory:') {
      url = 'file::memory:';
    } else {
      url = dbPath.startsWith('file:') ? dbPath : `file:${dbPath}`;
    }
    this.client = createClient({ url, authToken });
    this.inTransaction = false;
    this.txQueue = [];
    if (callback) {
      // Mimic async constructor callback of sqlite3.
      process.nextTick(() => callback(null));
    }
  }

  /** Close the client connection. */
  close(callback) {
    try {
      this.client.close();
      if (callback) setTimeout(() => callback(null), 50);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  /** Execute a batch of statements (used for exec). */
  exec(sql, callback) {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => ({ sql: s, args: [] }));
    this.client.batch(statements, 'write')
      .then(() => callback && callback(null))
      .catch(err => callback && callback(err));
  }

  /** No‑op serialize for compatibility. */
  serialize(callback) {
    if (callback) callback();
  }

  /** Run a write query, supporting transaction buffering. */
  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const cleanSql = sql.trim().toUpperCase();
    if (cleanSql.startsWith('BEGIN TRANSACTION') || cleanSql.startsWith('BEGIN;')) {
      this.inTransaction = true;
      this.txQueue = [];
      if (callback) {
        const ctx = { changes: 0, lastID: 0 };
        process.nextTick(() => callback.call(ctx, null));
      }
      return;
    }
    if (cleanSql.startsWith('COMMIT') || cleanSql.startsWith('END TRANSACTION')) {
      if (!this.inTransaction) {
        if (callback) process.nextTick(() => callback(new Error('cannot commit - no transaction is active')));
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
      this.client.batch(statements, 'write')
        .then(results => {
          if (callback) {
            const lastRes = results[results.length - 1];
            const ctx = {
              lastID: (lastRes?.lastInsertRowid !== undefined && lastRes?.lastInsertRowid !== null)
                ? Number(lastRes.lastInsertRowid)
                : undefined,
              changes: lastRes?.rowsAffected || 0,
            };
            callback.call(ctx, null);
          }
        })
        .catch(err => callback && callback(err));
      return;
    }
    if (cleanSql.startsWith('ROLLBACK')) {
      this.inTransaction = false;
      this.txQueue = [];
      if (callback) {
        const ctx = { changes: 0, lastID: 0 };
        process.nextTick(() => callback.call(ctx, null));
      }
      return;
    }
    if (this.inTransaction) {
      this.txQueue.push({ sql, args: params || [] });
      if (callback) {
        const ctx = { changes: 1, lastID: 1 };
        process.nextTick(() => callback.call(ctx, null));
      }
      return;
    }
    this.client.execute({ sql, args: params || [] })
      .then(res => {
        if (callback) {
          const ctx = {
            lastID: (res.lastInsertRowid !== undefined && res.lastInsertRowid !== null)
              ? Number(res.lastInsertRowid)
              : undefined,
            changes: res.rowsAffected,
          };
          callback.call(ctx, null);
        }
      })
      .catch(err => callback && callback(err));
  }

  /** Fetch a single row. */
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
      .catch(err => callback && callback(err));
  }

  /** Fetch all matching rows. */
  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    this.client.execute({ sql, args: params || [] })
      .then(res => {
        const rows = res.rows.map(r => ({ ...r }));
        if (callback) callback(null, rows);
      })
      .catch(err => callback && callback(err));
  }

  /** Prepare a statement compatible with sqlite3 API. */
  prepare(sql, callback) {
    const stmt = new Statement(this, sql);
    if (callback) callback(null, stmt);
    return stmt;
  }
}

/** Statement class mimics sqlite3.Statement. */
class Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.promises = [];
  }

  /** Execute the prepared statement (run). */
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
            lastID: (res.lastInsertRowid !== undefined && res.lastInsertRowid !== null)
              ? Number(res.lastInsertRowid)
              : undefined,
            changes: res.rowsAffected,
          };
          callback.call(ctx, null);
        }
      })
      .catch(err => callback && callback(err));
    this.promises.push(p);
    return this;
  }

  /** Wait for all run promises to settle. */
  finalize(callback) {
    Promise.all(this.promises)
      .then(() => callback && callback(null))
      .catch(err => callback && callback(err));
  }
}

/** Verbose shim – matches sqlite3.verbose(). */
function verbose() {
  return { verbose: () => ({}) };
}

export { Database, verbose };

// Why: Migration scripts and legacy consumers use `import sqlite3 from './libsql-adapter'`
// then call `new sqlite3.Database(...)`. Default export mirrors the sqlite3 package shape.
export default { Database, verbose };
