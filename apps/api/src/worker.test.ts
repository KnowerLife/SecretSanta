import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.SECRET_SANTA_V69_DB_PATH = join(mkdtempSync(join(tmpdir(), 'ss-worker-')), 'test.db');
process.env.SECRET_SANTA_SECRET = 'worker-test-secret';

const { all, get, run } = await import('./db.ts');
const { processJobs, runWorkerOnce, scheduleReminders } = await import('./worker.ts');
const { vapidPublicKeyFromPrivate } = await import('./push.ts');

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const PRIVATE_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const PUBLIC_KEY = vapidPublicKeyFromPrivate(privateKey);
const ENDPOINT = 'https://push.example.test/worker';

function seedRoom(eventDate: string): string {
  const roomId = `room_${Math.random().toString(36).slice(2)}`;
  run(
    'INSERT INTO rooms (id, code, name, event_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    roomId,
    `WRK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    'Напоминание',
    eventDate,
    'active',
    new Date().toISOString(),
  );
  return roomId;
}

function jobs(roomId: string) {
  return all<{ id: string; kind: string; status: string; payload_json: string }>(
    'SELECT id, kind, status, payload_json FROM notification_jobs WHERE room_id = ?',
    roomId,
  );
}

function withFetch(handler: typeof fetch, fn: () => Promise<unknown>): Promise<unknown> {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

test('напоминания на сегодня создаются один раз на окно', () => {
  const today = new Date().toISOString().slice(0, 10);
  const roomId = seedRoom(today);
  const first = scheduleReminders(new Date(`${today}T12:00:00Z`));
  assert.ok(first >= 1);
  const created = jobs(roomId).filter((job) => job.kind === 'reminder');
  assert.equal(created.length, 1);
  assert.match(created[0]!.payload_json, /"days":0/);
  assert.match(created[0]!.payload_json, /Напоминание/);

  const second = scheduleReminders(new Date(`${today}T12:00:00Z`));
  assert.equal(jobs(roomId).filter((job) => job.kind === 'reminder').length, 1);
  assert.equal(second, 0);
});

test('без VAPID задача остаётся в очереди и не помечается как доставленная', async () => {
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_PUBLIC_KEY;
  const roomId = seedRoom(new Date().toISOString().slice(0, 10));
  scheduleReminders();
  const result = await processJobs();
  assert.ok(result.processed >= 1);
  assert.equal(result.delivered, 0);
  assert.equal(result.failed, result.processed);
  assert.ok(
    jobs(roomId).some((job) => job.status === 'queued' || job.status === 'pending'),
  );
});

test('воркер отправляет задачу, удаляет мёртвую подписку и не падает на ошибках', async () => {
  process.env.VAPID_PRIVATE_KEY = PRIVATE_PEM;
  process.env.VAPID_PUBLIC_KEY = PUBLIC_KEY;
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  const roomId = seedRoom(new Date().toISOString().slice(0, 10));
  run(
    'INSERT INTO push_subscriptions (endpoint, room_id, member_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?)',
    ENDPOINT,
    roomId,
    'mem_test',
    JSON.stringify({ keys: { p256dh: 'p', auth: 'a' } }),
    new Date().toISOString(),
  );
  scheduleReminders();

  let status = 201;
  let bodies = '';
  await withFetch((async (_input: unknown, init?: RequestInit) => {
    bodies += String(init?.body ?? '');
    return new Response(null, { status });
  }) as typeof fetch, async () => {
    const first = await processJobs();
    assert.ok(first.delivered >= 1);
    assert.equal(bodies, '');

    status = 404;
    run('UPDATE notification_jobs SET status = ? WHERE room_id = ?', 'queued', roomId);
    const second = await runWorkerOnce().then(() => processJobs());
    assert.equal(second.failed, 0);
  });

  assert.equal(get('SELECT endpoint FROM push_subscriptions WHERE endpoint = ?', ENDPOINT), undefined);
  assert.ok(jobs(roomId).every((job) => job.status === 'sent'));
});
