/**
 * Database Connection Module
 *
 * Dual-mode: SQLite (default) or PostgreSQL (when DATABASE_URL is set).
 *
 * API:
 *   db.prepare(sql).run(...params)   → { changes, lastInsertRowid }
 *   db.prepare(sql).get(...params)   → row | undefined
 *   db.prepare(sql).all(...params)   → [rows]
 *   db.exec(sql)                     → void
 *   db.healthCheck()                 → boolean
 *   db.close()                       → void
 *   db._type                         → 'sqlite' | 'pg'
 *
 * For SQLite: methods return synchronously (plain values).
 * For PostgreSQL: methods return Promises (async).
 * Use `await` in handlers — it works on both sync values and Promises.
 *
 * Auto-converts ? → $1,$2 for PG.
 * Auto-appends RETURNING id to INSERT queries for lastInsertRowid.
 */

const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;

// ─── PostgreSQL Mode ─────────────────────────────────────────────

function createPgAdapter() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: parseInt(process.env.PG_POOL_MAX || '20'),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on('error', (err) => console.error('PG pool error:', err.message));
  console.log('🐘 PostgreSQL adapter initialized');

  function convertPlaceholders(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  function maybeAddReturning(sql) {
    const trimmed = sql.trim();
    if (/^\s*INSERT\s/i.test(trimmed) && !/\bRETURNING\b/i.test(trimmed)) {
      return trimmed + ' RETURNING id';
    }
    return trimmed;
  }

  function prepare(sql) {
    return {
      run(...params) {
        const finalSql = convertPlaceholders(maybeAddReturning(sql));
        return pool.query(finalSql, params).then(result => ({
          changes: result.rowCount,
          lastInsertRowid: result.rows[0]?.id !== undefined ? Number(result.rows[0].id) : undefined,
        }));
      },
      get(...params) {
        return pool.query(convertPlaceholders(sql), params).then(r => r.rows[0] || undefined);
      },
      all(...params) {
        return pool.query(convertPlaceholders(sql), params).then(r => r.rows);
      },
    };
  }

  function exec(sql) {
    const statements = sql.split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/).map(s => s.trim()).filter(s => s.length > 0);
    return (async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const stmt of statements) await client.query(stmt);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally { client.release(); }
    })();
  }

  function pragma() {}
  function close() { return pool.end(); }
  function healthCheck() { return pool.query('SELECT 1').then(() => true).catch(() => false); }

  return { prepare, exec, pragma, close, healthCheck, _type: 'pg' };
}

// ─── SQLite Mode ─────────────────────────────────────────────────

function createSqliteAdapter() {
  const Database = require('better-sqlite3');
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/company-os.db');
  const actualPath = process.env.NODE_ENV === 'test' && process.env.TEST_DB_PATH ? process.env.TEST_DB_PATH : DB_PATH;
  const dbDir = path.dirname(actualPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const db = new Database(actualPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('mmap_size = 268435456');
  console.log('📦 SQLite adapter initialized:', actualPath);

  function prepare(sql) {
    const stmt = db.prepare(sql);
    return {
      run(...params) {
        const result = stmt.run(...params);
        return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
      },
      get(...params) { return stmt.get(...params); },
      all(...params) { return stmt.all(...params); },
    };
  }

  function exec(sql) { db.exec(sql); }
  function pragma(name) { db.pragma(name); }
  function close() { db.close(); }
  function healthCheck() { try { db.prepare('SELECT 1').get(); return true; } catch { return false; } }

  return { prepare, exec, pragma, close, healthCheck, _type: 'sqlite' };
}

// ─── Export ──────────────────────────────────────────────────────

const db = DATABASE_URL ? createPgAdapter() : createSqliteAdapter();
module.exports = db;
