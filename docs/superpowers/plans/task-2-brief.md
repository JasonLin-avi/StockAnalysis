### Task 2: Watchlist API Endpoint

**Files:**
- Create: `src/app/api/watchlist/route.js`
- Test: `tests/api/watchlist-api.test.js`

**Interfaces:**
- Produces: API endpoint `/api/watchlist` handling GET (returns array of symbols) and POST (adds symbol).

- [ ] **Step 1: Write the failing test**

```javascript
// tests/api/watchlist-api.test.js
import { GET, POST } from '../../src/app/api/watchlist/route';

describe('Watchlist API', () => {
  it('returns empty array initially', async () => {
    const req = new Request('http://localhost/api/watchlist');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/api/watchlist-api.test.js`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/app/api/watchlist/route.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { NextResponse } from 'next/server';

const getDb = () => {
  // Why: Using an absolute path ensures the connection resolves correctly from any working directory in Next.js.
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');
  return new sqlite3.Database(dbPath);
};

export async function GET() {
  return new Promise((resolve) => {
    const db = getDb();
    db.all("SELECT symbol FROM watchlist ORDER BY added_at DESC", [], (err, rows) => {
      db.close();
      if (err) {
        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
        return;
      }
      resolve(NextResponse.json(rows.map(row => row.symbol)));
    });
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const symbol = body.symbol;
    if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    
    return new Promise((resolve) => {
      const db = getDb();
      db.run("INSERT OR IGNORE INTO watchlist (symbol) VALUES (?)", [symbol], function(err) {
        db.close();
        if (err) {
          resolve(NextResponse.json({ error: err.message }, { status: 500 }));
          return;
        }
        resolve(NextResponse.json({ success: true }));
      });
    });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/api/watchlist-api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/watchlist/route.js tests/api/watchlist-api.test.js
git commit -m "feat: implement watchlist API endpoint"
```
