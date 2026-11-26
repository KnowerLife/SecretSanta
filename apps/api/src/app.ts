import { cors } from 'hono/cors';
import { Hono } from 'hono';
import {
  createRoomSchema,
  drawSchema,
  exclusionSchema,
  giftStatusSchema,
  inviteSchema,
  joinRoomSchema,
  messageSchema,
  notificationSchema,
  profileSchema,
  wishlistSchema,
} from '@secret-santa/shared/contracts';
import type {
  ActivityView,
  AssignmentView,
  MessageView,
  RoomView,
} from '@secret-santa/shared/contracts';
import { drawAssignments } from '@secret-santa/shared/draw';
import { expiresAt, hashToken, newId, newRoomCode, signToken, verifyToken } from './auth.ts';
import { all, get, run } from './db.ts';
import { formatSse, roomEvents } from './events.ts';
import type { RoomEvent } from './events.ts';

type JsonStatus = 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 409 | 500;

interface RoomRow {
  id: string;
  code: string;
  name: string;
  event_date: string | null;
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

let eventCounter = 0;

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

function roomByCode(code: string): RoomRow | undefined {
  return get<RoomRow>('SELECT * FROM rooms WHERE code = ?', code);
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
  eventCounter = (eventCounter + 1) % 1000;
  const event: RoomEvent = {
    id: String(Date.now() * 1000 + eventCounter),
    type,
    actor,
    payload,
    createdAt: new Date().toISOString(),
  };
  run(
    'INSERT INTO room_events (id, room_id, type, actor, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    event.id,
    roomId,
    type,
    actor,
    JSON.stringify(payload),
    event.createdAt,
  );
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
  const payload = verifyToken(token);
  if (!payload || payload.kind !== 'session' || !payload.memberId) return null;

  const room = roomByCode(code);
  if (!room || room.id !== payload.roomId) return null;

  const session = get<SessionRow>(
    'SELECT member_id, id AS session_id, expires_at, revoked FROM auth_sessions WHERE token_hash = ?',
    hashToken(token),
  );
  if (!session || session.revoked || session.expires_at < new Date().toISOString()) return null;
  if (session.member_id !== payload.memberId) return null;

  const member = get<MemberRow>('SELECT * FROM members WHERE id = ?', session.member_id);
  if (!member || member.room_id !== room.id) return null;

  return { room, member, sessionId: session.session_id, token };
}

function buildRoomView(room: RoomRow): RoomView {
  const members = roomMembers(room.id);
  return {
    code: room.code,
    name: room.name,
    eventDate: room.event_date,
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

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    version: '0.3-v69',
    stack: 'hono-node',
    time: new Date().toISOString(),
    push: { enabled: Boolean(process.env.VAPID_PUBLIC_KEY) },
  }),
);

app.get('/api/push/config', (c) =>
  c.json({
    enabled: Boolean(process.env.VAPID_PUBLIC_KEY),
    publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
    subject: process.env.VAPID_SUBJECT ?? null,
  }),
);

app.post('/api/push/subscribe', async (c) => {
  const body = (await bodyOf(c)) as { endpoint?: string; roomCode?: string; memberId?: string } | null;
  if (!body?.endpoint) return fail(400, 'endpoint_required');
  run(
    'INSERT INTO push_subscriptions (endpoint, room_id, member_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET room_id = excluded.room_id, member_id = excluded.member_id',
    body.endpoint,
    body.roomCode ?? null,
    body.memberId ?? null,
    JSON.stringify(body),
    new Date().toISOString(),
  );
  return c.json({ ok: true }, 201);
});

app.post('/api/push/unsubscribe', async (c) => {
  const body = (await bodyOf(c)) as { endpoint?: string } | null;
  if (!body?.endpoint) return fail(400, 'endpoint_required');
  run('DELETE FROM push_subscriptions WHERE endpoint = ?', body.endpoint);
  return c.json({ ok: true });
});

app.post('/api/rooms', async (c) => {
  const input = parse(createRoomSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');

  let code = newRoomCode();
  while (roomByCode(code)) code = newRoomCode();

  const roomId = newId('room');
  const organizerId = newId('mem');
  const sessionId = newId('sess');
  const now = new Date().toISOString();

  run(
    'INSERT INTO rooms (id, code, name, event_date, budget_min, budget_max, organizer_member_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    roomId,
    code,
    input.name,
    input.eventDate ?? null,
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

app.post('/api/rooms/join', async (c) => {
  const input = parse(joinRoomSchema, await bodyOf(c));
  if (!input) return fail(400, 'invalid_input');

  const room = roomByCode(input.code);
  if (!room) return fail(404, 'room_not_found');

  let member: MemberRow | undefined;
  let joinMode: 'member' | 'invite' | 'legacy' = 'legacy';

  if (input.memberToken) {
    const payload = verifyToken(input.memberToken);
    if (payload?.kind === 'member' && payload.roomId === room.id && payload.memberId) {
      member = get<MemberRow>('SELECT * FROM members WHERE id = ?', payload.memberId);
      joinMode = 'member';
    }
  }

  if (!member && input.inviteToken) {
    const payload = verifyToken(input.inviteToken);
    if (payload?.kind === 'invite' && payload.roomId === room.id) {
      const invite = get<{ id: string; max_uses: number; uses: number; expires_at: string }>(
        'SELECT id, max_uses, uses, expires_at FROM invites WHERE room_id = ? AND token_hash = ?',
        room.id,
        hashToken(input.inviteToken),
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
    'SELECT e.*, m.name AS actor_name FROM room_events e LEFT JOIN members m ON m.id = e.actor WHERE e.room_id = ? ORDER BY CAST(e.id AS INTEGER) DESC LIMIT ?',
    auth.room.id,
    limit,
  );
  const activity: ActivityView[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    actor: (row as EventRow & { actor_name: string | null }).actor_name,
    payload: JSON.parse(row.payload_json) as unknown,
    createdAt: row.created_at,
  }));
  return c.json({ activity });
});

app.post('/api/rooms/:code/invites', async (c) => {
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
    revoked: number;
  }>(
    'SELECT id, created_at, expires_at, revoked FROM auth_sessions WHERE member_id = ? ORDER BY created_at DESC',
    auth.member.id,
  );
  return c.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      revoked: Boolean(session.revoked),
    })),
  });
});

app.post('/api/rooms/:code/sessions/revoke', async (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const body = (await bodyOf(c)) as { sessionId?: string; scope?: string } | null;

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

  const lastEventId = Number(c.req.query('lastEventId') ?? c.req.header('last-event-id') ?? 0) || 0;
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: RoomEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(formatSse(event)));
      };
      send({
        id: 'connected',
        type: 'connected',
        actor: null,
        payload: { code: auth.room.code },
        createdAt: new Date().toISOString(),
      });
      const history = all<EventRow>(
        'SELECT * FROM room_events WHERE room_id = ? AND CAST(id AS INTEGER) > ? ORDER BY CAST(id AS INTEGER) ASC LIMIT 200',
        auth.room.id,
        lastEventId,
      );
      for (const row of history) {
        send({
          id: row.id,
          type: row.type,
          actor: row.actor,
          payload: JSON.parse(row.payload_json) as unknown,
          createdAt: row.created_at,
        });
      }
      const unsubscribe = roomEvents.subscribe(auth.room.id, send);
      const timer = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(': ping\n\n'));
      }, 15000);
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        unsubscribe();
      };
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

app.post('/api/rooms/:code/push/test', (c) => {
  const auth = authenticate(c, c.req.param('code'));
  if (!auth) return fail(401, 'unauthorized');
  const subscriptions = all<{ endpoint: string }>(
    'SELECT endpoint FROM push_subscriptions WHERE room_id = ?',
    auth.room.id,
  );
  emit(auth.room.id, 'room.push_test', auth.member.id, { subscribers: subscriptions.length });
  return c.json({ ok: true, delivered: 0, subscribers: subscriptions.length });
});

export default app;
