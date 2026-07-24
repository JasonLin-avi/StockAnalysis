// scripts/test-turso-cloud.js
// Script to test connection to remote Turso database using credentials in .env.local

const fs = require('fs');
const path = require('path');

// 1. Manually parse .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalsIdx = trimmed.indexOf('=');
      if (equalsIdx > 0) {
        const key = trimmed.slice(0, equalsIdx).trim();
        let value = trimmed.slice(equalsIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

console.log('--- Testing Turso Cloud DB Connection ---');
console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL || '(not set)');
console.log('TURSO_AUTH_TOKEN length:', process.env.TURSO_AUTH_TOKEN ? process.env.TURSO_AUTH_TOKEN.length : 0);

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('Error: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in environment.');
  process.exit(1);
}

const { connectToDatabase } = require('../src/lib/database/connection');

async function testTurso() {
  try {
    console.log('Connecting to database (applying schema to Turso remote)...');
    const db = await connectToDatabase('data/stock.db');
    console.log('Connection and schema application successful!');

    // Test Write & Read on remote database
    const testSymbol = 'TURSO_TEST_' + Date.now();
    console.log(`Writing test record to stocks table: ${testSymbol}`);

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO stocks (symbol, name, market) VALUES (?, ?, ?);',
        [testSymbol, 'Turso Cloud Test Stock', 'US'],
        function(err) {
          if (err) return reject(err);
          console.log(`Inserted row with ID: ${this.lastID}`);
          resolve();
        }
      );
    });

    console.log(`Reading back test record from stocks table...`);
    const row = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM stocks WHERE symbol = ?;',
        [testSymbol],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    console.log('Retrieved row:', row);

    if (row && row.symbol === testSymbol) {
      console.log('SUCCESS: Turso Cloud DB Write & Read verified!');
    } else {
      throw new Error('Retrieved row does not match inserted test record');
    }

    // Clean up test row
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM stocks WHERE symbol = ?;',
        [testSymbol],
        (err) => {
          if (err) return reject(err);
          console.log('Cleaned up test record.');
          resolve();
        }
      );
    });

    db.close((err) => {
      if (err) console.error('Error closing DB:', err);
      else console.log('Database connection closed.');
      process.exit(0);
    });

  } catch (error) {
    console.error('Turso DB Test Failed:', error);
    process.exit(1);
  }
}

testTurso();
