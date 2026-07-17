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
const sqlite3 = require('sqlite3').verbose();
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
    if (dbPath !== ':memory:') {
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
                activeDbInstance = db;
                resolve(db);
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

