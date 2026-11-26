import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.SECRET_SANTA_V69_DB_PATH = join(mkdtempSync(join(tmpdir(), 'ss-v69-')), 'test.db');
process.env.SECRET_SANTA_SECRET = 'test-secret';

const { app } = await import('./app.ts');

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
