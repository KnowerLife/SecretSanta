import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.SECRET_SANTA_V69_DB_PATH = join(mkdtempSync(join(tmpdir(), 'ss-push-')), 'test.db');
process.env.SECRET_SANTA_SECRET = 'push-test-secret';

const { get, run } = await import('./db.ts');
const { pushEnabled, sendRoomPush, vapidPublicKeyFromPrivate, vapidStatus } = await import('./push.ts');

const ENDPOINT = 'https://push.example.test/abc';
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const PRIVATE_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const PUBLIC_KEY = vapidPublicKeyFromPrivate(privateKey);

function seedSubscription(): string {
  const roomId = `room_${Math.random().toString(36).slice(2)}`;
  run('DELETE FROM push_subscriptions WHERE endpoint = ?', ENDPOINT);
  run(
    'INSERT INTO rooms (id, code, name, created_at) VALUES (?, ?, ?, ?)',
    roomId,
    `PUSH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    'Тестовая комната',
    new Date().toISOString(),
  );
  run(
    'INSERT INTO push_subscriptions (endpoint, room_id, member_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?)',
    ENDPOINT,
    roomId,
    'mem_test',
    JSON.stringify({ keys: { p256dh: 'p', auth: 'a' } }),
    new Date().toISOString(),
  );
  return roomId;
}

function withFetch(handler: typeof fetch, fn: () => Promise<unknown>): Promise<unknown> {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test('без VAPID отправка отключена и сетевых вызовов нет', async () => {
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_PUBLIC_KEY;
  const roomId = seedSubscription();
  let calls = 0;
  await withFetch((() => {
    calls += 1;
    return Promise.resolve(new Response(null, { status: 201 }));
  }) as typeof fetch, async () => {
    const result = await sendRoomPush(roomId);
    assert.deepEqual(result, { delivered: 0, failures: 0, removed: [], disabled: true });
  });
  assert.equal(calls, 0);
  assert.equal(pushEnabled(), false);
  assert.match(vapidStatus().reason ?? '', /не заданы/);
});

test('несовпадение пары VAPID и неверный subject отключают push', () => {
  const other = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  process.env.VAPID_PRIVATE_KEY = PRIVATE_PEM;
  process.env.VAPID_PUBLIC_KEY = vapidPublicKeyFromPrivate(other.privateKey);
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  assert.equal(pushEnabled(), false);
  assert.match(vapidStatus().reason ?? '', /не соответствует/);

  process.env.VAPID_PUBLIC_KEY = PUBLIC_KEY;
  process.env.VAPID_SUBJECT = 'not-a-url';
  assert.equal(pushEnabled(), false);
  assert.match(vapidStatus().reason ?? '', /VAPID_SUBJECT/);

  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  assert.equal(pushEnabled(), true);
  assert.equal(vapidStatus().reason, undefined);
});

test('Web Push подписан ES256 и не содержит персональных данных', async () => {
  process.env.VAPID_PRIVATE_KEY = PRIVATE_PEM;
  process.env.VAPID_PUBLIC_KEY = PUBLIC_KEY;
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  const roomId = seedSubscription();

  const seen: Array<{ auth: string; body: string; topic: string }> = [];
  await withFetch((async (_input: unknown, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    seen.push({
      auth: headers.get('authorization') ?? '',
      body: String(init?.body ?? ''),
      topic: headers.get('topic') ?? '',
    });
    return new Response(null, { status: 201 });
  }) as typeof fetch, async () => {
    const result = await sendRoomPush(roomId);
    assert.equal(result.delivered, 1);
    assert.equal(result.failures, 0);
  });

  assert.equal(seen.length, 1);
  assert.match(seen[0]!.auth, /^WebPush /);
  assert.equal(seen[0]!.body, '');
  assert.match(seen[0]!.topic, /^secret-santa-/);
  const jwt = seen[0]!.auth.slice('WebPush '.length).split('.');
  assert.equal(jwt.length, 3);
  const payload = JSON.parse(Buffer.from(jwt[1]!, 'base64url').toString('utf8')) as Record<string, unknown>;
  assert.equal(payload.aud, 'https://push.example.test');
  assert.equal(payload.sub, 'mailto:test@example.com');
  const serialized = JSON.stringify(payload) + seen[0]!.body + seen[0]!.topic;
  for (const secret of ['Борис', 'Вика', 'recipient', 'wishlist', 'Книга', 'member_test']) {
    assert.equal(serialized.includes(secret), false);
  }
});

test('недействительная подписка удаляется и помечается как удалённая', async () => {
  process.env.VAPID_PRIVATE_KEY = PRIVATE_PEM;
  process.env.VAPID_PUBLIC_KEY = PUBLIC_KEY;
  const roomId = seedSubscription();
  await withFetch((() => Promise.resolve(new Response(null, { status: 410 }))) as typeof fetch, async () => {
    const result = await sendRoomPush(roomId);
    assert.deepEqual(result.removed, [ENDPOINT]);
    assert.equal(result.delivered, 0);
  });
  assert.equal(get('SELECT endpoint FROM push_subscriptions WHERE endpoint = ?', ENDPOINT), undefined);
});
