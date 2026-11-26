import Redis from 'ioredis';
import { InMemoryEventBroker } from './events.ts';
import type { EventBroker, EventListener, RoomEvent } from './events.ts';

const CHANNEL_PREFIX = 'secret-santa:room:';
const CONNECT_TIMEOUT_MS = 5000;

function channelName(roomId: string): string {
  return `${CHANNEL_PREFIX}${roomId}`;
}

function options() {
  return {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: CONNECT_TIMEOUT_MS,
    retryStrategy: () => null,
  };
}

/** Pub/Sub-адаптер: канал на комнату, доставка всем процессам с общей шиной. */
export class RedisEventBroker implements EventBroker {
  readonly name = 'redis';
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly listeners = new Map<string, Set<EventListener>>();
  private ready = false;

  constructor(
    url: string,
    clients?: { publisher: Redis; subscriber: Redis },
  ) {
    this.publisher = clients?.publisher ?? new Redis(url, options());
    this.subscriber = clients?.subscriber ?? new Redis(url, options());
    for (const [role, client] of [
      ['publisher', this.publisher],
      ['subscriber', this.subscriber],
    ] as const) {
      client.on('error', (error: Error) => {
        console.warn(`Redis ${role}: ${error.message}`);
      });
    }
    this.subscriber.on('message', (channel: string, message: string) => {
      if (!channel.startsWith(CHANNEL_PREFIX)) return;
      const roomId = channel.slice(CHANNEL_PREFIX.length);
      let event: RoomEvent;
      try {
        event = JSON.parse(message) as RoomEvent;
      } catch {
        console.warn('Redis event: не удалось разобрать сообщение');
        return;
      }
      for (const listener of this.listeners.get(roomId) ?? []) listener(event);
    });
  }

  async start(): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        Promise.all([this.publisher.connect(), this.subscriber.connect()]),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Redis connect timeout')), CONNECT_TIMEOUT_MS);
        }),
      ]);
      this.ready = true;
      for (const roomId of this.listeners.keys()) {
        void this.subscriber.subscribe(channelName(roomId)).catch((error: Error) => {
          console.warn(`Redis subscribe: ${error.message}`);
        });
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  subscribe(roomId: string, listener: EventListener): () => void {
    const set = this.listeners.get(roomId) ?? new Set<EventListener>();
    const first = set.size === 0;
    set.add(listener);
    this.listeners.set(roomId, set);
    if (first && this.ready) {
      void this.subscriber.subscribe(channelName(roomId)).catch((error: Error) => {
        console.warn(`Redis subscribe: ${error.message}`);
      });
    }
    return () => {
      set.delete(listener);
      if (set.size > 0) return;
      this.listeners.delete(roomId);
      if (this.ready) {
        void this.subscriber.unsubscribe(channelName(roomId)).catch((error: Error) => {
          console.warn(`Redis unsubscribe: ${error.message}`);
        });
      }
    };
  }

  publish(roomId: string, event: RoomEvent): void {
    if (!this.ready) {
      console.warn('Redis event: брокер не готов, событие не опубликовано');
      return;
    }
    void this.publisher.publish(channelName(roomId), JSON.stringify(event)).catch((error: Error) => {
      console.warn(`Redis publish: ${error.message}`);
    });
  }

  async close(): Promise<void> {
    this.ready = false;
    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}

/** Без REDIS_URL сохраняется in-memory режим одного процесса. */
export async function createEventBroker(url = process.env.REDIS_URL): Promise<EventBroker> {
  if (!url) return new InMemoryEventBroker();
  const broker = new RedisEventBroker(url);
  try {
    await broker.start();
    return broker;
  } catch (error) {
    await broker.close();
    console.warn(`Redis недоступен, используется in-memory шина: ${String(error)}`);
    return new InMemoryEventBroker();
  }
}
