/**
 * Database Connection Module
 * Handles SQLite database initialization, connection pooling (single file), and schema application.
 * 
 * Why this configuration is selected:
 * - `sqlite3.Database` is asynchronous by default. Wrapping initialization in a Promise ensures 
 *   that downstream modules do not attempt queries before tables are fully initialized.
 * - Enabling Foreign Keys explicitly (`PRAGMA foreign_keys = ON`) is necessary in SQLite because 
 *   it is disabled by default for backwards compatibility. Without it, cascade deletions won't work.
 * - Supporting dynamic `dbPath` allows tests to instantiate `:memory:` databases for clean test isolation.
 * 
 * @module database/connection
 */

const fs = require('fs');
const path = require('path');
// Why: Replace native sqlite3 driver with libsql-adapter to support local file and Turso cloud database across environments.
const sqlite3 = require('./libsql-adapter');
const { schema } = require('./schema');

/**
 * Establishes a connection to the SQLite database and runs initial DDL schema scripts.
 * 
 * @param {string} [dbPath] - Absolute/relative path to database file, or ':memory:' for tests
 * @returns {Promise<sqlite3.Database>} Initialized SQLite database instance
 */
let activeDbInstance = null;

/**
 * Establishes a connection to the SQLite database and runs initial DDL schema scripts.
 * 
 * @param {string} [dbPath] - Absolute/relative path to database file, or ':memory:' for tests
 * @returns {Promise<sqlite3.Database>} Initialized SQLite database instance
 */
function connectToDatabase(dbPath = 'data/stock.db') {
  return new Promise((resolve, reject) => {
    // Ensure the parent directory exists if initializing a physical database file on disk.
    // Why: Vercel serverless environment has a read-only filesystem under /var/task.
    // If TURSO_DATABASE_URL is set, we connect to the cloud database and must not try to create local directories on Vercel.
    const useTurso = !!process.env.TURSO_DATABASE_URL;
    if (!useTurso && dbPath !== ':memory:') {
      const dir = path.dirname(path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        return reject(new Error(`Failed to open database at ${dbPath}: ${err.message}`));
      }

      // We run connections in serialized mode to ensure schema setup runs sequentially.
      db.serialize(() => {
        // Enable foreign keys for referential integrity constraint enforcement.
        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
          if (pragmaErr) {
            return reject(new Error(`Failed to enable foreign keys: ${pragmaErr.message}`));
          }

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
              const onDone = () => {
                  db.exec(`
                    CREATE TABLE IF NOT EXISTS market_funds_flow (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      market TEXT NOT NULL,
                      date DATE NOT NULL,
                      prompt TEXT NOT NULL,
                      content TEXT NOT NULL,
                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                      UNIQUE(market, date)
                    );
                    CREATE TABLE IF NOT EXISTS stock_prompt_analysis (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      symbol TEXT NOT NULL,
                      analysis_type TEXT NOT NULL,
                      date TEXT NOT NULL,
                      content TEXT NOT NULL,
                      created_at TEXT DEFAULT (datetime('now')),
                      UNIQUE(symbol, analysis_type, date)
                    );
                    CREATE TABLE IF NOT EXISTS market_overview_metrics (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      fear_greed_score REAL,
                      fear_greed_text TEXT,
                      vix_value REAL,
                      vix_text TEXT,
                      win_rate REAL,
                      updated_at TEXT DEFAULT (datetime('now'))
                    );
                  `, (execErr) => {
                    if (execErr) {
                      return reject(new Error(`Failed to apply dynamic tables DDL: ${execErr.message}`));
                    }
                    activeDbInstance = db;
                    resolve(db);
                  });
              };
              if (!hasBacktest) {
                db.run("ALTER TABLE analysis_results ADD COLUMN backtest TEXT;", (alterErr) => {
                  if (alterErr) {
                    return reject(new Error(`Failed to alter table: ${alterErr.message}`));
                  }
                  onDone();
                });
              } else {
                onDone();
              }
            });
          });
        });
      });
    });
  });
}

/**
 * Returns the currently active database instance.
 * @returns {sqlite3.Database|null}
 */
function getActiveDatabase() {
  return activeDbInstance;
}

module.exports = { connectToDatabase, getActiveDatabase };

