import sqlite3 from 'sqlite3';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


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
