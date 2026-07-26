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
    backtest TEXT,    -- Serialized JSON containing pattern matching backtest results
    UNIQUE(stock_id, date),
    FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS market_funds_flow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market TEXT NOT NULL,          -- 'US' 或 'TW'
    date DATE NOT NULL,            -- 分析基準日 (YYYY-MM-DD)
    prompt TEXT NOT NULL,          -- 呼叫時使用的 Prompt 內容 (用於 Prompt 版本更新時使快取失效)
    content TEXT NOT NULL,         -- Gemini 回傳的 Markdown 文字內容
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


`;

export {schema};
