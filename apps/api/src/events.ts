export interface RoomEvent {
  id: string;
  type: string;
  actor: string | null;
  payload: unknown;
  createdAt: string;
}

type Listener = (event: RoomEvent) => void;

/** Оpentown in-memory шина для одного процесса; для horizontal scaling нужен Redis. */
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
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify({
    actor: event.actor,
    payload: event.payload,
    createdAt: event.createdAt,
  })}\n\n`;
}
