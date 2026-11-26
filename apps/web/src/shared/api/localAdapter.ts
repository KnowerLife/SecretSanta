/**
 * Адаптер локального режима с тем же контрактом вызова, что и HTTP-клиент.
 * Все операции читают/пишут версионированное состояние в localStorage.
 */

import type { FetchOptions } from './http.ts';
import { apiError, roomToken, serverFetch } from './http.ts';
import {
  addLocalExclusion,
  addLocalGroup,
  addLocalMember,
  addLocalWishlist,
  appendOutbox,
  clearOutbox,
  createLocalRoom,
  dirtyRoomCodes,
  drawLocalRoom,
  getLocalRoomBootstrap,
  hasDirtyRooms,
  joinLocalRoom,
  localAssignment,
  localInvite,
  localRoomView,
  localSessions,
  markRoomsClean,
  postLocalMessage,
  readLocalActivity,
  readLocalMessages,
  readOutbox,
  removeLocalExclusion,
  removeLocalGroup,
  removeLocalMember,
  removeLocalWishlist,
  resetLocalDraw,
  resetLocalState,
  seedLocalState,
  setLocalGiftStatus,
  setLocalProfile,
  writeOutbox,
} from './localState.ts';
import type { LocalOutboxEntry } from './localState.ts';

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Операции, которые можно безопасно повторить на сервере при явной синхронизации. */
const REPLAYABLE = /\/(wishlist|gift-status|profile|messages|exclusions|groups|members|draw)(\/|$)/;

function maybeQueue(options: FetchOptions, path: string, code: string, method: string): void {
  if (!REPLAYABLE.test(path)) return;
  appendOutbox({
    path,
    method,
    body: options.body,
    code,
    token: options.token === undefined ? roomToken(code) : options.token,
  });
}

export async function localRequest<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = new URL(path, 'http://local.invalid');
  const route = url.pathname.replace(/\/+$/, '') || '/';
  const method = (options.method ?? 'GET').toUpperCase();
  const body = record(options.body);

  const codeFromPath = route.match(/^\/api\/rooms\/([^/]+)/)?.[1] ?? '';
  const code = text(options.code) || (codeFromPath ? decodeURIComponent(codeFromPath).toUpperCase() : '');

  const reply = <R>(value: R): T => value as unknown as T;

  if (route === '/api/health') {
    return reply({ ok: true, version: 'local-v69', local: true, time: new Date().toISOString() });
  }
  if (route === '/api/push/config') {
    return reply({ enabled: false, publicKey: null, subject: '' });
  }
  if (route === '/api/push/subscribe' || route === '/api/push/unsubscribe') {
    return reply({ ok: true, local: true });
  }

  if (route === '/api/rooms' && method === 'POST') {
    return reply(createLocalRoom(body));
  }
  if (route === '/api/rooms/demo' && method === 'POST') {
    const names = Array.isArray(body.memberNames) ? body.memberNames.map(text) : undefined;
    return reply(createLocalRoom({ demo: true, organizerName: names?.[0] ?? 'Вы', memberNames: names?.slice(1) ?? ['Аня', 'Боря', 'Вика'] }));
  }
  if (route === '/api/rooms/join' && method === 'POST') {
    return reply(joinLocalRoom(body));
  }

  const roomMatch = route.match(/^\/api\/rooms\/([^/]+)(?:\/(.*))?$/);
  if (roomMatch) {
    const action = roomMatch[2] ?? '';
    const roomCode = decodeURIComponent(roomMatch[1] ?? '').toUpperCase();

    if (!action && method === 'GET') return reply(localRoomView(roomCode));
    if (action === 'assignment' && method === 'GET') return reply(localAssignment(roomCode));

    if (action === 'draw' && method === 'POST') {
      const requested = Array.isArray(body.exclusions)
        ? body.exclusions
            .filter((pair): pair is unknown[] => Array.isArray(pair) && pair.length === 2)
            .map((pair) => [text(pair[0]), text(pair[1])] as [string, string])
        : [];
      const result = drawLocalRoom(roomCode, requested);
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }
    if (action === 'draw/reset' && method === 'POST') {
      const result = resetLocalDraw(roomCode);
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }

    if (action === 'exclusions' && method === 'POST') {
      const result = addLocalExclusion(roomCode, {
        memberA: text(body.memberA),
        memberB: text(body.memberB),
        groupName: typeof body.groupName === 'string' ? body.groupName : undefined,
      });
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }
    const exclusionMatch = action.match(/^exclusions\/([^/]+)\/([^/]+)$/);
    if (exclusionMatch && method === 'DELETE') {
      const result = removeLocalExclusion(
        roomCode,
        decodeURIComponent(exclusionMatch[1] ?? ''),
        decodeURIComponent(exclusionMatch[2] ?? ''),
      );
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }

    if (action === 'groups' && method === 'POST') {
      const result = addLocalGroup(roomCode, {
        name: text(body.name),
        memberIds: Array.isArray(body.memberIds) ? body.memberIds.map(text) : [],
      });
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }
    const groupMatch = action.match(/^groups\/(.+)$/);
    if (groupMatch && method === 'DELETE') {
      const result = removeLocalGroup(roomCode, decodeURIComponent(groupMatch[1] ?? ''));
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }

    if (action === 'members' && method === 'POST') {
      const result = addLocalMember(roomCode, text(body.name));
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }
    const memberMatch = action.match(/^members\/([^/]+)$/);
    if (memberMatch && method === 'DELETE') {
      const result = removeLocalMember(roomCode, decodeURIComponent(memberMatch[1] ?? ''));
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }

    if (action === 'wishlist' && method === 'POST') {
      const result = addLocalWishlist(roomCode, text(body.text));
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }
    const wishMatch = action.match(/^wishlist\/([^/]+)$/);
    if (wishMatch && method === 'DELETE') {
      const result = removeLocalWishlist(roomCode, decodeURIComponent(wishMatch[1] ?? ''));
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }

    if (action === 'gift-status' && method === 'POST') {
      const result = setLocalGiftStatus(roomCode, text(body.status));
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }
    if (action === 'profile' && method === 'POST') {
      const patch: Record<string, string> = {};
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') patch[key] = value;
      }
      const result = setLocalProfile(roomCode, patch);
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }

    if (action === 'activity' && method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? 20);
      return reply(readLocalActivity(roomCode, limit));
    }
    if (action === 'messages' && method === 'GET') return reply(readLocalMessages(roomCode));
    if (action === 'messages' && method === 'POST') {
      const result = postLocalMessage(roomCode, { channel: text(body.channel), text: text(body.text) });
      maybeQueue(options, route, roomCode, method);
      return reply(result);
    }

    if (action === 'invites' && method === 'POST') return reply(localInvite(roomCode));
    if (action === 'member-tokens' && method === 'POST') {
      const view = localRoomView(roomCode);
      return reply({ ok: true, memberToken: roomToken(roomCode) ?? `local.mem.${view.me.id}` });
    }
    if (action === 'sessions' && method === 'GET') return reply(localSessions(roomCode));
    if (action === 'sessions/revoke' && method === 'POST') return reply({ ok: true });
    if (action === 'notifications' && method === 'POST') {
      return reply({ ok: true, jobId: newId('job'), local: true });
    }
    if (action === 'push/test' && method === 'POST') {
      return reply({ ok: true, delivered: 0, subscribers: 0, local: true });
    }
  }

  throw apiError('local_route_not_supported', 404, 'local_route_not_supported');
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

export interface OutboxFlushResult {
  sent: number;
  pending: number;
  codes: string[];
}

/**
 * Отправляет накопленные локальные изменения на сервер. Вызывается только после
 * явного выбора пользователя — никогда не запускается автоматически.
 */
export async function flushLocalOutbox(
  send: (entry: LocalOutboxEntry) => Promise<void> = (entry) =>
    serverFetch(entry.path, { method: entry.method, body: entry.body, token: entry.token }).then(() => undefined),
): Promise<OutboxFlushResult> {
  const entries = readOutbox();
  const codes = dirtyRoomCodes();
  if (entries.length === 0) {
    return { sent: 0, pending: 0, codes };
  }

  const pending: LocalOutboxEntry[] = [];
  let sent = 0;
  for (const entry of entries) {
    try {
      await send(entry);
      sent += 1;
    } catch {
      pending.push(entry);
    }
  }
  writeOutbox(pending);
  if (pending.length === 0) markRoomsClean();
  return { sent, pending: pending.length, codes: pending.length === 0 ? [] : codes };
}

/** Явный отказ от отправки: данные остаются в браузере, повторного запроса не будет. */
export function keepLocalOnly(): void {
  clearOutbox();
  markRoomsClean();
}

export {
  clearOutbox,
  dirtyRoomCodes,
  getLocalRoomBootstrap,
  hasDirtyRooms,
  readOutbox,
  resetLocalState,
  seedLocalState,
  writeOutbox,
};
