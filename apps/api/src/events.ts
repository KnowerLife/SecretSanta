import { db, run } from './db.ts';

export interface RoomEvent {
  id: string;
  type: string;
  actor: string | null;
  payload: unknown;
  createdAt: string;
  roomCode?: string;
  seq?: number;
  eventDbId?: string;
  /** Служебный кадр подключения не имеет id, как и в v68. */
  omitId?: boolean;
}

export type EventListener = (event: RoomEvent) => void;

/** Адаптер доставки: in-memory для одного процесса, Redis — для нескольких. */
export interface EventBroker {
  readonly name: string;
  subscribe(roomId: string, listener: EventListener): () => void;
  publish(roomId: string, event: RoomEvent): void;
}

export class InMemoryEventBroker implements EventBroker {
  readonly name = 'memory';
  private listeners = new Map<string, Set<EventListener>>();

  subscribe(roomId: string, listener: EventListener): () => void {
    const set = this.listeners.get(roomId) ?? new Set<EventListener>();
    set.add(listener);
    this.listeners.set(roomId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(roomId);
    };
  }

  publish(roomId: string, event: RoomEvent): void {
    for (const listener of this.listeners.get(roomId) ?? []) {
      listener(event);
    }
  }
}

const memoryBroker = new InMemoryEventBroker();
let activeBroker: EventBroker = memoryBroker;

/** Единая точка входа для publish/subscribe; реализацию меняет startup. */
export const roomEvents: EventBroker = {
  get name() {
    return activeBroker.name;
  },
  subscribe(roomId, listener) {
    return activeBroker.subscribe(roomId, listener);
  },
  publish(roomId, event) {
    activeBroker.publish(roomId, event);
  },
};

export function setEventBroker(broker: EventBroker): void {
  activeBroker = broker;
}

export function resetEventBroker(): void {
  activeBroker = memoryBroker;
}

/** События старше окна удаляются; активные курсоры внутри окна не ломаются. */
export function pruneRoomEvents(now = new Date()): number {
  const configured = Number(process.env.SECRET_SANTA_EVENT_RETENTION_MS ?? 7 * 24 * 3600 * 1000);
  const window = Number.isFinite(configured) && configured > 0 ? configured : 7 * 24 * 3600 * 1000;
  const cutoff = new Date(now.getTime() - window).toISOString();
  const before = Number(
    (db.prepare('SELECT COUNT(*) AS n FROM room_events').get() as { n: number | bigint }).n,
  );
  run('DELETE FROM room_events WHERE created_at < ?', cutoff);
  const after = Number(
    (db.prepare('SELECT COUNT(*) AS n FROM room_events').get() as { n: number | bigint }).n,
  );
  return before - after;
}

export function formatSse(event: RoomEvent): string {
  const data = {
    actor: event.actor,
    payload: event.payload,
    createdAt: event.createdAt,
    ...(event.roomCode ? { roomCode: event.roomCode } : {}),
    ...(event.seq !== undefined ? { seq: event.seq } : {}),
    ...(event.eventDbId ? { eventDbId: event.eventDbId } : {}),
  };
  const id = event.omitId ? '' : `id: ${event.id}\n`;
  return `${id}event: ${event.type}\ndata: ${JSON.stringify(data)}\n\n`;
}
