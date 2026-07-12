/**
 * Database Schema Definition
 * Declares the SQL statements for initializing the SQLite tables.
 * 
 * Why this schema design is selected:
 * - `stocks` acts as the master record for metadata to prevent redundant string storage (symbol, name, market).
 * - `stock_data` maintains time-series price details. By storing high/low/close as REAL, 
 *   we ensure precise float computations for indicators.
 * - `analysis_results` acts as a historical cache. Technical, fundamental, news, and advice 
 *   objects are serialized to JSON string (TEXT) so we can query historical recommendations 
 *   without re-running expensive analysis pipelines.
 * 
 * @module database/schema
 */

const schema = `
  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT,
    market TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS stock_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,
    date DATE NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume INTEGER NOT NULL,
    UNIQUE(stock_id, date),
    FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,
    date DATE NOT NULL,
    technical TEXT,   -- Serialized JSON containing technical indicators
    fundamental TEXT, -- Serialized JSON containing fundamental ratios
    news TEXT,        -- Serialized JSON containing media sentiment
    advice TEXT,      -- Serialized JSON containing portfolio & action advice
    UNIQUE(stock_id, date),
    FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
  );
`;

module.exports = { schema };
