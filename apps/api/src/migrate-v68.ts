/**
 * One-way v68 -> v69 SQLite migration.
 *
 * The v68 file is opened read-only and checksummed before/after; the v69 file
 * is a separate database (SECRET_SANTA_V69_DB_PATH). All writes happen inside
 * a single transaction and are rolled back on a counter mismatch.
 */
import { createHash, createHmac } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { assertProductionSecret, signingSecret } from './config.ts';
import { hashLegacyToken, LEGACY_TOKEN_MAP_DDL, signV69Token } from './migration-tokens.ts';
import type { LegacyTokenKind } from './migration-tokens.ts';

type Row = Record<string, unknown> & { _rowid?: number };

const PROJECT_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DEFAULT_SOURCE = join(PROJECT_ROOT, 'backend/data/app.db');
const DEFAULT_TARGET = join(PROJECT_ROOT, 'apps/api/data/app.db');
const V69_SCHEMA = fileURLToPath(new URL('../migrations/001_init.sql', import.meta.url));
const FAR_FUTURE = '2099-12-31T23:59:59.000Z';
const INVITE_TTL = 60 * 60 * 24 * 30;
const MEMBER_TTL = 60 * 60 * 24 * 365;
const SESSION_TTL = 60 * 60 * 24 * 7;
/** Below the Date.now() * 1000 ids emitted by the v69 runtime, so SSE replay stays ordered. */
const EVENT_ID_BASE = 1_000_000_000_000;

const EVENT_TYPE_RENAMES: Record<string, string> = {
  'room.draw_completed': 'room.drawn',
  'room.gift_status_updated': 'room.gift_status',
};

const JOB_STATUS_RENAMES: Record<string, string> = {
  pending: 'queued',
  processing: 'queued',
  sent: 'sent',
  failed: 'failed',
  cancelled: 'cancelled',
};

export interface MigrationOptions {
  source: string;
  target: string;
  dryRun?: boolean;
}

export interface MigrationResult {
  dryRun: boolean;
  source: string;
  target: string;
  sourceSha256Before: string;
  sourceSha256After: string;
  counters: Record<string, number>;
  reissuedTokens: Record<LegacyTokenKind, number>;
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

export interface V68SessionTokenInput {
  sessionId: string;
  roomId: string;
  memberId: string;
  userId: string | null;
  role: string;
  createdAt: string;
  expiresAt: string | null;
}

function defaultTokenTtl(): number {
  const ttl = Number(process.env.SECRET_SANTA_TOKEN_TTL ?? 604800);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 604800;
}

function epochSeconds(value: unknown, fallback: number): number {
  if (typeof value === 'string' && value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed / 1000);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  return fallback;
}

/**
 * Rebuild the exact bearer string issued by backend/app/auth.py:sign_token:
 * sorted compact JSON, base64url body, HMAC-SHA256 of that body. Only used to
 * key the legacy map - the v68 database never stored raw session tokens.
 */
export function reconstructV68SessionToken(
  input: V68SessionTokenInput,
  secret = signingSecret(),
  ttl = defaultTokenTtl(),
): string {
  const iat = epochSeconds(input.createdAt, Math.floor(Date.now() / 1000));
  const exp = epochSeconds(input.expiresAt, iat + ttl);
  const payload = {
    exp,
    iat,
    member_id: input.memberId,
    role: input.role,
    room_id: input.roomId,
    sid: input.sessionId,
    user_id: input.userId,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sameFile(a: string, b: string): boolean {
  if (resolve(a) === resolve(b)) return true;
  try {
    const left = statSync(a);
    const right = statSync(b);
    return left.dev === right.dev && left.ino === right.ino;
  } catch {
    return false;
  }
}

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return fallback;
}

function nullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const result = text(value);
  return result === '' ? null : result;
}

function integer(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return fallback;
}

function rows(db: DatabaseSync, table: string): Row[] {
  const exists = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { present: number } | undefined;
  if (!exists) return [];
  return db.prepare(`SELECT rowid AS _rowid, * FROM "${table}" ORDER BY rowid`).all() as Row[];
}

function tokenExpiration(row: Row, ttl: number): number {
  const created = epochSeconds(row.created_at, Math.floor(Date.now() / 1000));
  return epochSeconds(row.expires_at, created + ttl);
}

function buildProfileJson(row: Row): string {
  const fields: Array<[keyof Row, string]> = [
    ['address', 'address'],
    ['profile_note', 'note'],
    ['anti_wishlist', 'antiWishlist'],
    ['size', 'size'],
    ['links', 'links'],
    ['allergies', 'allergies'],
  ];
  const profile: Record<string, string> = {};
  for (const [source, target] of fields) {
    const value = nullableText(row[source]);
    if (value !== null) profile[target] = value;
  }
  return JSON.stringify(profile);
}

interface LegacyTokenRow {
  id: string;
  kind: LegacyTokenKind;
  oldHash: string;
  roomId: string;
  memberId: string | null;
  sessionId: string | null;
  newToken: string;
  createdAt: string;
}

function applyV69Schema(db: DatabaseSync): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  db.prepare('INSERT OR IGNORE INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(
    '001_init.sql',
    new Date().toISOString(),
  );
  db.exec(readFileSync(V69_SCHEMA, 'utf8'));
  db.exec(LEGACY_TOKEN_MAP_DDL);
}

function countByIds(db: DatabaseSync, table: string, column: string, ids: string[]): number {
  let total = 0;
  for (let offset = 0; offset < ids.length; offset += 400) {
    const chunk = ids.slice(offset, offset + 400);
    const placeholders = chunk.map(() => '?').join(', ');
    const found = db
      .prepare(`SELECT COUNT(*) AS n FROM "${table}" WHERE "${column}" IN (${placeholders})`)
      .get(...chunk) as { n: number };
    total += integer(found.n, 0);
  }
  return total;
}

export function runMigration(options: MigrationOptions): MigrationResult {
  assertProductionSecret();
  const source = resolve(options.source);
  const target = resolve(options.target);
  const dryRun = options.dryRun === true;

  if (!existsSync(source)) throw new MigrationError(`source database not found: ${source}`);
  if (sameFile(source, target)) {
    throw new MigrationError('target must be a separate v69 database, not the v68 source');
  }
  if (!dryRun) mkdirSync(dirname(target), { recursive: true });

  const sourceSha256Before = sha256File(source);
  const sourceDb = new DatabaseSync(source, { readOnly: true });
  const targetDb = dryRun
    ? new DatabaseSync(':memory:')
    : new DatabaseSync(target, { readOnly: false });

  try {
    targetDb.exec('PRAGMA foreign_keys = ON');
    targetDb.exec('BEGIN IMMEDIATE');

    applyV69Schema(targetDb);

    const rooms = rows(sourceDb, 'rooms');
    const members = rows(sourceDb, 'room_members');
    const invites = rows(sourceDb, 'room_invites');
    const memberTokens = rows(sourceDb, 'member_access_tokens');
    const sessions = rows(sourceDb, 'auth_sessions');
    const exclusions = rows(sourceDb, 'exclusions');
    const drawRuns = rows(sourceDb, 'draw_runs');
    const assignments = rows(sourceDb, 'assignments');
    const wishlists = rows(sourceDb, 'wishlist_items');
    const messages = rows(sourceDb, 'messages');
    const events = rows(sourceDb, 'room_events');
    const pushSubscriptions = rows(sourceDb, 'push_subscriptions');
    const notificationJobs = rows(sourceDb, 'notification_jobs');

    const memberById = new Map(members.map((row) => [text(row.id), row]));
    const roomById = new Map(rooms.map((row) => [text(row.id), row]));
    const runIds = new Set(drawRuns.map((row) => text(row.id)));
    const seenLegacyHashes = new Set<string>();
    const legacyTokenIds: string[] = [];

    const insertRoom = targetDb.prepare(
      `INSERT OR IGNORE INTO rooms
        (id, code, name, event_date, budget_min, budget_max, theme, organizer_member_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertMember = targetDb.prepare(
      `INSERT OR IGNORE INTO members
        (id, room_id, name, role, token_hash, gift_status, profile_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertInvite = targetDb.prepare(
      `INSERT OR IGNORE INTO invites
        (id, room_id, token_hash, role, label, max_uses, uses, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertSession = targetDb.prepare(
      `INSERT OR IGNORE INTO auth_sessions
        (id, room_id, member_id, token_hash, created_at, expires_at, revoked, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertExclusion = targetDb.prepare(
      `INSERT OR IGNORE INTO exclusions
        (id, room_id, member_a, member_b, group_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertRun = targetDb.prepare(
      `INSERT OR IGNORE INTO draw_runs
        (id, room_id, algorithm_version, created_by, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const insertAssignment = targetDb.prepare(
      `INSERT OR IGNORE INTO assignments (id, run_id, room_id, santa_id, recipient_id)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const insertWishlist = targetDb.prepare(
      `INSERT OR IGNORE INTO wishlist_items (id, room_id, member_id, text, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const insertMessage = targetDb.prepare(
      `INSERT OR IGNORE INTO messages
        (id, room_id, run_id, channel, from_member, to_member, text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertEvent = targetDb.prepare(
      `INSERT OR IGNORE INTO room_events (id, room_id, type, actor, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertPush = targetDb.prepare(
      `INSERT OR IGNORE INTO push_subscriptions (endpoint, room_id, member_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const insertJob = targetDb.prepare(
      `INSERT OR IGNORE INTO notification_jobs
        (id, room_id, channel, kind, payload_json, scheduled_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertLegacyToken = targetDb.prepare(
      `INSERT OR IGNORE INTO legacy_token_map
        (id, kind, old_hash, room_id, member_id, session_id, new_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    function addLegacyToken(row: LegacyTokenRow): void {
      if (seenLegacyHashes.has(row.oldHash)) {
        throw new MigrationError('legacy token hash collision in source database');
      }
      seenLegacyHashes.add(row.oldHash);
      legacyTokenIds.push(row.id);
      insertLegacyToken.run(
        row.id,
        row.kind,
        row.oldHash,
        row.roomId,
        row.memberId,
        row.sessionId,
        row.newToken,
        row.createdAt,
      );
    }

    for (const room of rooms) {
      insertRoom.run(
        text(room.id),
        text(room.code).toUpperCase(),
        text(room.name),
        nullableText(room.event_date),
        integer(room.budget_min, 0),
        integer(room.budget_max, 0),
        nullableText(room.theme),
        nullableText(room.organizer_member_id),
        text(room.status, 'active'),
        text(room.created_at) || new Date().toISOString(),
      );
    }

    // New invite/member tokens are deterministic: their exp comes from the old
    // row, so a repeated migration reissues the exact same signed strings.
    const inviteTokenByInviteId = new Map<string, string>();
    for (const invite of invites) {
      const id = text(invite.id);
      const roomId = text(invite.room_id);
      const oldHash = text(invite.token_hash).toLowerCase();
      if (!oldHash) throw new MigrationError('invite without token hash');
      const newToken = signV69Token({ kind: 'invite', roomId, exp: tokenExpiration(invite, INVITE_TTL) });
      inviteTokenByInviteId.set(id, newToken);
      addLegacyToken({
        id: `leg_inv_${id}`,
        kind: 'invite',
        oldHash,
        roomId,
        memberId: null,
        sessionId: null,
        newToken,
        createdAt: text(invite.created_at) || new Date().toISOString(),
      });
    }

    const primaryMemberTokenByMemberId = new Map<string, string>();
    const sortedMemberTokens = [...memberTokens].sort((a, b) => {
      const left = text(a.last_used_at) || text(a.created_at);
      const right = text(b.last_used_at) || text(b.created_at);
      if (left !== right) return left < right ? -1 : 1;
      return integer(a._rowid, 0) - integer(b._rowid, 0);
    });
    for (const token of sortedMemberTokens) {
      const memberId = text(token.member_id);
      const roomId = text(token.room_id);
      const oldHash = text(token.token_hash).toLowerCase();
      if (!oldHash) throw new MigrationError('member token without token hash');
      const newToken = signV69Token({
        kind: 'member',
        roomId,
        memberId,
        exp: tokenExpiration(token, MEMBER_TTL),
      });
      primaryMemberTokenByMemberId.set(memberId, newToken);
      addLegacyToken({
        id: `leg_mem_${text(token.id)}`,
        kind: 'member',
        oldHash,
        roomId,
        memberId,
        sessionId: null,
        newToken,
        createdAt: text(token.created_at) || new Date().toISOString(),
      });
    }

    const sessionTokenBySessionId = new Map<string, string>();
    for (const session of sessions) {
      const id = text(session.id);
      const roomId = text(session.room_id);
      const memberId = text(session.member_id);
      const member = memberById.get(memberId);
      if (!member || text(member.room_id) !== roomId) {
        throw new MigrationError('session references a missing member');
      }
      const oldToken = reconstructV68SessionToken({
        sessionId: id,
        roomId,
        memberId,
        userId: nullableText(session.user_id),
        role: text(member.role, 'participant'),
        createdAt: text(session.created_at),
        expiresAt: nullableText(session.expires_at),
      });
      const newToken = signV69Token({
        kind: 'session',
        roomId,
        memberId,
        sessionId: id,
        exp: tokenExpiration(session, SESSION_TTL),
      });
      sessionTokenBySessionId.set(id, newToken);
      addLegacyToken({
        id: `leg_sess_${id}`,
        kind: 'session',
        oldHash: hashLegacyToken(oldToken),
        roomId,
        memberId,
        sessionId: id,
        newToken,
        createdAt: text(session.created_at) || new Date().toISOString(),
      });
    }

    for (const member of members) {
      const id = text(member.id);
      const primaryToken = primaryMemberTokenByMemberId.get(id);
      insertMember.run(
        id,
        text(member.room_id),
        text(member.name_snapshot),
        text(member.role, 'participant'),
        primaryToken ? hashLegacyToken(primaryToken) : null,
        text(member.gift_status, 'none'),
        buildProfileJson(member),
        text(member.created_at) || new Date().toISOString(),
      );
    }

    for (const invite of invites) {
      const id = text(invite.id);
      const newToken = inviteTokenByInviteId.get(id);
      if (!newToken) throw new MigrationError('missing reissued invite token');
      insertInvite.run(
        id,
        text(invite.room_id),
        hashLegacyToken(newToken),
        text(invite.role, 'participant'),
        nullableText(invite.label),
        Math.max(0, integer(invite.max_uses, 10)),
        Math.max(0, integer(invite.use_count, 0)),
        nullableText(invite.expires_at) ?? FAR_FUTURE,
        text(invite.created_at) || new Date().toISOString(),
      );
    }

    for (const session of sessions) {
      const id = text(session.id);
      const newToken = sessionTokenBySessionId.get(id);
      if (!newToken) throw new MigrationError('missing reissued session token');
      insertSession.run(
        id,
        text(session.room_id),
        text(session.member_id),
        hashLegacyToken(newToken),
        text(session.created_at) || new Date().toISOString(),
        nullableText(session.expires_at) ?? FAR_FUTURE,
        nullableText(session.revoked_at) ? 1 : 0,
        nullableText(session.user_agent),
      );
    }

    for (const exclusion of exclusions) {
      insertExclusion.run(
        text(exclusion.id),
        text(exclusion.room_id),
        text(exclusion.member_a_id),
        text(exclusion.member_b_id),
        null,
        text(exclusion.created_at) || new Date().toISOString(),
      );
    }

    for (const run of drawRuns) {
      insertRun.run(
        text(run.id),
        text(run.room_id),
        text(run.algorithm_version, 'v1'),
        nullableText(run.created_by_member_id) ?? text(roomById.get(text(run.room_id))?.organizer_member_id, 'unknown'),
        text(run.created_at) || new Date().toISOString(),
      );
    }

    // v69 messages require a non-null run_id. A small number of v68 rows have
    // no draw run; give those a deterministic synthetic run per room.
    const syntheticRunIds = new Set<string>();
    const messageRuns = messages.map((message, index) => {
      const roomId = text(message.room_id);
      const oldRunId = text(message.draw_run_id);
      if (oldRunId && runIds.has(oldRunId)) return { message, index, runId: oldRunId };
      const runId = `run_migrated_${roomId}`;
      syntheticRunIds.add(runId);
      return { message, index, runId };
    });
    for (const runId of syntheticRunIds) {
      const related = messageRuns.find((item) => item.runId === runId);
      const roomId = text(related?.message.room_id, 'unknown');
      const room = roomById.get(roomId);
      insertRun.run(
        runId,
        roomId,
        'v1',
        text(room?.organizer_member_id) || text(room?.id, 'unknown'),
        text(related?.message.created_at) || new Date().toISOString(),
      );
    }

    for (const assignment of assignments) {
      insertAssignment.run(
        text(assignment.id),
        text(assignment.draw_run_id),
        text(assignment.room_id),
        text(assignment.santa_member_id),
        text(assignment.recipient_member_id),
      );
    }

    for (const wish of wishlists) {
      insertWishlist.run(
        text(wish.id),
        text(wish.room_id),
        text(wish.member_id),
        text(wish.text),
        text(wish.created_at) || new Date().toISOString(),
      );
    }

    for (const { message, runId } of messageRuns) {
      insertMessage.run(
        text(message.id),
        text(message.room_id),
        runId,
        text(message.channel, 'to_recipient'),
        text(message.from_member_id),
        text(message.to_member_id),
        text(message.text),
        text(message.created_at) || new Date().toISOString(),
      );
    }

    const orderedEvents = [...events].sort((a, b) => {
      const left = text(a.created_at);
      const right = text(b.created_at);
      if (left !== right) return left < right ? -1 : 1;
      return integer(a._rowid, 0) - integer(b._rowid, 0);
    });
    orderedEvents.forEach((event, index) => {
      const oldType = text(event.type);
      insertEvent.run(
        String(EVENT_ID_BASE + index + 1),
        text(event.room_id),
        EVENT_TYPE_RENAMES[oldType] ?? oldType,
        nullableText(event.actor_member_id),
        text(event.payload_json, '{}') || '{}',
        text(event.created_at) || new Date().toISOString(),
      );
    });

    for (const subscription of pushSubscriptions) {
      const payload: Record<string, unknown> = { keys: {} };
      const keys = payload.keys as Record<string, string>;
      const p256dh = nullableText(subscription.p256dh);
      const auth = nullableText(subscription.auth);
      if (p256dh !== null) keys.p256dh = p256dh;
      if (auth !== null) keys.auth = auth;
      const userAgent = nullableText(subscription.user_agent);
      if (userAgent !== null) payload.userAgent = userAgent;
      insertPush.run(
        text(subscription.endpoint),
        nullableText(subscription.room_id),
        nullableText(subscription.member_id),
        JSON.stringify(payload),
        text(subscription.created_at) || new Date().toISOString(),
      );
    }

    for (const job of notificationJobs) {
      const oldStatus = text(job.status, 'pending');
      insertJob.run(
        text(job.id),
        nullableText(job.room_id),
        text(job.channel, 'push'),
        text(job.kind, 'reminder'),
        text(job.payload_json, '{}') || '{}',
        nullableText(job.scheduled_at),
        JOB_STATUS_RENAMES[oldStatus] ?? 'queued',
        text(job.created_at) || new Date().toISOString(),
      );
    }

    const expected: Record<string, number> = {
      rooms: rooms.length,
      members: members.length,
      invites: invites.length,
      auth_sessions: sessions.length,
      exclusions: exclusions.length,
      draw_runs: drawRuns.length + syntheticRunIds.size,
      assignments: assignments.length,
      wishlist_items: wishlists.length,
      messages: messages.length,
      room_events: events.length,
      push_subscriptions: pushSubscriptions.length,
      notification_jobs: notificationJobs.length,
      legacy_token_map: seenLegacyHashes.size,
    };

    const actual: Record<string, number> = {
      rooms: countByIds(targetDb, 'rooms', 'id', rooms.map((row) => text(row.id))),
      members: countByIds(targetDb, 'members', 'id', members.map((row) => text(row.id))),
      invites: countByIds(targetDb, 'invites', 'id', invites.map((row) => text(row.id))),
      auth_sessions: countByIds(targetDb, 'auth_sessions', 'id', sessions.map((row) => text(row.id))),
      exclusions: countByIds(targetDb, 'exclusions', 'id', exclusions.map((row) => text(row.id))),
      draw_runs: countByIds(
        targetDb,
        'draw_runs',
        'id',
        [...drawRuns.map((row) => text(row.id)), ...syntheticRunIds],
      ),
      assignments: countByIds(targetDb, 'assignments', 'id', assignments.map((row) => text(row.id))),
      wishlist_items: countByIds(targetDb, 'wishlist_items', 'id', wishlists.map((row) => text(row.id))),
      messages: countByIds(targetDb, 'messages', 'id', messages.map((row) => text(row.id))),
      room_events: countByIds(targetDb, 'room_events', 'id', orderedEvents.map((_, index) => String(EVENT_ID_BASE + index + 1))),
      push_subscriptions: countByIds(
        targetDb,
        'push_subscriptions',
        'endpoint',
        pushSubscriptions.map((row) => text(row.endpoint)),
      ),
      notification_jobs: countByIds(targetDb, 'notification_jobs', 'id', notificationJobs.map((row) => text(row.id))),
      legacy_token_map: countByIds(targetDb, 'legacy_token_map', 'id', legacyTokenIds),
    };

    for (const table of Object.keys(expected)) {
      if (actual[table] !== expected[table]) {
        throw new MigrationError(
          `counter mismatch for ${table}: expected ${expected[table]}, found ${actual[table]}`,
        );
      }
    }

    if (dryRun) targetDb.exec('ROLLBACK');
    else targetDb.exec('COMMIT');

    const sourceSha256After = sha256File(source);
    if (sourceSha256Before !== sourceSha256After) {
      throw new MigrationError('source database checksum changed during migration');
    }

    return {
      dryRun,
      source,
      target,
      sourceSha256Before,
      sourceSha256After,
      counters: expected,
      reissuedTokens: {
        invite: invites.length,
        member: memberTokens.length,
        session: sessions.length,
      },
    };
  } catch (error) {
    try {
      targetDb.exec('ROLLBACK');
    } catch {
      // Nothing was open or the failure happened after the commit.
    }
    throw error instanceof MigrationError
      ? error
      : new MigrationError(`migration failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    sourceDb.close();
    targetDb.close();
  }
}

interface CliArgs {
  source?: string;
  target?: string;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const parsed: CliArgs = { dryRun: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--source' || arg === '--target') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new MigrationError(`${arg} requires a path`);
      if (arg === '--source') parsed.source = value;
      else parsed.target = value;
      index += 1;
    } else if (arg.startsWith('--source=')) {
      parsed.source = arg.slice('--source='.length);
    } else if (arg.startsWith('--target=')) {
      parsed.target = arg.slice('--target='.length);
    } else {
      throw new MigrationError(`unknown option: ${arg}`);
    }
  }
  return parsed;
}

function main(): void {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log(
        'Usage: node apps/api/src/migrate-v68.ts [--source PATH] [--target PATH] [--dry-run]\n' +
          'Defaults: source = SECRET_SANTA_V68_DB_PATH or backend/data/app.db\n' +
          '          target = SECRET_SANTA_V69_DB_PATH or apps/api/data/app.db',
      );
      return;
    }
    assertProductionSecret();
    const result = runMigration({
      source: args.source ?? process.env.SECRET_SANTA_V68_DB_PATH ?? DEFAULT_SOURCE,
      target: args.target ?? process.env.SECRET_SANTA_V69_DB_PATH ?? DEFAULT_TARGET,
      dryRun: args.dryRun,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`migrate:v68: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
