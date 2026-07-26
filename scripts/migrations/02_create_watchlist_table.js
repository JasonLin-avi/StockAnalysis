// Why: Replace native sqlite3 driver with libsql-adapter for database migration script.
// Uses import.meta.url + fileURLToPath for ESM __dirname equivalent.
import sqlite3 from '../../src/external/database/libsql-adapter.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Why: ESM doesn't have __dirname. Use import.meta.url to derive the directory path.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
