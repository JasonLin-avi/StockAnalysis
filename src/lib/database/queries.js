/**
 * Database Queries Module
 * Provides promise-wrapped CRUD functions for stock records, pricing data, and analysis results.
 * 
 * Why queries use Promises and parameterized SQL:
 * - Wrapping callback-based `sqlite3` API into Promises simplifies async/await execution flow.
 * - Parameterized SQL queries (using `?` placeholders) prevent SQL injection vulnerabilities.
 * - `INSERT OR REPLACE` is selected for stock price records to handle updates to historical data 
 *   without generating duplicate row errors.
 * - Storing complex indicators as serialized JSON strings allows us to save complex nested state 
 *   without creating dozens of specific columns.
 * 
 * @module database/queries
 */

/**
 * Saves a stock metadata record, or retrieves its ID if it already exists.
 * 
 * @param {sqlite3.Database} db - Database connection
 * @param {Object} stock - Stock metadata
 * @param {string} stock.symbol - Stock ticker
 * @param {string} [stock.name] - Stock company name
 * @param {string} stock.market - Market e.g. 'US' or 'TW'
 * @returns {Promise<number>} Resolved with the stock's database ID
 */
function saveStock(db, stock) {
  return new Promise((resolve, reject) => {
    const query = `INSERT OR IGNORE INTO stocks (symbol, name, market) VALUES (?, ?, ?);`;
    db.run(query, [stock.symbol.toUpperCase(), stock.name || null, stock.market], function(err) {
      if (err) {
        return reject(new Error(`Failed to save stock metadata: ${err.message}`));
      }

      // If the row was inserted, this.lastID contains the new ID.
      // If it already existed and was ignored, we select the existing ID.
      if (this.changes > 0) {
        resolve(this.lastID);
      } else {
        db.get(`SELECT id FROM stocks WHERE symbol = ?;`, [stock.symbol.toUpperCase()], (selErr, row) => {
          if (selErr) {
            return reject(new Error(`Failed to retrieve existing stock ID: ${selErr.message}`));
          }
          if (!row) {
            return reject(new Error(`Stock not found after IGNORE insert for symbol: ${stock.symbol}`));
          }
          resolve(row.id);
        });
      }
    });
  });
}

/**
 * Saves historical daily price data points for a specific stock.
 * 
 * @param {sqlite3.Database} db - Database connection
 * @param {string} symbol - Stock ticker symbol
 * @param {Object[]} dailyData - Array of daily price records
 * @returns {Promise<void>} Resolves when batch insert completes
 */
async function saveStockData(db, symbol, dailyData) {
  // Retrieve stock ID first. If stock metadata doesn't exist, we auto-register it.
  const stockId = await saveStock(db, { symbol, market: symbol.includes('.') ? 'TW' : 'US' });

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Start a transaction to ensure all daily records insert atomically,
      // which improves write speed dramatically compared to individual commits.
      db.run('BEGIN TRANSACTION;');

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO stock_data (stock_id, date, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `);

      let errOccurred = false;

      dailyData.forEach((day) => {
        if (errOccurred) return;
        
        stmt.run(
          [stockId, day.date, day.open, day.high, day.low, day.close, day.volume],
          (runErr) => {
            if (runErr) {
              errOccurred = true;
              db.run('ROLLBACK;');
              stmt.finalize();
              return reject(new Error(`Failed to insert stock price point: ${runErr.message}`));
            }
          }
        );
      });

      if (!errOccurred) {
        stmt.finalize(() => {
          db.run('COMMIT;', (commitErr) => {
            if (commitErr) {
              return reject(new Error(`Transaction commit failed: ${commitErr.message}`));
            }
            resolve();
          });
        });
      }
    });
  });
}

/**
 * Saves a consolidated analysis result for a specific stock and date.
 * 
 * @param {sqlite3.Database} db - Database connection
 * @param {string} symbol - Stock ticker symbol
 * @param {string} date - Date of analysis (YYYY-MM-DD)
 * @param {Object} analysis - Output from performFullAnalysis
 * @param {Object} [analysis.technical] - Technical analysis results
 * @param {Object} [analysis.fundamental] - Fundamental analysis results
 * @param {Object} [analysis.news] - News/sentiment analysis results
 * @param {Object} [analysis.advice] - Recommendation and risk advice
 * @returns {Promise<void>} Resolves when data is written
 */
async function saveAnalysisResults(db, symbol, date, analysis) {
  const stockId = await saveStock(db, { symbol, market: symbol.includes('.') ? 'TW' : 'US' });

  return new Promise((resolve, reject) => {
    const query = `
      INSERT OR REPLACE INTO analysis_results (stock_id, date, technical, fundamental, news, advice, backtest)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    db.run(
      query,
      [
        stockId,
        date,
        analysis.technical ? JSON.stringify(analysis.technical) : null,
        analysis.fundamental ? JSON.stringify(analysis.fundamental) : null,
        analysis.news ? JSON.stringify(analysis.news) : null,
        analysis.advice ? JSON.stringify(analysis.advice) : null,
        analysis.backtest ? JSON.stringify(analysis.backtest) : null
      ],
      (err) => {
        if (err) {
          return reject(new Error(`Failed to save analysis results: ${err.message}`));
        }
        resolve();
      }
    );
  });
}

/**
 * Fetches stock metadata.
 * 
 * @param {sqlite3.Database} db - Database connection
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Stock metadata object or null
 */
function getStock(db, symbol) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM stocks WHERE symbol = ?;`, [symbol.toUpperCase()], (err, row) => {
      if (err) {
        return reject(new Error(`Failed to fetch stock info: ${err.message}`));
      }
      resolve(row || null);
    });
  });
}

/**
 * Fetches historical price data points for a stock.
 * 
 * @param {sqlite3.Database} db - Database connection
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object[]>} Array of historical price data points
 */
function getStockData(db, symbol) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT sd.* FROM stock_data sd
      JOIN stocks s ON sd.stock_id = s.id
      WHERE s.symbol = ?
      ORDER BY sd.date ASC;
    `;
    db.all(query, [symbol.toUpperCase()], (err, rows) => {
      if (err) {
        return reject(new Error(`Failed to fetch stock prices: ${err.message}`));
      }
      resolve(rows || []);
    });
  });
}

/**
 * Fetches the latest analysis report stored for a stock.
 * 
 * @param {sqlite3.Database} db - Database connection
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Consolidated analysis report, or null
 */
function getLatestAnalysisResults(db, symbol) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT ar.* FROM analysis_results ar
      JOIN stocks s ON ar.stock_id = s.id
      WHERE s.symbol = ?
      ORDER BY ar.date DESC
      LIMIT 1;
    `;
    db.get(query, [symbol.toUpperCase()], (err, row) => {
      if (err) {
        return reject(new Error(`Failed to fetch analysis: ${err.message}`));
      }

      if (!row) {
        return resolve(null);
      }

      // De-serialize JSON strings back to native JavaScript objects.
      try {
        resolve({
          id: row.id,
          stockId: row.stock_id,
          date: row.date,
          technical: row.technical ? JSON.parse(row.technical) : null,
          fundamental: row.fundamental ? JSON.parse(row.fundamental) : null,
          news: row.news ? JSON.parse(row.news) : null,
          advice: row.advice ? JSON.parse(row.advice) : null,
          backtest: row.backtest ? JSON.parse(row.backtest) : null
        });
      } catch (parseErr) {
        reject(new Error(`Failed to parse cached analysis JSON data: ${parseErr.message}`));
      }
    });
  });
}

/**
 * Fetches all stocks that have saved analysis reports.
 * 
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<Object[]>} Array of analyzed stock records
 */
function getAllAnalyzedStocks(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT s.symbol, s.name, s.market, ar.date, ar.advice
      FROM analysis_results ar
      JOIN stocks s ON ar.stock_id = s.id
      GROUP BY s.symbol
      ORDER BY ar.date DESC;
    `;
    db.all(query, [], (err, rows) => {
      if (err) {
        return reject(new Error(`Failed to fetch analyzed stocks: ${err.message}`));
      }
      resolve(
        (rows || []).map(row => {
          try {
            return {
              symbol: row.symbol,
              name: row.name,
              market: row.market,
              date: row.date,
              advice: row.advice ? JSON.parse(row.advice) : null
            };
          } catch (e) {
            return {
              symbol: row.symbol,
              name: row.name,
              market: row.market,
              date: row.date,
              advice: null
            };
          }
        })
      );
    });
  });
}

/**
 * Retrieves the maximum date of price data stored in database.
 * 
 * Why:
 * We need to find the latest synced date to perform incremental sync and avoid fetching 
 * or saving duplicate historical data from external APIs.
 * 
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
 * 
 * Why:
 * Wrapping individual inserts in a transaction (BEGIN/COMMIT) improves SQLite write performance
 * dramatically for batch inserts. Using INSERT OR IGNORE ensures we don't crash on existing records.
 * 
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
      
      let errorOccurred = null;
      for (const p of prices) {
        stmt.run([stockId, p.date, p.open, p.high, p.low, p.close, p.volume], (err) => {
          if (err) {
            errorOccurred = err;
          }
        });
      }
      
      stmt.finalize((err) => {
        if (err || errorOccurred) {
          db.run("ROLLBACK;");
          return reject(err || errorOccurred);
        }
        db.run("COMMIT;", (commitErr) => {
          if (commitErr) {
            db.run("ROLLBACK;");
            return reject(commitErr);
          }
          resolve();
        });
      });
    });
  });
}

/**
 * Retrieves 3 years of local historical prices.
 * 
 * Why:
 * Fetching prices sorted by date in ascending order is critical for subsequent technical 
 * analysis indicators (e.g. SMA, MACD) which rely on historical sequence.
 * 
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

/**
 * Retrieves the latest backtest results for all stocks in the database.
 * 
 * Why:
 * Uses SQLite window function (ROW_NUMBER() OVER PARTITION BY stock_id ORDER BY date DESC)
 * to group analysis results per stock and extract only the latest date record (rank = 1),
 * avoiding slow subqueries or returning redundant older historical backtest runs.
 * 
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<Object[]>} Array of objects with symbol and backtest data
 */
function getLatestBacktestResults(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT symbol, backtest, date
      FROM (
        SELECT 
          s.symbol, 
          ar.backtest, 
          ar.date,
          ROW_NUMBER() OVER (PARTITION BY ar.stock_id ORDER BY ar.date DESC) as rank
        FROM analysis_results ar
        JOIN stocks s ON ar.stock_id = s.id
      )
      WHERE rank = 1;
    `;
    db.all(query, [], (err, rows) => {
      if (err) {
        return reject(new Error(`Failed to fetch latest backtest results: ${err.message}`));
      }
      const results = [];
      for (const row of rows || []) {
        if (!row.backtest) continue;
        try {
          const backtestData = JSON.parse(row.backtest);
          // Only include if it has backtest metrics
          if (backtestData && typeof backtestData.winRate5d === 'number') {
            results.push({
              symbol: row.symbol,
              rate: backtestData.winRate5d,
              ret: backtestData.avgReturn5d || 0,
              date: row.date
            });
          }
        } catch (e) {
          // Ignore parse errors for individual rows to be resilient
        }
      }
      resolve(results);
    });
  });
}

/**
 * Retrieves cached market funds flow report for a given market and date.
 * 
 * @param {sqlite3.Database} db 
 * @param {string} market - 'US' or 'TW'
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Object|null>}
 */
function getMarketFundsFlow(db, market, date) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM market_funds_flow WHERE market = ? AND date = ?;`,
      [market, date],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

/**
 * Saves a new market funds flow report.
 * 
 * @param {sqlite3.Database} db 
 * @param {Object} data
 * @param {string} data.market
 * @param {string} data.date
 * @param {string} data.prompt
 * @param {string} data.content
 * @returns {Promise<void>}
 */
function saveMarketFundsFlow(db, data) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO market_funds_flow (market, date, prompt, content) VALUES (?, ?, ?, ?);`,
      [data.market, data.date, data.prompt, data.content],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}


/**
 * Retrieves a cached prompt analysis result.
 *
 * @param {sqlite3.Database} db - Database connection
 * @param {string} symbol - Stock ticker
 * @param {string} analysis_type - Type of analysis, e.g., 'fundamental'
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {Promise<string|null>} Markdown content or null if not found
 */
function getPromptAnalysis(db, symbol, analysis_type, date) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT content FROM stock_prompt_analysis WHERE symbol = ? AND analysis_type = ? AND date = ?;`,
      [symbol.toUpperCase(), analysis_type, date],
      (err, row) => {
        if (err) return reject(new Error(`Failed to fetch prompt analysis: ${err.message}`));
        resolve(row ? row.content : null);
      }
    );
  });
}

/**
 * Saves a prompt analysis result.
 *
 * @param {sqlite3.Database} db - Database connection
 * @param {string} symbol - Stock ticker
 * @param {string} analysis_type - Type of analysis
 * @param {string} date - ISO date
 * @param {string} content - Generated Markdown
 * @returns {Promise<void>}
 */
function savePromptAnalysis(db, symbol, analysis_type, date, content) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO stock_prompt_analysis (symbol, analysis_type, date, content) VALUES (?, ?, ?, ?);`,
      [symbol.toUpperCase(), analysis_type, date, content],
      (err) => {
        if (err) return reject(new Error(`Failed to save prompt analysis: ${err.message}`));
        resolve();
      }
    );
  });
}

/**
 * Retrieves the latest cached market overview metrics (within 24 hours).
 */
function getMarketOverviewMetrics(db) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM market_overview_metrics WHERE updated_at >= datetime('now', '-24 hours') ORDER BY id DESC LIMIT 1;`,
      [],
      (err, row) => {
        if (err) return reject(new Error(`Failed to fetch market metrics: ${err.message}`));
        resolve(row || null);
      }
    );
  });
}

/**
 * Saves market overview metrics into the database.
 */
function saveMarketOverviewMetrics(db, metrics) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO market_overview_metrics (fear_greed_score, fear_greed_text, vix_value, vix_text, win_rate) VALUES (?, ?, ?, ?, ?);`,
      [
        metrics.fear_greed_score,
        metrics.fear_greed_text,
        metrics.vix_value,
        metrics.vix_text,
        metrics.win_rate
      ],
      (err) => {
        if (err) return reject(new Error(`Failed to save market metrics: ${err.message}`));
        resolve();
      }
    );
  });
}

module.exports = {
  saveStock,
  saveStockData,
  saveAnalysisResults,
  getStock,
  getStockData,
  getLatestAnalysisResults,
  getAllAnalyzedStocks,
  getMaxPriceDate,
  insertStockDataBatch,
  getHistoricalPricesFromDB,
  getLatestBacktestResults,
  getMarketFundsFlow,
  saveMarketFundsFlow,
  getPromptAnalysis,
  savePromptAnalysis,
  getMarketOverviewMetrics,
  saveMarketOverviewMetrics
};


