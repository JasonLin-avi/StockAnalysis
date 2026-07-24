// tests/unit/libsql-adapter.test.js
// Verify sqlite3-compatible API behavior over @libsql/client in-memory mode.
const { Database } = require('../../src/lib/database/libsql-adapter');

describe("Libsql Adapter - sqlite3 Compatibility API", () => {
  let db;

  beforeEach((done) => {
    // Initialize adapter in memory mode for isolated test execution
    db = new Database(':memory:', (err) => {
      expect(err).toBeNull();
      done();
    });
  });

  afterEach((done) => {
    // Clean up database connection to prevent resource leaks across tests
    db.close((err) => {
      expect(err).toBeNull();
      done();
    });
  });

  test("should execute basic table creation and query (all/get/run)", (done) => {
    db.serialize(() => {
      db.run("CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT);", (err) => {
        expect(err).toBeNull();
      });

      db.run("INSERT INTO test_table (name) VALUES (?), (?);", ["Alice", "Bob"], function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(2);
        // Convert bigint lastInsertRowid from libsql client to Number for backward compatibility with sqlite3
        expect(this.lastID).toBeGreaterThan(0);
      });

      db.get("SELECT id, name FROM test_table WHERE id = ?;", [1], (err, row) => {
        expect(err).toBeNull();
        expect(row).toEqual({ id: 1, name: "Alice" });
      });

      db.all("SELECT id, name FROM test_table ORDER BY id ASC;", (err, rows) => {
        expect(err).toBeNull();
        expect(rows).toEqual([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);
        done();
      });
    });
  });

  test("should support prepared statements (prepare/finalize)", (done) => {
    db.run("CREATE TABLE prep_table (id INTEGER PRIMARY KEY, score REAL);", (err) => {
      expect(err).toBeFalsy();

      const stmt = db.prepare("INSERT INTO prep_table (score) VALUES (?);");
      stmt.run([85.5], function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
      });
      stmt.run([92.0]);

      stmt.finalize((err) => {
        expect(err).toBeFalsy();
        // Verify prepared statements successfully inserted data in correct order
        db.all("SELECT id, score FROM prep_table ORDER BY id ASC;", (err, rows) => {
          expect(err).toBeNull();
          expect(rows).toEqual([{ id: 1, score: 85.5 }, { id: 2, score: 92.0 }]);
          done();
        });
      });
    });
  });

  test("should handle lastID === 0 correctly when inserting explicit id 0", (done) => {
    db.run("CREATE TABLE zero_table (id INTEGER PRIMARY KEY, name TEXT);", (err) => {
      expect(err).toBeNull();
      db.run("INSERT INTO zero_table (id, name) VALUES (0, 'Zero');", function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBe(0);
        done();
      });
    });
  });

  test("should handle Statement.run error gracefully without UnhandledPromiseRejection", (done) => {
    const stmt = db.prepare("INSERT INTO nonexistent_table (col) VALUES (?);");
    stmt.run([123], (err) => {
      expect(err).toBeTruthy();
      stmt.finalize((err) => {
        expect(err).toBeNull();
        done();
      });
    });
  });

  test("should support sqlite3 transaction API pattern (BEGIN/COMMIT) via buffering", (done) => {
    db.run("CREATE TABLE tx_table (id INTEGER PRIMARY KEY, item TEXT);", (err) => {
      expect(err).toBeNull();

      db.run("BEGIN TRANSACTION;", (err) => {
        expect(err).toBeNull();
      });

      db.run("INSERT INTO tx_table (item) VALUES (?);", ["Sword"], (err) => {
        expect(err).toBeNull();
      });

      const stmt = db.prepare("INSERT INTO tx_table (item) VALUES (?);");
      stmt.run(["Shield"]);
      stmt.finalize((err) => {
        expect(err).toBeFalsy();
      });

      db.run("COMMIT;", function(err) {
        expect(err).toBeNull();
        db.all("SELECT id, item FROM tx_table ORDER BY id ASC;", (err, rows) => {
          expect(err).toBeNull();
          expect(rows).toEqual([{ id: 1, item: "Sword" }, { id: 2, item: "Shield" }]);
          done();
        });
      });
    });
  });
});
