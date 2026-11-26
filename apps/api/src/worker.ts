import { all, get, run } from './db.ts';
import { pushEnabled, sendRoomPush } from './push.ts';

interface RoomRow {
  id: string;
  code: string;
  name: string;
  event_date: string | null;
}

interface JobRow {
  id: string;
  room_id: string;
  kind: string;
  payload_json: string;
  status: string;
  scheduled_at: string | null;
}

const REMINDER_OFFSETS = [3, 1, 0] as const;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function offsetDate(eventDate: string, days: number): string {
  const date = new Date(`${eventDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return dayKey(date);
}

/** Создаёт задачи напоминаний за 3/1/0 дней, не дублируя их. */
export function scheduleReminders(now = new Date()): number {
  const rooms = all<RoomRow>('SELECT id, code, name, event_date FROM rooms WHERE status = ?', 'active');
  const today = dayKey(now);
  let created = 0;

  for (const room of rooms) {
    if (!room.event_date) continue;
    for (const days of REMINDER_OFFSETS) {
      if (offsetDate(room.event_date, days) !== today) continue;
      const payload = JSON.stringify({ roomCode: room.code, days, name: room.name });
      const existing = get<{ id: string }>(
        "SELECT id FROM notification_jobs WHERE room_id = ? AND kind = 'reminder' AND payload_json = ?",
        room.id,
        payload,
      );
      if (existing) continue;
      run(
        'INSERT INTO notification_jobs (id, room_id, channel, kind, payload_json, status, scheduled_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        room.id,
        'push',
        'reminder',
        payload,
        'queued',
        now.toISOString(),
        now.toISOString(),
      );
      created += 1;
    }
  }
  return created;
}

/** Отправляет готовые задачи и фиксирует результат. */
export async function processJobs(): Promise<{ processed: number; delivered: number; failed: number }> {
  const jobs = all<JobRow>(
    "SELECT id, room_id, kind, payload_json, status, scheduled_at FROM notification_jobs WHERE status IN ('queued', 'pending') AND (scheduled_at IS NULL OR scheduled_at <= ?) ORDER BY created_at LIMIT 100",
    new Date().toISOString(),
  );
  let delivered = 0;
  let failed = 0;

  for (const job of jobs) {
    if (job.kind !== 'reminder' && job.kind !== 'draw' && job.kind !== 'message') {
      run('UPDATE notification_jobs SET status = ? WHERE id = ?', 'failed', job.id);
      failed += 1;
      continue;
    }
    const result = await sendRoomPush(job.room_id);
    if (result.disabled) {
      // Без VAPID задача остаётся в очереди и будет отправлена после настройки ключей.
      failed += 1;
      continue;
    }
    if (result.failures > 0 && result.delivered === 0) {
      run('UPDATE notification_jobs SET status = ? WHERE id = ?', 'failed', job.id);
      failed += 1;
    } else {
      run('UPDATE notification_jobs SET status = ? WHERE id = ?', 'sent', job.id);
      delivered += 1;
    }
  }
  return { processed: jobs.length, delivered, failed };
}

export async function runWorkerOnce(): Promise<void> {
  scheduleReminders();
  await processJobs();
}

const invokedDirectly = process.argv[1]?.endsWith('worker.ts') ?? false;
if (invokedDirectly) {
  const interval = Number(process.env.SECRET_SANTA_WORKER_INTERVAL_MS ?? 30_000);
  if (!pushEnabled()) {
    console.warn('VAPID не настроен: воркер ждёт ключи, задачи остаются в очереди');
  }
  await runWorkerOnce();
  setInterval(() => {
    void runWorkerOnce();
  }, Number.isFinite(interval) && interval > 0 ? interval : 30_000);
}
