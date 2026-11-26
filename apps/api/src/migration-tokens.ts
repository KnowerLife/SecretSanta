import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import type { TokenPayload } from './auth.ts';
import { signingSecret } from './config.ts';

export type LegacyTokenKind = 'session' | 'invite' | 'member';

export interface LegacyTokenResolution {
  kind: LegacyTokenKind;
  roomId: string;
  memberId: string | null;
  sessionId: string | null;
}

/** DDL shared by the migration CLI and by tests that build a v69 database. */
export const LEGACY_TOKEN_MAP_DDL = `CREATE TABLE IF NOT EXISTS legacy_token_map (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  old_hash TEXT NOT NULL UNIQUE,
  room_id TEXT,
  member_id TEXT,
  session_id TEXT,
  new_token TEXT,
  created_at TEXT
)`;

export function defaultV69DbPath(): string {
  return process.env.SECRET_SANTA_V69_DB_PATH ?? fileURLToPath(new URL('../data/app.db', import.meta.url));
}

/** SHA-256 of a raw token string, using the same convention as v68 and v69. */
export function hashLegacyToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Local copy of the auth.ts signing convention (`kind roomId memberId
 * sessionId exp`). Importing auth.ts from a migration CLI would also open the
 * runtime database via db.ts, so the CLI deliberately stays independent.
 */
export function signV69Token(payload: TokenPayload): string {
  const secret = signingSecret();
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyV69Token(token: string): TokenPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const secret = signingSecret();
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.kind || !payload.roomId || !payload.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Resolve a raw v68 token (invite link, member link or bearer session token) to
 * the v69 identity it was reissued for. The map lives in the v69 database at
 * `dbPath`; the source database is never consulted here.
 */
export function resolveLegacyToken(
  token: string,
  dbPath: string = defaultV69DbPath(),
): LegacyTokenResolution | null {
  if (!token || !existsSync(dbPath)) return null;

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const row = db
      .prepare(
        'SELECT kind, room_id, member_id, session_id FROM legacy_token_map WHERE old_hash = ?',
      )
      .get(hashLegacyToken(token)) as
      | { kind: string; room_id: string | null; member_id: string | null; session_id: string | null }
      | undefined;
    if (!row || !row.room_id) return null;
    return {
      kind: row.kind as LegacyTokenKind,
      roomId: row.room_id,
      memberId: row.member_id ?? null,
      sessionId: row.session_id ?? null,
    };
  } catch {
    // A fresh v69 database has no legacy map yet.
    return null;
  } finally {
    db.close();
  }
}
