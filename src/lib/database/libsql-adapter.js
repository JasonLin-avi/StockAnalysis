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

    // Simulate async callback mechanism expected by sqlite3 connection constructor
    if (callback) {
      setTimeout(() => callback(null), 10);
    }
  }

  /**
   * Close database connection client gracefully.
   */
  close(callback) {
    try {
      this.client.close();
      if (callback) callback(null);
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
   */
  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    this.client.execute({ sql, args: params || [] })
      .then(res => {
        if (callback) {
          const ctx = {
            // Convert bigint to Number for sqlite3 callback compatibility
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

  /**
   * Execute prepared statement and queue promise for batch finalization.
   */
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
