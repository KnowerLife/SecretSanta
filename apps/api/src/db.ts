import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export type SqlParam = string | number | bigint | null | Uint8Array;

const defaultPath = fileURLToPath(new URL('../data/app.db', import.meta.url));
export const dbPath = process.env.SECRET_SANTA_V69_DB_PATH ?? defaultPath;

mkdirSync(dirname(dbPath), { recursive: true });
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
db.exec(
  'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
);

const migrationsDir = fileURLToPath(new URL('../migrations/', import.meta.url));
const applied = new Set(
  (db.prepare('SELECT name FROM schema_migrations').all() as Array<{ name: string }>).map(
    (row) => row.name,
  ),
);

for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
  if (applied.has(file)) continue;
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  db.exec(sql);
  db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(
    file,
    new Date().toISOString(),
  );
}

export function all<T>(sql: string, ...params: SqlParam[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function get<T>(sql: string, ...params: SqlParam[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, ...params: SqlParam[]): void {
  db.prepare(sql).run(...params);
}

export function databaseReady(): boolean {
  return existsSync(dbPath);
}
