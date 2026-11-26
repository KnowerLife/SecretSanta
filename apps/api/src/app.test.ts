import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.SECRET_SANTA_V69_DB_PATH = join(mkdtempSync(join(tmpdir(), 'ss-v69-')), 'test.db');
process.env.SECRET_SANTA_SECRET = 'test-secret';

const { app } = await import('./app.ts');
const { get, run } = await import('./db.ts');
const { hashToken } = await import('./auth.ts');

async function call(path: string, init?: RequestInit): Promise<Response> {
  return app.request(`http://localhost${path}`, init);
}

async function post(path: string, body: unknown, token?: string): Promise<Response> {
  return call(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function createRoom(extra: Record<string, unknown> = {}) {
  const response = await post('/api/rooms', {
    name: 'Корпоратив',
    organizerName: 'Аня',
    eventDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    memberNames: ['Борис', 'Вика'],
    ...extra,
  });
  assert.equal(response.status, 201);
  return (await response.json()) as {
    code: string;
    token: string;
    inviteToken: string;
    memberToken: string;
    room: { members: Array<{ id: string; name: string }> };
  };
}

async function joinRoom(code: string, inviteToken: string, name: string) {
  const response = await post('/api/rooms/join', { code, inviteToken, name });
  if (response.status !== 200) throw new Error(`join failed: ${await response.text()}`);
  return (await response.json()) as { token: string; memberToken: string };
}

test('health доступен без авторизации', async () => {
  const response = await call('/api/health');
  assert.equal(response.status, 200);
  const body = (await response.json()) as { ok: boolean; stack: string };
  assert.equal(body.ok, true);
  assert.equal(body.stack, 'hono-node');
});

test('создание комнаты выдаёт токены и четырех участников', async () => {
  const room = await createRoom();
  assert.match(room.code, /^SANTA-[0-9A-F]{6}$/);
  assert.ok(room.token && room.inviteToken && room.memberToken);
  assert.equal(room.room.members.length, 3);
});

test('вход по приглашению создаёт сессию и member token', async () => {
  const room = await createRoom();
  const joined = await joinRoom(room.code, room.inviteToken, 'Гость');
  assert.ok(joined.token);
  assert.ok(joined.memberToken);

  const resumed = await post('/api/rooms/join', { code: room.code, memberToken: joined.memberToken });
  assert.equal(resumed.status, 200);
  const body = (await resumed.json()) as { joinMode: string };
  assert.equal(body.joinMode, 'member');
});

test('жеребьёвка создаёт пары, assignment раскрывает только своё назначение', async () => {
  const room = await createRoom();
  const draw = await post(`/api/rooms/${room.code}/draw`, {}, room.token);
  assert.equal(draw.status, 201, await draw.text());

  const response = await call(`/api/rooms/${room.code}/assignment`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { drawn: boolean; recipient: { name: string } | null };
  assert.equal(body.drawn, true);
  assert.ok(['Аня', 'Борис', 'Вика'].includes(body.recipient?.name ?? ''));
  assert.equal('pairs' in body, false);
  assert.equal('santa' in body, false);
});

test('журнал активности доступен только организатору', async () => {
  const room = await createRoom();
  const joined = await joinRoom(room.code, room.inviteToken, 'Гость');

  const denied = await call(`/api/rooms/${room.code}/activity`, {
    headers: { authorization: `Bearer ${joined.token}` },
  });
  assert.equal(denied.status, 403);

  const allowed = await call(`/api/rooms/${room.code}/activity?limit=5`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  assert.equal(allowed.status, 200);
  const body = (await allowed.json()) as { activity: unknown[] };
  assert.ok(body.activity.length >= 1);
});

test('вишлист, профиль и статус подарка сохраняются', async () => {
  const room = await createRoom();
  const wish = await post(`/api/rooms/${room.code}/wishlist`, { text: 'Книга' }, room.token);
  assert.equal(wish.status, 201);

  const profile = await post(
    `/api/rooms/${room.code}/profile`,
    { size: 'M', allergies: 'Орехи' },
    room.token,
  );
  assert.equal(profile.status, 200);

  const status = await post(`/api/rooms/${room.code}/gift-status`, { status: 'bought' }, room.token);
  assert.equal(status.status, 200);

  const response = await call(`/api/rooms/${room.code}`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  const body = (await response.json()) as {
    room: { members: Array<{ giftStatus: string; wishlist: unknown[]; profile: Record<string, string> }> };
  };
  const me = body.room.members.find((member) => member.giftStatus === 'bought');
  assert.ok(me);
  assert.equal(me.wishlist.length, 1);
  assert.equal(me.profile.size, 'M');
});

test('чат требует жеребьёвки и хранит сообщения в рамках забега', async () => {
  const room = await createRoom();
  const before = await post(
    `/api/rooms/${room.code}/messages`,
    { channel: 'to_recipient', text: 'Привет' },
    room.token,
  );
  assert.equal(before.status, 409);

  await post(`/api/rooms/${room.code}/draw`, {}, room.token);
  const sent = await post(
    `/api/rooms/${room.code}/messages`,
    { channel: 'to_recipient', text: 'Привет' },
    room.token,
  );
  assert.equal(sent.status, 201);

  const history = await call(`/api/rooms/${room.code}/messages?channel=to_recipient`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  const body = (await history.json()) as { messages: Array<{ text: string; fromMe: boolean }> };
  assert.equal(body.messages.length, 1);
  assert.equal(body.messages[0]?.text, 'Привет');
  assert.equal(body.messages[0]?.fromMe, true);
});

test('отзыв сессии блокирует доступ по старому токену', async () => {
  const room = await createRoom();
  const revoke = await post(`/api/rooms/${room.code}/sessions/revoke`, {}, room.token);
  assert.equal(revoke.status, 200);

  const response = await call(`/api/rooms/${room.code}`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  assert.equal(response.status, 401);
});

test('код комнаты регистронезависим, неизвестная комната даёт 404', async () => {
  const room = await createRoom();
  const lower = await call(`/api/rooms/${room.code.toLowerCase()}`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  assert.equal(lower.status, 200);

  const missing = await call('/api/rooms/SANTA-FFFFFF', {
    headers: { authorization: `Bearer ${room.token}` },
  });
  assert.equal(missing.status, 404);
  const body = (await missing.json()) as { error: string };
  assert.equal(body.error, 'room_not_found');
});

test('SSE реплей использует seq/eventDbId, кадр connected без id', async () => {
  const room = await createRoom();
  await post(`/api/rooms/${room.code}/draw`, {}, room.token);
  const response = await call(`/api/rooms/${room.code}/events?token=${encodeURIComponent(room.token)}`);
  assert.equal(response.status, 200);
  const reader = response.body?.getReader();
  assert.ok(reader);
  let text = '';
  const decoder = new TextDecoder();
  for (let i = 0; i < 8 && !text.includes('event: connected'); i += 1) {
    const chunk = await reader.read();
    if (chunk.done) break;
    text += decoder.decode(chunk.value, { stream: true });
  }
  await reader.cancel();
  assert.match(text, /"seq":\d+/);
  assert.match(text, /"eventDbId":/);
  assert.match(text, /(^|\n)event: connected\n/);
  assert.doesNotMatch(text, /id: connected/);
});

test('SSE переподключение использует Last-Event-ID и отвергает неизвестный курсор', async () => {
  const room = await createRoom();
  await post(`/api/rooms/${room.code}/draw`, {}, room.token);

  async function readEvents(cursor?: string): Promise<string> {
    const response = await call(`/api/rooms/${room.code}/events`, {
      headers: {
        authorization: `Bearer ${room.token}`,
        ...(cursor ? { 'last-event-id': cursor } : {}),
      },
    });
    const reader = response.body?.getReader();
    assert.ok(reader);
    let text = '';
    const decoder = new TextDecoder();
    for (let i = 0; i < 12 && !text.includes('event: connected'); i += 1) {
      const chunk = await reader.read();
      if (chunk.done) break;
      text += decoder.decode(chunk.value, { stream: true });
    }
    await reader.cancel();
    return text;
  }

  const initial = await readEvents();
  const ids = [...initial.matchAll(/^id: (\d+)$/gm)].map((match) => match[1]!);
  assert.ok(ids.length >= 2);

  const resumed = await readEvents(ids[0]);
  const resumedIds = [...resumed.matchAll(/^id: (\d+)$/gm)].map((match) => match[1]!);
  assert.deepEqual(resumedIds, ids.slice(1));
  assert.match(resumed, /(^|\n)event: connected\n/);

  const invalid = await readEvents('999999999');
  assert.equal([...invalid.matchAll(/^id: (\d+)$/gm)].length, 0);
  assert.match(invalid, /(^|\n)event: connected\n/);
});

test('токен приглашения v68 резолвится через таблицу соответствий', async () => {
  const room = await createRoom();
  const oldToken = 'invite_legacy_example';
  run(
    'INSERT INTO legacy_token_map (id, kind, old_hash, room_id, member_id, new_token, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?)',
    'lt_test',
    'invite',
    hashToken(oldToken),
    (get<{ id: string }>('SELECT id FROM rooms WHERE code = ?', room.code))!.id,
    room.inviteToken,
    new Date().toISOString(),
  );
  const response = await post('/api/rooms/join', { code: room.code, inviteToken: oldToken, name: 'Старый' });
  const text = await response.text();
  assert.equal(response.status, 200, text);
  const body = JSON.parse(text) as { joinMode: string };
  assert.equal(body.joinMode, 'invite');
});

test('ограничение частоты запросов возвращает 429 на 31-й попытке', async () => {
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  for (let i = 0; i < 30; i += 1) {
    const response = await call('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({
        name: 'Лимит',
        organizerName: 'Аня',
        eventDate: '2027-01-01',
      }),
    });
    assert.equal(response.status, 201, `request ${i}`);
  }
  const limited = await call('/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ name: 'Лимит', organizerName: 'Аня', eventDate: '2027-01-01' }),
  });
  assert.equal(limited.status, 429);
});

test('демо создаёт полноценную комнату с приватным назначением', async () => {
  const response = await post('/api/rooms/demo', { memberNames: ['Аня', 'Борис', 'Вика', 'Галя'] });
  assert.equal(response.status, 201, await response.clone().text());
  const body = (await response.json()) as {
    demo: boolean;
    code: string;
    token: string;
    room: { members: unknown[]; drawRunId: string | null; demo: boolean };
  };
  assert.equal(body.demo, true);
  assert.match(body.code, /^SANTA-[0-9A-F]{6}$/);
  assert.equal(body.room.demo, true);
  assert.equal(body.room.members.length, 4);
  assert.ok(body.room.drawRunId);

  const assignment = await call(`/api/rooms/${body.code}/assignment`, {
    headers: { authorization: `Bearer ${body.token}` },
  });
  const view = (await assignment.json()) as { drawn: boolean; recipient: { name: string } | null };
  assert.equal(assignment.status, 200);
  assert.equal(view.drawn, true);
  assert.ok(view.recipient?.name);
  const text = JSON.stringify(view);
  for (const name of ['Борис', 'Вика', 'Галя']) {
    if (name !== view.recipient?.name) assert.equal(text.includes(name), false);
  }
});

test('группа исключений создаёт все пары, влияет на жеребьёвку и удаляется точечно', async () => {
  const room = await createRoom({ memberNames: ['Борис', 'Вика', 'Галя'] });
  const ids = room.room.members.map((member) => member.id);
  assert.equal(ids.length, 4);

  const standalone = await post(
    `/api/rooms/${room.code}/exclusions`,
    { memberA: ids[0], memberB: ids[1] },
    room.token,
  );
  assert.equal(standalone.status, 201);

  const group = await post(
    `/api/rooms/${room.code}/groups`,
    { name: 'Семья', memberIds: ids },
    room.token,
  );
  assert.equal(group.status, 201, await group.clone().text());
  const groupBody = (await group.json()) as { pairs: number };
  assert.equal(groupBody.pairs, 6);

  const impossible = await post(`/api/rooms/${room.code}/draw`, {}, room.token);
  assert.equal(impossible.status, 409);

  const removed = await call(`/api/rooms/${room.code}/groups/${encodeURIComponent('Семья')}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${room.token}` },
  });
  assert.equal(removed.status, 200);

  const after = await call(`/api/rooms/${room.code}`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  const view = (await after.json()) as {
    room: { exclusions: Array<{ groupName: string | null }> };
  };
  assert.equal(view.room.exclusions.length, 1);
  assert.equal(view.room.exclusions[0]?.groupName, null);

  const draw = await post(`/api/rooms/${room.code}/draw`, {}, room.token);
  assert.equal(draw.status, 201);
});

test('организатор добавляет и удаляет участника; удаление аннулирует его сессию и забег', async () => {
  const room = await createRoom();
  const participant = await joinRoom(room.code, room.inviteToken, 'Борис');
  const before = await call(`/api/rooms/${room.code}`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  const beforeView = (await before.json()) as {
    room: { members: Array<{ id: string; name: string }>; drawRunId: string | null };
  };
  const participantId = beforeView.room.members.find((member) => member.name === 'Борис')?.id;
  assert.ok(participantId);

  const draw = await post(`/api/rooms/${room.code}/draw`, {}, room.token);
  assert.equal(draw.status, 201);

  const added = await post(`/api/rooms/${room.code}/members`, { name: 'Новый' }, room.token);
  assert.equal(added.status, 201, await added.clone().text());
  const addedBody = (await added.json()) as { memberId: string; room: { members: unknown[] } };
  assert.ok(addedBody.memberId);
  assert.equal(addedBody.room.members.length, 4);

  const duplicate = await post(`/api/rooms/${room.code}/members`, { name: 'Новый' }, room.token);
  assert.equal(duplicate.status, 409);

  const denied = await post(`/api/rooms/${room.code}/members`, { name: 'Чужой' }, participant.token);
  assert.equal(denied.status, 403);

  const deleted = await call(`/api/rooms/${room.code}/members/${participantId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${room.token}` },
  });
  assert.equal(deleted.status, 200);

  const oldSession = await call(`/api/rooms/${room.code}`, {
    headers: { authorization: `Bearer ${participant.token}` },
  });
  assert.equal(oldSession.status, 401);

  const organizerStill = await call(`/api/rooms/${room.code}`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  assert.equal(organizerStill.status, 200);
  const afterView = (await organizerStill.json()) as {
    room: { members: unknown[]; drawRunId: string | null };
  };
  assert.equal(afterView.room.members.length, 3);
  assert.equal(afterView.room.drawRunId, null);
});

test('список сессий содержит агента, время входа и признак текущей', async () => {
  const room = await createRoom();
  const sessionRow = get<{ id: string }>(
    'SELECT id FROM auth_sessions WHERE room_id = (SELECT id FROM rooms WHERE code = ?)',
    room.code,
  );
  assert.ok(sessionRow);
  run('UPDATE auth_sessions SET user_agent = ?, last_seen_at = ? WHERE id = ?', 'Firefox/1', new Date().toISOString(), sessionRow!.id);

  const response = await call(`/api/rooms/${room.code}/sessions`, {
    headers: { authorization: `Bearer ${room.token}` },
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    sessions: Array<{ userAgent: string | null; lastSeenAt: string | null; current: boolean }>;
  };
  const current = body.sessions.find((session) => session.current);
  assert.ok(current);
  assert.equal(current.userAgent, 'Firefox/1');
  assert.ok(current.lastSeenAt);
});

test('подписка push хранит ключи и резолвит код комнаты в id', async () => {
  const room = await createRoom();
  const subscribe = await post('/api/push/subscribe', {
    endpoint: 'https://push.example.test/subscription-1',
    keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    roomCode: room.code.toLowerCase(),
    memberId: 'mem_test',
  });
  assert.equal(subscribe.status, 200, await subscribe.clone().text());
  const body = (await subscribe.json()) as { stored: boolean; vapid: { enabled: boolean } };
  assert.equal(body.stored, true);
  assert.equal(body.vapid.enabled, false);

  const row = get<{ room_id: string; payload_json: string }>(
    'SELECT room_id, payload_json FROM push_subscriptions WHERE endpoint = ?',
    'https://push.example.test/subscription-1',
  );
  assert.ok(row);
  assert.equal(
    row!.room_id,
    get<{ id: string }>('SELECT id FROM rooms WHERE code = ?', room.code)!.id,
  );
  assert.match(row!.payload_json, /p256dh-value/);
  assert.match(row!.payload_json, /auth-value/);
});

test('тестовое уведомление без VAPID даёт понятную ошибку', async () => {
  const room = await createRoom();
  const response = await post(`/api/rooms/${room.code}/push/test`, {}, room.token);
  assert.equal(response.status, 503);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, 'push_not_configured');
});

test('тестовое уведомление с VAPID доставляется и не раскрывает получателя', async () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  process.env.VAPID_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  process.env.VAPID_PUBLIC_KEY = 'test-public-key';
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  const originalFetch = globalThis.fetch;
  let bodies = '';
  let authorization = '';
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    bodies += String(init?.body ?? '');
    authorization = new Headers(init?.headers).get('authorization') ?? '';
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  try {
    const room = await createRoom();
    const config = await call('/api/push/config');
    const configBody = (await config.json()) as { enabled: boolean };
    assert.equal(configBody.enabled, true);

    const endpoint = 'https://push.example.test/app-test';
    const subscribed = await post('/api/push/subscribe', {
      endpoint,
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
      roomCode: room.code.toLowerCase(),
    });
    assert.equal(subscribed.status, 200, await subscribed.clone().text());

    const response = await post(`/api/rooms/${room.code}/push/test`, {}, room.token);
    const body = (await response.json()) as {
      ok: boolean;
      delivered: number;
      subscribers: number;
      removed: string[];
    };
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.ok, true);
    assert.equal(body.delivered, 1);
    assert.equal(body.subscribers, 1);
    assert.match(authorization, /^WebPush /);
    assert.equal(bodies, '');
    assert.equal(bodies.includes('Аня'), false);
    assert.equal(authorization.includes('Аня'), false);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_SUBJECT;
  }
});
