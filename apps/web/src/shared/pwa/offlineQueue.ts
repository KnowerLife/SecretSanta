export interface QueuedRequest {
  id: string;
  path: string;
  body: unknown;
  token: string | null;
  attempts: number;
  createdAt: string;
}

const QUEUE_KEY = 'ss:v69:message-queue';
const MAX_ATTEMPTS = 10;

export function readQueue(): QueuedRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]): void {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function queueMessage(path: string, body: unknown, token: string | null): QueuedRequest {
  const request: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    path,
    body,
    token,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  writeQueue([...readQueue(), request]);
  return request;
}

export function removeQueued(id: string): void {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

let activeFlush: Promise<{ sent: number; pending: number }> | null = null;

/**
 * Отправляет очередь; после 10 неудач сообщение остаётся для ручной обработки.
 * Параллельные вызовы (например, слушатели `online` в двух компонентах)
 * переиспользуют уже идущую отправку, поэтому сообщения не дублируются.
 */
export function flushQueue(
  send: (request: QueuedRequest) => Promise<void>,
): Promise<{ sent: number; pending: number }> {
  if (activeFlush) return activeFlush;
  activeFlush = runFlush(send).finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

async function runFlush(
  send: (request: QueuedRequest) => Promise<void>,
): Promise<{ sent: number; pending: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { sent: 0, pending: 0 };

  const remaining: QueuedRequest[] = [];
  let sent = 0;
  for (const request of queue) {
    if (request.attempts >= MAX_ATTEMPTS) {
      remaining.push(request);
      continue;
    }
    try {
      await send(request);
      sent += 1;
    } catch {
      remaining.push({ ...request, attempts: request.attempts + 1 });
    }
  }
  writeQueue(remaining);
  return { sent, pending: remaining.length };
}
