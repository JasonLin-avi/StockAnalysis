### Task 1: Database Migration for Watchlist

**Files:**
- Create: `scripts/migrations/02_create_watchlist_table.js`
- Test: `tests/unit/watchlist-migration.test.js`

**Interfaces:**
- Produces: SQLite table `watchlist` with columns `id` (INTEGER PK), `symbol` (TEXT UNIQUE), `added_at` (DATETIME).

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/watchlist-migration.test.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '../../test-watchlist.db');

describe('Watchlist Migration', () => {
  let db;

  beforeAll(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    // Run migration script directly on test db
    process.env.DB_PATH = dbPath;
    try {
      execSync('node scripts/migrations/02_create_watchlist_table.js', { env: process.env });
    } catch (e) {} // Will fail initially
    db = new sqlite3.Database(dbPath);
  });

  afterAll((done) => {
    db.close(() => {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      done();
    });
  });

  it('creates the watchlist table', (done) => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='watchlist'", (err, row) => {
      expect(err).toBeNull();
      expect(row).toBeDefined();
      expect(row.name).toBe('watchlist');
      done();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/watchlist-migration.test.js`
Expected: FAIL with "Expected value to be defined, instead received undefined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// scripts/migrations/02_create_watchlist_table.js
const sqlite3 = require('sqlite3').verbose();
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/watchlist-migration.test.js`
Expected: PASS

- [ ] **Step 5: Apply migration to local DB**

Run: `node scripts/migrations/02_create_watchlist_table.js`

- [ ] **Step 6: Commit**

```bash
git add scripts/migrations/02_create_watchlist_table.js tests/unit/watchlist-migration.test.js
git commit -m "feat: add watchlist database migration"
```
