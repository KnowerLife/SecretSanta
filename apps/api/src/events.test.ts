import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type Redis from 'ioredis';

process.env.SECRET_SANTA_V69_DB_PATH = join(mkdtempSync(join(tmpdir(), 'ss-events-')), 'test.db');

const { InMemoryEventBroker, pruneRoomEvents, resetEventBroker, roomEvents, setEventBroker } =
  await import('./events.ts');
const { RedisEventBroker } = await import('./redis-events.ts');
const { run, all } = await import('./db.ts');

function sample(id: string) {
  return { id, type: 'room.message', actor: null, payload: { id }, createdAt: new Date().toISOString() };
}

test('фасад шины использует подменённую реализацию и корректно отписывается', () => {
  const broker = new InMemoryEventBroker();
  setEventBroker(broker);
  const received: string[] = [];
  const unsubscribe = roomEvents.subscribe('room_a', (event) => received.push(event.id));
  roomEvents.publish('room_a', sample('evt_1'));
  roomEvents.publish('room_b', sample('evt_2'));
  assert.deepEqual(received, ['evt_1']);
  unsubscribe();
  roomEvents.publish('room_a', sample('evt_3'));
  assert.deepEqual(received, ['evt_1']);
  resetEventBroker();
});

class FakeRedis extends EventEmitter {
  static subscribers = new Set<FakeRedis>();

  async connect(): Promise<void> {}
  async quit(): Promise<void> {
    FakeRedis.subscribers.delete(this);
  }
  async subscribe(...channels: string[]): Promise<number> {
    for (const channel of channels) FakeRedis.subscribers.add(this);
    return channels.length;
  }
  async unsubscribe(...channels: string[]): Promise<number> {
    for (const channel of channels) FakeRedis.subscribers.delete(this);
    return channels.length;
  }
  async publish(channel: string, message: string): Promise<number> {
    for (const subscriber of FakeRedis.subscribers) subscriber.emit('message', channel, message);
    return 1;
  }
}

function fakeClients(): { publisher: Redis; subscriber: Redis } {
  return {
    publisher: new FakeRedis() as unknown as Redis,
    subscriber: new FakeRedis() as unknown as Redis,
  };
}

test('Redis-адаптер доставляет событие между двумя независимыми экземплярами', async () => {
  FakeRedis.subscribers.clear();
  const first = new RedisEventBroker('redis://fake', fakeClients());
  const second = new RedisEventBroker('redis://fake', fakeClients());
  await first.start();
  await second.start();

  const received: string[] = [];
  const unsubscribe = second.subscribe('room_shared', (event) => received.push(event.id));
  first.publish('room_shared', sample('cross_1'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(received, ['cross_1']);

  unsubscribe();
  first.publish('room_shared', sample('cross_2'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(received, ['cross_1']);
  await Promise.all([first.close(), second.close()]);
});

test('очистка удаляет только события старше окна', async () => {
  process.env.SECRET_SANTA_EVENT_RETENTION_MS = '1000';
  run(
    'INSERT INTO rooms (id, code, name, created_at) VALUES (?, ?, ?, ?)',
    'room_a',
    'EVT-aaaaaa',
    'Тестовая комната',
    new Date().toISOString(),
  );
  const now = Date.now();
  run(
    'INSERT INTO room_events (id, room_id, type, actor, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    'old_event',
    'room_a',
    'room.message',
    null,
    '{}',
    new Date(now - 5000).toISOString(),
  );
  run(
    'INSERT INTO room_events (id, room_id, type, actor, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    'fresh_event',
    'room_a',
    'room.message',
    null,
    '{}',
    new Date(now).toISOString(),
  );
  assert.equal(pruneRoomEvents(new Date(now)), 1);
  const ids = all<{ id: string }>('SELECT id FROM room_events ORDER BY id').map((row) => row.id);
  assert.deepEqual(ids, ['fresh_event']);
  delete process.env.SECRET_SANTA_EVENT_RETENTION_MS;
});
