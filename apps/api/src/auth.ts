import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { LegacyIdentity } from '@secret-santa/shared/contracts';
import { signingSecret } from './config.ts';
import { get } from './db.ts';

const SECRET = signingSecret();
const DEFAULT_TTL = Number(process.env.SECRET_SANTA_TOKEN_TTL ?? 604800);

export type TokenKind = 'session' | 'invite' | 'member';

export interface TokenPayload {
  kind: TokenKind;
  roomId: string;
  memberId?: string;
  sessionId?: string;
  exp: number;
}

export function ttlSeconds(): number {
  return Number.isFinite(DEFAULT_TTL) && DEFAULT_TTL > 0 ? DEFAULT_TTL : 604800;
}

export function signToken(payload: TokenPayload, secret = SECRET): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyToken(token: string, secret = SECRET): TokenPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

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

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface LegacyTokenRow {
  kind: 'session' | 'invite' | 'member';
  room_id: string;
  member_id: string | null;
  session_id: string | null;
  new_token: string | null;
}

/** Находит соответствие для токена, выданного v68. */
export function legacyRecord(token: string): LegacyTokenRow | null {
  if (!token || token.includes('.')) return null;
  try {
    return get<LegacyTokenRow>(
      'SELECT kind, room_id, member_id, session_id, new_token FROM legacy_token_map WHERE old_hash = ?',
      hashToken(token),
    ) ?? null;
  } catch {
    return null;
  }
}

export function legacyIdentity(token: string): LegacyIdentity | null {
  const row = legacyRecord(token);
  if (!row) return null;
  return {
    kind: row.kind,
    roomId: row.room_id,
    memberId: row.member_id ?? undefined,
    sessionId: row.session_id ?? undefined,
  };
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString('hex')}`;
}

export function newRoomCode(): string {
  return `SANTA-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export function expiresAt(seconds = ttlSeconds()): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}
