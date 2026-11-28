import { createServerFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';
import type {
  AssignmentView,
  MessageView,
  RoomView,
} from '@secret-santa/shared/contracts';
import { webReporter } from '../../shared/observability.ts';

const API_BASE = process.env.SECRET_SANTA_API_TARGET ?? 'http://127.0.0.1:8787';

export interface RoomBootstrap {
  ok: boolean;
  room?: RoomView;
  me?: { id: string; name: string; role: string; giftStatus: string };
  assignment?: AssignmentView;
  messages?: MessageView[];
  error?: string;
}

async function serverApi<T>(path: string, token: string | undefined): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

/** Серверный загрузчик: читает токен из cookie и собирает HTML rooms-страницы. */
export const loadRoomBootstrap = createServerFn({ method: 'GET' })
  .validator((input: { code: string }) => input)
  .handler(async ({ data }): Promise<RoomBootstrap> => {
    const token =
      getCookie(`ss_token_${data.code.toUpperCase()}`) ?? getCookie('ss_token');
    if (!token) return { ok: false, error: 'unauthorized' };

    try {
      const roomData = await serverApi<{ room: RoomView; me: RoomBootstrap['me'] }>(
        `/api/rooms/${encodeURIComponent(data.code)}`,
        token,
      );
      const assignment = await serverApi<AssignmentView>(
        `/api/rooms/${encodeURIComponent(data.code)}/assignment`,
        token,
      );
      const messages = await serverApi<{ messages: MessageView[] }>(
        `/api/rooms/${encodeURIComponent(data.code)}/messages`,
        token,
      );
      return {
        ok: true,
        room: roomData.room,
        me: roomData.me,
        // Имя получателя раскрывается только явным действием в UI: в SSR-данные
        // попадает лишь факт жеребьёвки, подробности запрашивает браузер.
        assignment: { drawn: assignment.drawn, recipient: null },
        messages: messages.messages,
      };
    } catch (error) {
      // Without a room code: errors may contain upstream URLs with private data.
      webReporter.captureException(error, { source: 'room-bootstrap' });
      return { ok: false, error: error instanceof Error ? error.message : 'network' };
    }
  });
