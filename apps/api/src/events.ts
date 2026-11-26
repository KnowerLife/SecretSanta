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

type Listener = (event: RoomEvent) => void;

/** In-memory шина одного процесса; для горизонтального масштабирования нужен Redis. */
class RoomEventBus {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(roomId: string, listener: Listener): () => void {
    const set = this.listeners.get(roomId) ?? new Set<Listener>();
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

export const roomEvents = new RoomEventBus();

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
