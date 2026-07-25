// Why: Replace native sqlite3 driver with libsql-adapter for database migration script.
const sqlite3 = require('../../src/external/database/libsql-adapter');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT UNIQUE NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating watchlist table:', err);
      process.exit(1);
    }
    console.log('Watchlist table created successfully.');
    db.close();
  });
});
