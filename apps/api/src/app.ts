import { cors } from 'hono/cors';
import { Hono } from 'hono';
import {
  createDemoSchema,
  createRoomSchema,
  drawSchema,
  exclusionSchema,
  giftStatusSchema,
  groupSchema,
  inviteSchema,
  joinRoomSchema,
  memberSchema,
  messageSchema,
  notificationSchema,
  profileSchema,
  pushSubscribeSchema,
  wishlistSchema,
} from '@secret-santa/shared/contracts';
import type {
  ActivityView,
  AssignmentView,
  MessageView,
  RoomView,
  RoomTheme,
  SessionView,
} from '@secret-santa/shared/contracts';
import { drawAssignments } from '@secret-santa/shared/draw';
import {
  expiresAt,
  hashToken,
  legacyIdentity,
  legacyRecord,
  newId,
  newRoomCode,
  signToken,
  verifyToken,
} from './auth.ts';
import { all, db, get, run } from './db.ts';
import { formatSse, roomEvents } from './events.ts';
import { pushEnabled, sendRoomPush } from './push.ts';
import type { RoomEvent } from './events.ts';

type JsonStatus = 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503;

interface RoomRow {
  id: string;
  code: string;
  name: string;
  event_date: string | null;
  theme: RoomTheme | null;
  demo: number;
  budget_min: number;
  budget_max: number;
  status: string;
  organizer_member_id: string | null;
}

interface MemberRow {
  id: string;
  room_id: string;
  name: string;
  role: 'organizer' | 'participant';
  gift_status: 'none' | 'idea' | 'bought' | 'done';
  profile_json: string;
}

interface SessionRow {
  member_id: string;
  session_id: string;
  expires_at: string;
  revoked: number;
}

interface AuthContext {
  room: RoomRow;
  member: MemberRow;
  sessionId: string;
  token: string;
}

interface EventRow {
  id: string;
  type: string;
  actor: string | null;
  payload_json: string;
  created_at: string;
}

type RequestCtx = {
  req: {
    header: (name: string) => string | undefined;
    query: (name: string) => string | undefined;
    json: () => Promise<unknown>;
  };
};

function fail(status: JsonStatus, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function roomByCode(code: string): RoomRow | undefined {
  return get<RoomRow>('SELECT * FROM rooms WHERE code = ?', normalizeCode(code));
}

const rateWindows = new Map<string, number[]>();

function rateLimited(key: string, limit = 30): boolean {
  const now = Date.now();
  const recent = (rateWindows.get(key) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= limit) {
    rateWindows.set(key, recent);
    return true;
  }
  recent.push(now);
  rateWindows.set(key, recent);
  return false;
}

function clientKey(c: RequestCtx): string {
  const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || c.req.header('x-real-ip') || 'local';
}

function roomMembers(roomId: string): MemberRow[] {
  return all<MemberRow>('SELECT * FROM members WHERE room_id = ? ORDER BY created_at, name', roomId);
}

function wishlistOf(memberId: string): Array<{ id: string; text: string }> {
  return all<{ id: string; text: string }>(
    'SELECT id, text FROM wishlist_items WHERE member_id = ? ORDER BY created_at',
    memberId,
  );
}

function profileOf(member: MemberRow): Record<string, string> {
  try {
    return JSON.parse(member.profile_json) as Record<string, string>;
  } catch {
    return {};
  }
}

function latestRun(roomId: string): { id: string } | undefined {
  return get<{ id: string }>(
    'SELECT id FROM draw_runs WHERE room_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
    roomId,
  );
}

function emit(roomId: string, type: string, actor: string | null, payload: unknown): RoomEvent {
  const createdAt = new Date().toISOString();
  const eventDbId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const inserted = db
    .prepare(
      'INSERT INTO room_events (id, room_id, type, actor, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(eventDbId, roomId, type, actor, JSON.stringify(payload), createdAt);
  const seq = Number(inserted.lastInsertRowid);
  const row = get<{ code: string }>(
    'SELECT rooms.code AS code FROM room_events JOIN rooms ON rooms.id = room_events.room_id WHERE room_events.rowid = ?',
    seq,
  );
  const event: RoomEvent = {
    // Курсор SSE — rowid базы: он монотонен и переживает перезапуск процесса.
    id: String(seq),
    type,
    actor,
    payload,
    createdAt,
    roomCode: row?.code,
    seq,
    eventDbId,
  };
  roomEvents.publish(roomId, event);
  return event;
}

function tokenFromRequest(c: RequestCtx): string | null {
  const queryToken = c.req.query('token');
  if (queryToken) return queryToken;
  const header = c.req.header('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function authenticate(c: RequestCtx, code: string): AuthContext | null {
  const token = tokenFromRequest(c);
  if (!token) return null;

  const room = roomByCode(code);
  if (!room) return null;

  const payload = verifyToken(token);
  const legacy = !payload || payload.kind !== 'session' ? legacyIdentity(token) : null;
  if (!payload && !legacy) return null;

  const roomId = legacy?.roomId ?? payload?.roomId;
  const memberId = legacy?.memberId ?? payload?.memberId;
  if (!roomId || room.id !== roomId || !memberId) return null;

  const session = legacy?.sessionId
    ? get<SessionRow>(
        'SELECT member_id, id AS session_id, expires_at, revoked FROM auth_sessions WHERE id = ?',
        legacy.sessionId,
      )
    : get<SessionRow>(
        'SELECT member_id, id AS session_id, expires_at, revoked FROM auth_sessions WHERE token_hash = ?',
        hashToken(token),
      );
  if (!session || session.revoked || session.expires_at < new Date().toISOString()) return null;
  if (session.member_id !== memberId) return null;

  const member = get<MemberRow>('SELECT * FROM members WHERE id = ?', session.member_id);
  if (!member || member.room_id !== room.id) return null;
  run('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?', new Date().toISOString(), session.session_id);

  return { room, member, sessionId: session.session_id, token };
}

function buildRoomView(room: RoomRow): RoomView {
  const members = roomMembers(room.id);
  return {
    code: room.code,
    name: room.name,
    eventDate: room.event_date,
    theme: room.theme ?? 'winter',
    demo: Boolean(room.demo),
    budgetMin: room.budget_min,
    budgetMax: room.budget_max,
    status: room.status,
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      giftStatus: member.gift_status,
      wishlist: wishlistOf(member.id),
      profile: profileOf(member),
    })),
    exclusions: all<{ member_a: string; member_b: string; group_name: string | null }>(
      'SELECT member_a, member_b, group_name FROM exclusions WHERE room_id = ?',
      room.id,
    ).map((row) => ({ memberA: row.member_a, memberB: row.member_b, groupName: row.group_name })),
    drawRunId: latestRun(room.id)?.id ?? null,
    ready: {
      members: members.length,
      wishlists: all<{ count: number }>(
        'SELECT COUNT(*) AS count FROM wishlist_items WHERE room_id = ?',
        room.id,
      )[0]?.count ?? 0,
      gifts: members.filter((member) => member.gift_status !== 'none').length,
    },
  };
}

function parse<T>(schema: { parse: (value: unknown) => T }, value: unknown): T | null {
  try {
    return schema.parse(value);
  } catch {
    return null;
  }
}

async function bodyOf(c: RequestCtx): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

export const app = new Hono();

app.use(
  '*',
  cors({
    origin: process.env.SECRET_SANTA_ALLOW_ORIGIN ?? '*',
    allowHeaders: ['Authorization', 'Content-Type', 'Last-Event-ID'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  }),
);

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
});

const RESERVED_ROOM_PATHS = new Set(['join', 'demo']);

async function requireKnownRoom(c: { req: { param: (name: string) => string | undefined } }, next: () => Promise<void>) {
  const code = c.req.param('code');
  if (code && !RESERVED_ROOM_PATHS.has(code) && !roomByCode(code)) return fail(404, 'room_not_found');
  await next();
}

app.use('/api/rooms/:code/*', requireKnownRoom);
app.use('/api/rooms/:code', requireKnownRoom);

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    version: '0.3-v69',
    stack: 'hono-node',
    time: new Date().toISOString(),
    push: { enabled: pushEnabled() },
  }),
);

app.get('/api/push/config', (c) =>
  c.json({
    enabled: pushEnabled(),
    publicKey: pushEnabled() ? (process.env.VAPID_PUBLIC_KEY ?? null) : null,
    subject: pushEnabled() ? (process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com') : null,
  }),
);

app.post('/api/push/subscribe', async (c) => {
  const raw = (await bodyOf(c)) as { endpoint?: string; subscription?: { endpoint?: string } } | null;
  const body = parse(pushSubscribeSchema, {
    ...(raw ?? {}),
    endpoint: raw?.endpoint ?? raw?.subscription?.endpoint,
  });
  if (!body) return fail(400, 'endpoint_required');
  const room = body.roomCode ? roomByCode(body.roomCode) : undefined;
  run(
    'INSERT INTO push_subscriptions (endpoint, room_id, member_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET room_id = excluded.room_id, member_id = excluded.member_id, payload_json = excluded.payload_json, created_at = excluded.created_at',
    body.endpoint,
    room?.id ?? null,
    body.memberId ?? null,
    JSON.stringify(body),
    new Date().toISOString(),
  );
  return c.json({ ok: true, stored: true, vapid: { enabled: pushEnabled() } }, 200);
});

app.post('/api/push/unsubscribe', async (c) => {
  const body = (await bodyOf(c)) as { endpoint?: string; subscription?: { endpoint?: string } } | null;
  const endpoint = body?.endpoint ?? body?.subscription?.endpoint;
  if (!endpoint) return fail(400, 'endpoint_required');
  run('DELETE FROM push_subscriptions WHERE endpoint = ?', endpoint);
  return c.json({ ok: true });
});

app.post('/api/rooms', async (c) => {
  if (rateLimited(`${clientKey(c)}:create`)) return fail(429, 'rate_limited');
  const input = parse(createRoomSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');

  let code = newRoomCode();
  while (roomByCode(code)) code = newRoomCode();

  const roomId = newId('room');
  const organizerId = newId('mem');
  const sessionId = newId('sess');
  const now = new Date().toISOString();

  run(
    'INSERT INTO rooms (id, code, name, event_date, theme, budget_min, budget_max, organizer_member_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    roomId,
    code,
    input.name,
    input.eventDate,
    input.theme,
    input.budgetMin,
    input.budgetMax,
    organizerId,
    now,
  );
  run(
    'INSERT INTO members (id, room_id, name, role, created_at) VALUES (?, ?, ?, ?, ?)',
    organizerId,
    roomId,
    input.organizerName,
    'organizer',
    now,
  );

  const memberToken = signToken({
    kind: 'member',
    roomId,
    memberId: organizerId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  });
  const inviteToken = signToken({
    kind: 'invite',
    roomId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  });
  const sessionToken = signToken({
    kind: 'session',
    roomId,
    memberId: organizerId,
    sessionId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  });

  run(
    'INSERT INTO auth_sessions (id, room_id, member_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    sessionId,
    roomId,
    organizerId,
    hashToken(sessionToken),
    now,
    expiresAt(),
  );
  run(
    'INSERT INTO invites (id, room_id, token_hash, role, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    newId('inv'),
    roomId,
    hashToken(inviteToken),
    'participant',
    50,
    expiresAt(60 * 60 * 24 * 30),
  );

  for (const name of input.memberNames ?? []) {
    if (name.trim() && name !== input.organizerName) {
      run('INSERT INTO members (id, room_id, name, role) VALUES (?, ?, ?, ?)', newId('mem'), roomId, name.trim(), 'participant');
    }
  }

  emit(roomId, 'room.created', organizerId, { code, name: input.name });
  const room = roomByCode(code);
  return c.json(
    {
      ok: true,
      code,
      token: sessionToken,
      sessionId,
      inviteToken,
      memberToken,
      room: room ? buildRoomView(room) : null,
    },
    201,
  );
});

app.post('/api/rooms/demo', async (c) => {
  const input = parse(createDemoSchema, (await bodyOf(c)) ?? {}) ?? { memberNames: undefined };
  const names = input.memberNames ?? ['Аня', 'Борис', 'Вика', 'Галя'];
  let code = newRoomCode();
  while (roomByCode(code)) code = newRoomCode();

  const roomId = newId('room');
  const organizerId = newId('mem');
  const sessionId = newId('sess');
  const now = new Date().toISOString();
  const eventDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  run(
    'INSERT INTO rooms (id, code, name, event_date, theme, demo, budget_min, budget_max, organizer_member_id, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)',
    roomId,
    code,
    'Демо-игра',
    eventDate,
    'winter',
    1000,
    3000,
    organizerId,
    now,
  );
  run('INSERT INTO members (id, room_id, name, role, created_at) VALUES (?, ?, ?, ?, ?)', organizerId, roomId, names[0], 'organizer', now);
  for (const name of names.slice(1)) {
    run('INSERT INTO members (id, room_id, name, role, created_at) VALUES (?, ?, ?, ?, ?)', newId('mem'), roomId, name, 'participant', now);
  }

  const sessionToken = signToken({
    kind: 'session',
    roomId,
    memberId: organizerId,
    sessionId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  });
  const memberToken = signToken({
    kind: 'member',
    roomId,
    memberId: organizerId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  });
  const inviteToken = signToken({
    kind: 'invite',
    roomId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  });
  run(
    'INSERT INTO auth_sessions (id, room_id, member_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    sessionId,
    roomId,
    organizerId,
    hashToken(sessionToken),
    now,
    expiresAt(),
  );
  run(
    'INSERT INTO invites (id, room_id, token_hash, role, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    newId('inv'),
    roomId,
    hashToken(inviteToken),
    'participant',
    50,
    expiresAt(60 * 60 * 24 * 30),
  );

  const memberIds = roomMembers(roomId).map((member) => member.id);
  const pairs = drawAssignments(memberIds, []);
  if (pairs) {
    const runId = newId('run');
    run('INSERT INTO draw_runs (id, room_id, created_by, created_at) VALUES (?, ?, ?, ?)', runId, roomId, organizerId, now);
    for (const pair of pairs) {
      run(
        'INSERT INTO assignments (id, run_id, room_id, santa_id, recipient_id) VALUES (?, ?, ?, ?, ?)',
        newId('asg'),
        runId,
        roomId,
        pair.santa,
        pair.recipient,
      );
    }
  }
  emit(roomId, 'room.created', organizerId, { code, name: 'Демо-игра' });
  emit(roomId, 'room.drawn', organizerId, { runId: latestRun(roomId)?.id ?? null, pairs: pairs?.length ?? 0 });
  const room = roomByCode(code);
  return c.json(
    { ok: true, demo: true, code, token: sessionToken, memberToken, inviteToken, room: room ? buildRoomView(room) : null },
    201,
  );
});

app.post('/api/rooms/join', async (c) => {
  if (rateLimited(`${clientKey(c)}:join`)) return fail(429, 'rate_limited');
  const input = parse(joinRoomSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');

  const room = roomByCode(input.code);
  if (!room) return fail(404, 'room_not_found');

  let member: MemberRow | undefined;
  let joinMode: 'member' | 'invite' | 'legacy' = 'legacy';

  if (input.memberToken) {
    const payload = verifyToken(input.memberToken);
    const legacy = legacyIdentity(input.memberToken);
    const roomId = legacy?.roomId ?? payload?.roomId;
    const memberId = legacy?.memberId ?? payload?.memberId;
    if ((payload?.kind === 'member' || legacy?.kind === 'member') && roomId === room.id && memberId) {
      member = get<MemberRow>('SELECT * FROM members WHERE id = ?', memberId);
      joinMode = 'member';
    }
  }

  if (!member && input.inviteToken) {
    const payload = verifyToken(input.inviteToken);
    const legacy = legacyRecord(input.inviteToken);
    const roomId = legacy?.room_id ?? payload?.roomId;
    const tokenHash = legacy?.new_token ? hashToken(legacy.new_token) : hashToken(input.inviteToken);
    if ((payload?.kind === 'invite' || legacy?.kind === 'invite') && roomId === room.id) {
      const invite = get<{ id: string; max_uses: number; uses: number; expires_at: string }>(
        'SELECT id, max_uses, uses, expires_at FROM invites WHERE room_id = ? AND token_hash = ?',
        room.id,
        tokenHash,
      );
      if (invite && invite.uses < invite.max_uses && invite.expires_at >= new Date().toISOString()) {
        run('UPDATE invites SET uses = uses + 1 WHERE id = ?', invite.id);
        if (input.name) {
          const existing = get<MemberRow>(
            'SELECT * FROM members WHERE room_id = ? AND name = ?',
            room.id,
            input.name,
          );
          member = existing;
          if (!member) {
            const id = newId('mem');
            run('INSERT INTO members (id, room_id, name, role) VALUES (?, ?, ?, ?)', id, room.id, input.name, 'participant');
            member = get<MemberRow>('SELECT * FROM members WHERE id = ?', id);
          }
        }
        joinMode = 'invite';
      }
    }
  }

  if (!member && input.name) {
    member = get<MemberRow>('SELECT * FROM members WHERE room_id = ? AND name = ?', room.id, input.name);
  }

  if (!member) return fail(403, 'join_not_allowed');

  const sessionId = newId('sess');
  const sessionToken = signToken({
    kind: 'session',
    roomId: room.id,
    memberId: member.id,
    sessionId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  });
  const newMemberToken = signToken({
    kind: 'member',
    roomId: room.id,
    memberId: member.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  });

  run(
    'INSERT INTO auth_sessions (id, room_id, member_id, token_hash, expires_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    sessionId,
    room.id,
    member.id,
    hashToken(sessionToken),
    expiresAt(),
    c.req.header('user-agent') ?? null,
  );
  emit(room.id, 'room.member_joined', member.id, { name: member.name, joinMode });

  return c.json({
    ok: true,
    token: sessionToken,
    sessionId,
    memberToken: newMemberToken,
    joinMode,
    room: buildRoomView(room),
  });
});

app.get('/api/rooms/:code', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  return c.json({
    room: buildRoomView(auth.room),
    me: {
      id: auth.member.id,
      name: auth.member.name,
      role: auth.member.role,
      giftStatus: auth.member.gift_status,
    },
  });
});

app.get('/api/rooms/:code/assignment', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');

  const runRow = latestRun(auth.room.id);
  if (!runRow) return c.json({ drawn: false, recipient: null } satisfies AssignmentView);

  const assignment = get<{ recipient_id: string }>(
    'SELECT recipient_id FROM assignments WHERE run_id = ? AND santa_id = ?',
    runRow.id,
    auth.member.id,
  );
  if (!assignment) return c.json({ drawn: false, recipient: null } satisfies AssignmentView);

  const recipient = get<MemberRow>('SELECT * FROM members WHERE id = ?', assignment.recipient_id);
  if (!recipient) return c.json({ drawn: false, recipient: null } satisfies AssignmentView);

  return c.json({
    drawn: true,
    recipient: {
      id: recipient.id,
      name: recipient.name,
      wishlist: wishlistOf(recipient.id).map((item) => item.text),
      profile: profileOf(recipient),
    },
  } satisfies AssignmentView);
});

app.post('/api/rooms/:code/draw', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');

  const input = (await bodyOf(c)) as { exclusions?: Array<[string, string]> } | null;
  if (input && !parse(drawSchema, input)) return fail(400, 'invalid_input');

  const members = roomMembers(auth.room.id);
  const memberIds = members.map((member) => member.id);
  const saved = all<{ member_a: string; member_b: string }>(
    'SELECT member_a, member_b FROM exclusions WHERE room_id = ?',
    auth.room.id,
  ).map((row) => [row.member_a, row.member_b] as const);
  const requested = (input?.exclusions ?? []).filter(
    (pair) => memberIds.includes(pair[0]) && memberIds.includes(pair[1]),
  );
  const pairs = drawAssignments(memberIds, [...saved, ...requested]);
  if (!pairs) return fail(409, 'draw_impossible');

  const runId = newId('run');
  run('INSERT INTO draw_runs (id, room_id, created_by) VALUES (?, ?, ?)', runId, auth.room.id, auth.member.id);
  for (const pair of pairs) {
    run(
      'INSERT INTO assignments (id, run_id, room_id, santa_id, recipient_id) VALUES (?, ?, ?, ?, ?)',
      newId('asg'),
      runId,
      auth.room.id,
      pair.santa,
      pair.recipient,
    );
  }
  emit(auth.room.id, 'room.drawn', auth.member.id, { runId, pairs: pairs.length });
  return c.json({ ok: true, drawRunId: runId, pairs: pairs.length }, 201);
});

app.post('/api/rooms/:code/draw/reset', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');

  const last = latestRun(auth.room.id);
  if (last) {
    run('DELETE FROM messages WHERE run_id = ?', last.id);
    run('DELETE FROM draw_runs WHERE id = ?', last.id);
  }
  emit(auth.room.id, 'room.draw_reset', auth.member.id, { runId: last?.id ?? null });
  return c.json({ ok: true });
});

app.post('/api/rooms/:code/exclusions', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');

  const input = parse(exclusionSchema, await bodyOf(c));
  if (!input || input.memberA === input.memberB) return fail(400, 'invalid_input');

  const members = roomMembers(auth.room.id).map((member) => member.id);
  if (!members.includes(input.memberA) || !members.includes(input.memberB)) {
    return fail(404, 'member_not_found');
  }
  const [a, b] = [input.memberA, input.memberB].sort();
  run(
    'INSERT OR IGNORE INTO exclusions (id, room_id, member_a, member_b, group_name) VALUES (?, ?, ?, ?, ?)',
    newId('exc'),
    auth.room.id,
    a,
    b,
    input.groupName ?? null,
  );
  emit(auth.room.id, 'room.exclusion_added', auth.member.id, { a, b, groupName: input.groupName ?? null });
  return c.json({ ok: true }, 201);
});

app.delete('/api/rooms/:code/exclusions/:a/:b', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');
  if (latestRun(auth.room.id)) return fail(409, 'draw_active');

  const [a, b] = [c.req.param('a'), c.req.param('b')].sort();
  run('DELETE FROM exclusions WHERE room_id = ? AND member_a = ? AND member_b = ?', auth.room.id, a, b);
  emit(auth.room.id, 'room.exclusion_removed', auth.member.id, { a, b });
  return c.json({ ok: true });
});

app.post('/api/rooms/:code/members', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');
  const input = parse(memberSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');

  const existing = get<{ id: string }>(
    'SELECT id FROM members WHERE room_id = ? AND name = ?',
    auth.room.id,
    input.name,
  );
  if (existing) return fail(409, 'member_exists');

  const id = newId('mem');
  run('INSERT INTO members (id, room_id, name, role, created_at) VALUES (?, ?, ?, ?, ?)', id, auth.room.id, input.name, 'participant', new Date().toISOString());
  emit(auth.room.id, 'room.member_added', auth.member.id, { name: input.name, memberId: id });
  const room = roomByCode(auth.room.code);
  return c.json({ ok: true, memberId: id, room: room ? buildRoomView(room) : null }, 201);
});

app.delete('/api/rooms/:code/members/:id', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');
  const id = c.req.param('id');
  if (id === auth.room.organizer_member_id) return fail(409, 'organizer_protected');

  const target = get<{ id: string }>('SELECT id FROM members WHERE id = ? AND room_id = ?', id, auth.room.id);
  if (!target) return fail(404, 'member_not_found');

  const last = latestRun(auth.room.id);
  if (last) {
    run('DELETE FROM messages WHERE run_id = ?', last.id);
    run('DELETE FROM draw_runs WHERE id = ?', last.id);
  }
  run('DELETE FROM auth_sessions WHERE member_id = ?', id);
  run('DELETE FROM members WHERE id = ?', id);
  emit(auth.room.id, 'room.member_removed', auth.member.id, { memberId: id });
  const room = roomByCode(auth.room.code);
  return c.json({ ok: true, room: room ? buildRoomView(room) : null });
});

app.post('/api/rooms/:code/groups', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');
  if (latestRun(auth.room.id)) return fail(409, 'draw_active');

  const input = parse(groupSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');
  const ids = [...new Set(input.memberIds)];
  const members = roomMembers(auth.room.id).map((member) => member.id);
  if (ids.length < 2 || ids.some((id) => !members.includes(id))) return fail(400, 'invalid_input');

  let added = 0;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const [a, b] = [ids[i]!, ids[j]!].sort();
      run(
        'INSERT OR IGNORE INTO exclusions (id, room_id, member_a, member_b, group_name) VALUES (?, ?, ?, ?, ?)',
        newId('exc'),
        auth.room.id,
        a,
        b,
        input.name,
      );
      added += 1;
    }
  }
  emit(auth.room.id, 'room.group_added', auth.member.id, { name: input.name, pairs: added });
  return c.json({ ok: true, name: input.name, pairs: added }, 201);
});

app.delete('/api/rooms/:code/groups/:name', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');
  if (latestRun(auth.room.id)) return fail(409, 'draw_active');

  const name = decodeURIComponent(c.req.param('name'));
  run('DELETE FROM exclusions WHERE room_id = ? AND group_name = ?', auth.room.id, name);
  emit(auth.room.id, 'room.group_removed', auth.member.id, { name });
  return c.json({ ok: true });
});

app.post('/api/rooms/:code/wishlist', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const input = parse(wishlistSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');

  const id = newId('wish');
  run(
    'INSERT INTO wishlist_items (id, room_id, member_id, text) VALUES (?, ?, ?, ?)',
    id,
    auth.room.id,
    auth.member.id,
    input.text,
  );
  emit(auth.room.id, 'room.wishlist_updated', auth.member.id, { memberId: auth.member.id });
  return c.json({ ok: true, id }, 201);
});

app.delete('/api/rooms/:code/wishlist/:id', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');

  const item = get<{ member_id: string }>(
    'SELECT member_id FROM wishlist_items WHERE id = ? AND room_id = ?',
    c.req.param('id'),
    auth.room.id,
  );
  if (!item) return fail(404, 'item_not_found');
  if (item.member_id !== auth.member.id && auth.member.role !== 'organizer') {
    return fail(403, 'forbidden');
  }
  run('DELETE FROM wishlist_items WHERE id = ?', c.req.param('id'));
  emit(auth.room.id, 'room.wishlist_updated', auth.member.id, { memberId: item.member_id });
  return c.json({ ok: true });
});

app.post('/api/rooms/:code/gift-status', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const input = parse(giftStatusSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');
  run('UPDATE members SET gift_status = ? WHERE id = ?', input.status, auth.member.id);
  emit(auth.room.id, 'room.gift_status', auth.member.id, { status: input.status });
  return c.json({ ok: true });
});

app.post('/api/rooms/:code/profile', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const input = parse(profileSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');
  const profile = { ...profileOf(auth.member), ...input };
  run('UPDATE members SET profile_json = ? WHERE id = ?', JSON.stringify(profile), auth.member.id);
  emit(auth.room.id, 'room.profile_updated', auth.member.id, { fields: Object.keys(input) });
  return c.json({ ok: true, profile });
});

app.get('/api/rooms/:code/activity', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');

  const requested = Number(c.req.query('limit') ?? 20);
  const limit = Math.min(50, Math.max(1, Number.isFinite(requested) ? requested : 20));
  const rows = all<EventRow>(
    'SELECT e.*, m.name AS actor_name FROM room_events e LEFT JOIN members m ON m.id = e.actor WHERE e.room_id = ? ORDER BY e.rowid DESC LIMIT ?',
    auth.room.id,
    limit,
  );
  const activity: ActivityView[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    actor: row.actor,
    actorName: (row as EventRow & { actor_name: string | null }).actor_name,
    payload: JSON.parse(row.payload_json) as unknown,
    createdAt: row.created_at,
  }));
  return c.json({ activity });
});

app.post('/api/rooms/:code/invites', async (c) => {
  if (rateLimited(`${clientKey(c)}:invites`)) return fail(429, 'rate_limited');
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  if (auth.member.role !== 'organizer') return fail(403, 'organizer_only');

  const input = parse(inviteSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');
  const token = signToken({
    kind: 'invite',
    roomId: auth.room.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  });
  run(
    'INSERT INTO invites (id, room_id, token_hash, role, label, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    newId('inv'),
    auth.room.id,
    hashToken(token),
    input.role,
    input.label ?? null,
    input.maxUses,
    input.expiresAt ?? expiresAt(60 * 60 * 24 * 30),
  );
  return c.json({ ok: true, inviteToken: token }, 201);
});

app.post('/api/rooms/:code/member-tokens', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const token = signToken({
    kind: 'member',
    roomId: auth.room.id,
    memberId: auth.member.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  });
  return c.json({ ok: true, memberToken: token }, 201);
});

app.get('/api/rooms/:code/sessions', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const sessions = all<{
    id: string;
    created_at: string;
    expires_at: string;
    last_seen_at: string | null;
    user_agent: string | null;
    revoked: number;
  }>(
    'SELECT id, created_at, expires_at, last_seen_at, user_agent, revoked FROM auth_sessions WHERE member_id = ? ORDER BY created_at DESC',
    auth.member.id,
  );
  const views: SessionView[] = sessions.map((session) => ({
    id: session.id,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
    lastSeenAt: session.last_seen_at,
    userAgent: session.user_agent,
    revoked: Boolean(session.revoked),
    current: session.id === auth.sessionId,
  }));
  return c.json({ sessions: views });
});

app.post('/api/rooms/:code/sessions/revoke', async (c) => {
  if (rateLimited(`${clientKey(c)}:revoke`)) return fail(429, 'rate_limited');
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const body = (await bodyOf(c)) as { sessionId?: string; scope?: string; memberId?: string; allForMember?: boolean; reason?: string } | null;

  if (body?.sessionId) {
    const target = get<{ member_id: string }>(
      'SELECT member_id FROM auth_sessions WHERE id = ? AND room_id = ?',
      body.sessionId,
      auth.room.id,
    );
    if (!target) return fail(404, 'session_not_found');
    if (target.member_id !== auth.member.id && auth.member.role !== 'organizer') {
      return fail(403, 'forbidden');
    }
    run('UPDATE auth_sessions SET revoked = 1 WHERE id = ?', body.sessionId);
  } else if (body?.allForMember && body.memberId && auth.member.role === 'organizer') {
    run('UPDATE auth_sessions SET revoked = 1 WHERE member_id = ? AND room_id = ?', body.memberId, auth.room.id);
  } else if (body?.scope === 'all' || auth.member.role === 'organizer') {
    run('UPDATE auth_sessions SET revoked = 1 WHERE member_id = ?', auth.member.id);
  } else {
    run('UPDATE auth_sessions SET revoked = 1 WHERE id = ?', auth.sessionId);
  }
  return c.json({ ok: true });
});

app.get('/api/rooms/:code/messages', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const runRow = latestRun(auth.room.id);
  if (!runRow) return c.json({ messages: [] });

  const santaOfMe = get<{ santa_id: string }>(
    'SELECT santa_id FROM assignments WHERE run_id = ? AND recipient_id = ?',
    runRow.id,
    auth.member.id,
  );
  const myRecipient = get<{ recipient_id: string }>(
    'SELECT recipient_id FROM assignments WHERE run_id = ? AND santa_id = ?',
    runRow.id,
    auth.member.id,
  );
  if (!santaOfMe || !myRecipient) return c.json({ messages: [] });

  const rows = all<{
    id: string;
    channel: string;
    from_member: string;
    text: string;
    created_at: string;
  }>(
    `SELECT id, channel, from_member, text, created_at FROM messages
     WHERE run_id = ? AND ((from_member = ? AND to_member = ?) OR (from_member = ? AND to_member = ?))
     ORDER BY created_at, rowid DESC LIMIT 200`,
    runRow.id,
    auth.member.id,
    myRecipient.recipient_id,
    santaOfMe.santa_id,
    auth.member.id,
  );
  let messages: MessageView[] = rows.map((row) => {
    const mine = row.from_member === auth.member.id;
    let channel = row.channel as MessageView['channel'];
    if (!mine) channel = channel === 'to_recipient' ? 'to_santa' : 'to_recipient';
    return { id: row.id, channel, text: row.text, fromMe: mine, createdAt: row.created_at };
  });

  const requested = c.req.query('channel');
  if (requested === 'to_recipient' || requested === 'to_santa') {
    messages = messages.filter((message) => message.channel === requested);
  }
  return c.json({ messages });
});

app.post('/api/rooms/:code/messages', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const input = parse(messageSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');

  const runRow = latestRun(auth.room.id);
  if (!runRow) return fail(409, 'draw_required');

  const peer =
    input.channel === 'to_recipient'
      ? get<{ recipient_id: string }>(
          'SELECT recipient_id FROM assignments WHERE run_id = ? AND santa_id = ?',
          runRow.id,
          auth.member.id,
        )?.recipient_id
      : get<{ santa_id: string }>(
          'SELECT santa_id FROM assignments WHERE run_id = ? AND recipient_id = ?',
          runRow.id,
          auth.member.id,
        )?.santa_id;
  if (!peer) return fail(409, 'draw_required');

  const id = newId('msg');
  run(
    'INSERT INTO messages (id, room_id, run_id, channel, from_member, to_member, text) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    auth.room.id,
    runRow.id,
    input.channel,
    auth.member.id,
    peer,
    input.text,
  );
  emit(auth.room.id, 'room.message', auth.member.id, { channel: input.channel, id });
  return c.json({ ok: true, id }, 201);
});

app.get('/api/rooms/:code/events', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');

  const rawCursor = c.req.header('last-event-id') ?? c.req.query('lastEventId') ?? '0';
  const parsedCursor = Number(rawCursor) || 0;
  const knownCursor =
    parsedCursor > 0 &&
    get<{ seq: number }>(
      'SELECT rowid AS seq FROM room_events WHERE rowid = ? AND room_id = ?',
      parsedCursor,
      auth.room.id,
    );
  const lastEventId = knownCursor ? parsedCursor : 0;
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let replaying = true;
      let timer: NodeJS.Timeout | undefined;
      let unsubscribe: (() => void) | undefined;
      const cleanupInternal = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        unsubscribe?.();
      };
      cleanup = cleanupInternal;
      const seen = new Set<number>();
      const pending: RoomEvent[] = [];
      const enqueue = (text: string) => {
        if (closed) return;
        // Отрицательный desiredSize означает, что клиент отстаёт: новые кадры
        // отбрасываются, но соединение и replay остаются доступными.
        if (controller.desiredSize !== null && controller.desiredSize < -8) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          cleanupInternal();
        }
      };
      const deliver = (event: RoomEvent) => {
        if (closed || event.seq === undefined || seen.has(event.seq)) return;
        seen.add(event.seq);
        enqueue(formatSse(event));
      };
      // Подписка до replay: события, пришедшие во время чтения лога, не теряются.
      unsubscribe = roomEvents.subscribe(auth.room.id, (event) => {
        if (replaying) pending.push(event);
        else deliver(event);
      });
      const history = all<EventRow & { seq: number }>(
        'SELECT e.*, e.rowid AS seq FROM room_events e WHERE e.room_id = ? AND e.rowid > ? ORDER BY e.rowid ASC LIMIT 200',
        auth.room.id,
        lastEventId,
      );
      for (const row of history) {
        deliver({
          id: String(row.seq),
          type: row.type,
          actor: row.actor,
          payload: JSON.parse(row.payload_json) as unknown,
          createdAt: row.created_at,
          roomCode: auth.room.code,
          seq: row.seq,
          eventDbId: row.id,
        });
      }
      for (const event of pending) deliver(event);
      replaying = false;
      enqueue(
        formatSse({
          id: 'connected',
          type: 'connected',
          actor: null,
          payload: { code: auth.room.code },
          createdAt: new Date().toISOString(),
          roomCode: auth.room.code,
          omitId: true,
        }),
      );
      timer = setInterval(() => {
        if (!closed) enqueue(': ping\n\n');
      }, 15000);
      c.req.raw.signal?.addEventListener('abort', () => cleanupInternal(), { once: true });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});

app.post('/api/rooms/:code/notifications', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const input = parse(notificationSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');

  const id = newId('job');
  run(
    'INSERT INTO notification_jobs (id, room_id, channel, kind, payload_json, scheduled_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    auth.room.id,
    input.channel,
    input.kind,
    JSON.stringify(input.payload ?? {}),
    input.scheduledAt ?? null,
  );
  return c.json({ ok: true, jobId: id }, 202);
});

app.post('/api/rooms/:code/push/test', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const subscribers = all<{ endpoint: string }>(
    'SELECT endpoint FROM push_subscriptions WHERE room_id = ?',
    auth.room.id,
  ).length;
  const result = await sendRoomPush(auth.room.id);
  emit(auth.room.id, 'room.push_test', auth.member.id, { subscribers, delivered: result.delivered });
  if (result.disabled) return fail(503, 'push_not_configured');
  return c.json({ ok: true, delivered: result.delivered, subscribers, removed: result.removed });
});

export default app;
