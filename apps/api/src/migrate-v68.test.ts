import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

process.env.SECRET_SANTA_SECRET = 'migration-test-secret';

const { MigrationError, reconstructV68SessionToken, runMigration } = await import('./migrate-v68.ts');
const { hashLegacyToken, resolveLegacyToken, verifyV69Token } = await import('./migration-tokens.ts');
const { V68_SCHEMA_SQL } = await import('./v68-schema-fixture.ts');

const SECRET = 'migration-test-secret';
const MIGRATION_SCRIPT = fileURLToPath(new URL('./migrate-v68.ts', import.meta.url));

const RAW_INVITE = 'invite_0123456789abcdef';
const RAW_MEMBER_ORGANIZER = 'mkey_0123456789abcdef';
const RAW_MEMBER_BOB = 'mkey_fedcba9876543210';

type Value = string | number | null;
type Row = Record<string, unknown>;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function fileHash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function isoAt(offsetSeconds = 0): string {
  const date = new Date(Date.now() + offsetSeconds * 1000);
  date.setUTCMilliseconds(0);
  return date.toISOString().replace('.000Z', 'Z');
}

function insert(db: DatabaseSync, table: string, values: Record<string, Value>): void {
  const columns = Object.keys(values);
  const placeholders = columns.map(() => '?').join(', ');
  db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).run(
    ...columns.map((column) => values[column]),
  );
}

/** Independent implementation of backend/app/auth.py:sign_token for the fixture. */
function v68Sign(input: {
  sid: string;
  roomId: string;
  memberId: string;
  userId: string | null;
  role: string;
  iat: number;
  exp: number;
}): string {
  const payload = {
    exp: input.exp,
    iat: input.iat,
    member_id: input.memberId,
    role: input.role,
    room_id: input.roomId,
    sid: input.sid,
    user_id: input.userId,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

interface Fixture {
  dir: string;
  source: string;
  target: string;
  created: string;
  expires: string;
  oldSessionToken: string;
  newSessionId: string;
  counters: Record<string, number>;
}

function createFixture(duplicateMemberName = false): Fixture {
  const dir = mkdtempSync(join(tmpdir(), 'ss-migrate-'));
  const source = join(dir, 'v68.db');
  const target = join(dir, 'v69.db');
  const created = isoAt(-3600);
  const expires = isoAt(7 * 86400);
  const db = new DatabaseSync(source);

  db.exec(V68_SCHEMA_SQL);

  insert(db, 'users', { id: 'usr_org', name: 'Org', created_at: created });
  insert(db, 'users', { id: 'usr_bob', name: 'Bob', created_at: created });
  insert(db, 'rooms', {
    id: 'room_test',
    code: 'SANTA-TEST',
    name: 'Корпоратив',
    mode: 'classic',
    budget_min: 100,
    budget_max: 500,
    event_date: '2026-12-31',
    theme: 'Зима',
    organizer_user_id: 'usr_org',
    organizer_member_id: 'mem_org',
    status: 'active',
    created_at: created,
  });
  insert(db, 'room_members', {
    id: 'mem_org',
    room_id: 'room_test',
    user_id: 'usr_org',
    name_snapshot: 'Org',
    role: 'organizer',
    gift_status: 'bought',
    created_at: created,
  });
  insert(db, 'room_members', {
    id: 'mem_bob',
    room_id: 'room_test',
    user_id: 'usr_bob',
    name_snapshot: 'Bob',
    role: 'participant',
    gift_status: 'none',
    address: 'Москва',
    profile_note: 'Любит чай',
    anti_wishlist: 'Носки',
    size: 'M',
    links: 'https://example.test',
    allergies: 'Орехи',
    created_at: created,
  });
  if (duplicateMemberName) {
    // v69 has UNIQUE(room_id, name): this row cannot be inserted and must
    // surface as a counter mismatch rather than a partial migration.
    insert(db, 'users', { id: 'usr_dup', name: 'Дубль', created_at: created });
    insert(db, 'room_members', {
      id: 'mem_dup',
      room_id: 'room_test',
      user_id: 'usr_dup',
      name_snapshot: 'Bob',
      role: 'participant',
      created_at: created,
    });
  }

  insert(db, 'room_invites', {
    id: 'rinv_test',
    room_id: 'room_test',
    token_hash: sha256(RAW_INVITE),
    label: 'default',
    role: 'participant',
    created_by_member_id: 'mem_org',
    max_uses: null,
    use_count: 2,
    expires_at: null,
    created_at: created,
  });
  insert(db, 'member_access_tokens', {
    id: 'mtok_org',
    room_id: 'room_test',
    member_id: 'mem_org',
    token_hash: sha256(RAW_MEMBER_ORGANIZER),
    label: 'auto',
    created_at: created,
    last_used_at: created,
  });
  insert(db, 'member_access_tokens', {
    id: 'mtok_bob',
    room_id: 'room_test',
    member_id: 'mem_bob',
    token_hash: sha256(RAW_MEMBER_BOB),
    label: 'manual',
    created_at: created,
  });
  insert(db, 'auth_sessions', {
    id: 'sess_active',
    room_id: 'room_test',
    member_id: 'mem_org',
    user_id: 'usr_org',
    token_type: 'bearer',
    created_at: created,
    expires_at: expires,
    revoked_at: null,
    user_agent: 'fixture-agent',
  });
  insert(db, 'auth_sessions', {
    id: 'sess_revoked',
    room_id: 'room_test',
    member_id: 'mem_bob',
    user_id: 'usr_bob',
    token_type: 'bearer',
    created_at: created,
    expires_at: expires,
    revoked_at: created,
    user_agent: 'fixture-agent',
  });

  insert(db, 'exclusions', {
    id: 'ex_test',
    room_id: 'room_test',
    member_a_id: 'mem_org',
    member_b_id: 'mem_bob',
    created_at: created,
  });
  insert(db, 'draw_runs', {
    id: 'draw_test',
    room_id: 'room_test',
    mode: 'classic',
    created_by_member_id: 'mem_org',
    created_at: created,
    algorithm_version: 'v1',
    meta_json: '{"members":2}',
  });
  insert(db, 'assignments', {
    id: 'asn_test',
    draw_run_id: 'draw_test',
    room_id: 'room_test',
    santa_member_id: 'mem_org',
    recipient_member_id: 'mem_bob',
    created_at: created,
  });
  insert(db, 'wishlist_items', {
    id: 'wish_test',
    room_id: 'room_test',
    member_id: 'mem_org',
    text: 'Книга',
    created_at: created,
  });
  insert(db, 'messages', {
    id: 'msg_with_run',
    room_id: 'room_test',
    draw_run_id: 'draw_test',
    from_member_id: 'mem_org',
    to_member_id: 'mem_bob',
    channel: 'to_recipient',
    text: 'Привет',
    created_at: created,
  });
  insert(db, 'messages', {
    id: 'msg_without_run',
    room_id: 'room_test',
    draw_run_id: null,
    from_member_id: 'mem_bob',
    to_member_id: 'mem_org',
    channel: 'to_santa',
    text: 'Спасибо',
    created_at: created,
  });

  // Insert out of chronological order: migration must still number by time.
  insert(db, 'room_events', {
    id: 'evt_draw',
    room_id: 'room_test',
    type: 'room.draw_completed',
    actor_member_id: 'mem_org',
    payload_json: '{"runId":"draw_test"}',
    created_at: isoAt(-1800),
  });
  insert(db, 'room_events', {
    id: 'evt_created',
    room_id: 'room_test',
    type: 'room.created',
    actor_member_id: 'mem_org',
    payload_json: '{"roomCode":"SANTA-TEST"}',
    created_at: isoAt(-3600),
  });
  insert(db, 'room_events', {
    id: 'evt_gift',
    room_id: 'room_test',
    type: 'room.gift_status_updated',
    actor_member_id: 'mem_bob',
    payload_json: '{"status":"bought"}',
    created_at: isoAt(-600),
  });

  insert(db, 'push_subscriptions', {
    id: 'push_test',
    room_id: 'room_test',
    member_id: 'mem_bob',
    endpoint: 'https://example.test/push/1',
    p256dh: 'p256dh-value',
    auth: 'auth-value',
    user_agent: 'fixture-agent',
    created_at: created,
  });
  insert(db, 'notification_jobs', {
    id: 'job_test',
    room_id: 'room_test',
    member_id: 'mem_bob',
    channel: 'push',
    kind: 'reminder',
    payload_json: '{"days":3}',
    status: 'pending',
    scheduled_at: expires,
    attempts: 0,
    last_error: null,
    created_at: created,
    updated_at: created,
  });
  db.close();

  const oldSessionToken = v68Sign({
    sid: 'sess_active',
    roomId: 'room_test',
    memberId: 'mem_org',
    userId: 'usr_org',
    role: 'organizer',
    iat: Math.floor(Date.parse(created) / 1000),
    exp: Math.floor(Date.parse(expires) / 1000),
  });

  return {
    dir,
    source,
    target,
    created,
    expires,
    oldSessionToken,
    newSessionId: 'sess_active',
    counters: {
      rooms: 1,
      members: duplicateMemberName ? 3 : 2,
      invites: 1,
      auth_sessions: 2,
      exclusions: 1,
      draw_runs: 2, // one real run + one synthetic run for the message without run_id
      assignments: 1,
      wishlist_items: 1,
      messages: 2,
      room_events: 3,
      push_subscriptions: 1,
      notification_jobs: 1,
      legacy_token_map: 5, // 1 invite + 2 member tokens + 2 sessions
    },
  };
}

function one(db: DatabaseSync, sql: string, ...params: Value[]): Row {
  const row = db.prepare(sql).get(...params) as Row | undefined;
  assert.ok(row, `expected a row for: ${sql}`);
  return row;
}

function all(db: DatabaseSync, sql: string, ...params: Value[]): Row[] {
  return db.prepare(sql).all(...params) as Row[];
}

function legacyRow(db: DatabaseSync, oldHash: string): Row {
  return one(db, 'SELECT * FROM legacy_token_map WHERE old_hash = ?', oldHash);
}

test('все таблицы и поля маппируются, исходная БД не меняется', () => {
  const fixture = createFixture();
  try {
    const before = fileHash(fixture.source);
    const result = runMigration({ source: fixture.source, target: fixture.target });

    assert.deepEqual(result.counters, fixture.counters);
    assert.deepEqual(result.reissuedTokens, { invite: 1, member: 2, session: 2 });
    assert.equal(result.sourceSha256Before, before);
    assert.equal(result.sourceSha256After, before);

    const db = new DatabaseSync(fixture.target, { readOnly: true });
    try {
      const room = one(db, 'SELECT * FROM rooms WHERE id = ?', 'room_test');
      assert.equal(room.code, 'SANTA-TEST');
      assert.equal(room.name, 'Корпоратив');
      assert.equal(room.event_date, '2026-12-31');
      assert.equal(room.budget_min, 100);
      assert.equal(room.budget_max, 500);
      assert.equal(room.theme, 'Зима');
      assert.equal(room.organizer_member_id, 'mem_org');

      const bob = one(db, 'SELECT * FROM members WHERE id = ?', 'mem_bob');
      assert.equal(bob.name, 'Bob');
      assert.equal(bob.gift_status, 'none');
      assert.deepEqual(JSON.parse(String(bob.profile_json)), {
        address: 'Москва',
        note: 'Любит чай',
        antiWishlist: 'Носки',
        size: 'M',
        links: 'https://example.test',
        allergies: 'Орехи',
      });
      const org = one(db, 'SELECT * FROM members WHERE id = ?', 'mem_org');
      assert.equal(String(org.profile_json), '{}');

      const invite = one(db, 'SELECT * FROM invites WHERE id = ?', 'rinv_test');
      assert.equal(invite.max_uses, 10);
      assert.equal(invite.uses, 2);
      assert.ok(String(invite.expires_at).length > 0);
      const inviteMap = legacyRow(db, sha256(RAW_INVITE));
      assert.equal(invite.token_hash, hashLegacyToken(String(inviteMap.new_token)));
      const invitePayload = verifyV69Token(String(inviteMap.new_token));
      assert.equal(invitePayload?.kind, 'invite');
      assert.equal(invitePayload?.roomId, 'room_test');

      const memberMap = legacyRow(db, sha256(RAW_MEMBER_BOB));
      const memberPayload = verifyV69Token(String(memberMap.new_token));
      assert.equal(memberPayload?.kind, 'member');
      assert.equal(memberPayload?.memberId, 'mem_bob');
      assert.equal(org.token_hash, hashLegacyToken(String(legacyRow(db, sha256(RAW_MEMBER_ORGANIZER)).new_token)));

      assert.equal(
        reconstructV68SessionToken({
          sessionId: 'sess_active',
          roomId: 'room_test',
          memberId: 'mem_org',
          userId: 'usr_org',
          role: 'organizer',
          createdAt: fixture.created,
          expiresAt: fixture.expires,
        }),
        fixture.oldSessionToken,
      );
      const sessionMap = legacyRow(db, hashLegacyToken(fixture.oldSessionToken));
      assert.equal(sessionMap.session_id, 'sess_active');
      assert.equal(sessionMap.member_id, 'mem_org');
      const sessionPayload = verifyV69Token(String(sessionMap.new_token));
      assert.equal(sessionPayload?.kind, 'session');
      assert.equal(sessionPayload?.sessionId, 'sess_active');
      const session = one(db, 'SELECT * FROM auth_sessions WHERE id = ?', 'sess_active');
      assert.equal(session.token_hash, hashLegacyToken(String(sessionMap.new_token)));
      assert.equal(session.revoked, 0);
      assert.equal(session.user_agent, 'fixture-agent');
      const revoked = one(db, 'SELECT * FROM auth_sessions WHERE id = ?', 'sess_revoked');
      assert.equal(revoked.revoked, 1);

      const exclusion = one(db, 'SELECT * FROM exclusions WHERE id = ?', 'ex_test');
      assert.equal(exclusion.member_a, 'mem_org');
      assert.equal(exclusion.member_b, 'mem_bob');
      const run = one(db, 'SELECT * FROM draw_runs WHERE id = ?', 'draw_test');
      assert.equal(run.algorithm_version, 'v1');
      assert.equal(run.created_by, 'mem_org');
      const assignment = one(db, 'SELECT * FROM assignments WHERE id = ?', 'asn_test');
      assert.equal(assignment.run_id, 'draw_test');
      assert.equal(assignment.santa_id, 'mem_org');
      assert.equal(assignment.recipient_id, 'mem_bob');
      assert.equal(one(db, 'SELECT * FROM wishlist_items WHERE id = ?', 'wish_test').text, 'Книга');

      assert.equal(one(db, 'SELECT * FROM messages WHERE id = ?', 'msg_with_run').run_id, 'draw_test');
      assert.equal(
        one(db, 'SELECT * FROM messages WHERE id = ?', 'msg_without_run').run_id,
        'run_migrated_room_test',
      );

      const events = all(db, 'SELECT * FROM room_events ORDER BY CAST(id AS INTEGER) ASC');
      assert.deepEqual(
        events.map((event) => event.type),
        ['room.created', 'room.drawn', 'room.gift_status'],
      );
      assert.ok(events.every((event) => /^\d+$/.test(String(event.id))));
      const ids = events.map((event) => Number(event.id));
      assert.ok(ids.every((id, index) => index === 0 || id > ids[index - 1]));
      assert.equal(events[1]?.actor, 'mem_org');
      assert.equal(events[2]?.actor, 'mem_bob');
      const replay = all(
        db,
        'SELECT id FROM room_events WHERE room_id = ? AND CAST(id AS INTEGER) > ? ORDER BY CAST(id AS INTEGER) ASC',
        'room_test',
        ids[0],
      );
      assert.deepEqual(
        replay.map((event) => Number(event.id)),
        ids.slice(1),
      );

      const push = one(db, 'SELECT * FROM push_subscriptions WHERE endpoint = ?', 'https://example.test/push/1');
      assert.equal(push.room_id, 'room_test');
      assert.equal(push.member_id, 'mem_bob');
      assert.deepEqual(JSON.parse(String(push.payload_json)), {
        keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
        userAgent: 'fixture-agent',
      });
      const job = one(db, 'SELECT * FROM notification_jobs WHERE id = ?', 'job_test');
      assert.equal(job.status, 'queued');
      assert.equal(job.kind, 'reminder');
      assert.deepEqual(JSON.parse(String(job.payload_json)), { days: 3 });
    } finally {
      db.close();
    }

    assert.deepEqual(resolveLegacyToken(RAW_INVITE, fixture.target), {
      kind: 'invite',
      roomId: 'room_test',
      memberId: null,
      sessionId: null,
    });
    assert.deepEqual(resolveLegacyToken(RAW_MEMBER_ORGANIZER, fixture.target), {
      kind: 'member',
      roomId: 'room_test',
      memberId: 'mem_org',
      sessionId: null,
    });
    assert.deepEqual(resolveLegacyToken(fixture.oldSessionToken, fixture.target), {
      kind: 'session',
      roomId: 'room_test',
      memberId: 'mem_org',
      sessionId: 'sess_active',
    });
    assert.equal(resolveLegacyToken('unknown-token', fixture.target), null);
  } finally {
    rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test('повторный запуск не дублирует строки и токены', () => {
  const fixture = createFixture();
  try {
    const first = runMigration({ source: fixture.source, target: fixture.target });
    const snapshot = () => {
      const db = new DatabaseSync(fixture.target, { readOnly: true });
      try {
        return all(db, 'SELECT * FROM legacy_token_map ORDER BY id').map((row) => JSON.stringify(row)).join('|');
      } finally {
        db.close();
      }
    };
    const firstSnapshot = snapshot();
    const second = runMigration({ source: fixture.source, target: fixture.target });

    assert.deepEqual(second.counters, first.counters);
    assert.equal(snapshot(), firstSnapshot);
    const db = new DatabaseSync(fixture.target, { readOnly: true });
    try {
      for (const [table, expected] of Object.entries(first.counters)) {
        const count = all(db, `SELECT * FROM ${table}`).length;
        assert.equal(count, expected, `${table} duplicated`);
      }
    } finally {
      db.close();
    }
  } finally {
    rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test('dry-run не записывает целевую БД и сохраняет контрольную сумму источника', () => {
  const fixture = createFixture();
  try {
    const before = fileHash(fixture.source);
    const result = runMigration({ source: fixture.source, target: fixture.target, dryRun: true });
    assert.deepEqual(result.counters, fixture.counters);
    assert.equal(existsSync(fixture.target), false);
    assert.equal(fileHash(fixture.source), before);

    // The CLI honours --dry-run and the SECRET_SANTA_V69_DB_PATH fallback.
    const cli = spawnSync(
      process.execPath,
      [MIGRATION_SCRIPT, '--source', fixture.source, '--dry-run'],
      {
        encoding: 'utf8',
        env: { ...process.env, SECRET_SANTA_V69_DB_PATH: fixture.target },
      },
    );
    assert.equal(cli.status, 0, cli.stderr);
    const report = JSON.parse(cli.stdout) as { dryRun: boolean; counters: Record<string, number> };
    assert.equal(report.dryRun, true);
    assert.deepEqual(report.counters, fixture.counters);
    assert.equal(existsSync(fixture.target), false);
    assert.equal(fileHash(fixture.source), before);
  } finally {
    rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test('расхождение счётчиков откатывает транзакцию и даёт ненулевой код', () => {
  const fixture = createFixture(true);
  const cliTarget = join(fixture.dir, 'v69-cli.db');
  try {
    assert.throws(
      () => runMigration({ source: fixture.source, target: fixture.target }),
      (error: unknown) => error instanceof MigrationError && /counter mismatch for members/.test(error.message),
    );
    const db = new DatabaseSync(fixture.target, { readOnly: true });
    try {
      assert.equal(all(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'rooms'").length, 0);
    } finally {
      db.close();
    }

    const cli = spawnSync(
      process.execPath,
      [MIGRATION_SCRIPT, '--source', fixture.source, '--target', cliTarget],
      { encoding: 'utf8', env: { ...process.env } },
    );
    assert.notEqual(cli.status, 0);
    assert.match(cli.stderr, /counter mismatch for members/);
    const cliDb = new DatabaseSync(cliTarget, { readOnly: true });
    try {
      assert.equal(
        all(cliDb, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'rooms'").length,
        0,
      );
    } finally {
      cliDb.close();
    }
  } finally {
    rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test('источник нельзя использовать как целевую БД', () => {
  const fixture = createFixture();
  try {
    const before = fileHash(fixture.source);
    assert.throws(
      () => runMigration({ source: fixture.source, target: fixture.source }),
      /separate v69 database/,
    );
    assert.equal(fileHash(fixture.source), before);
  } finally {
    rmSync(fixture.dir, { recursive: true, force: true });
  }
});
