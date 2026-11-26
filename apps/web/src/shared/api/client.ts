/**
 * Единая точка входа для всех запросов веб-приложения.
 *
 * `apiFetch` и `request` имеют одинаковую сигнатуру: при доступном API запрос
 * уходит на сервер, при недоступном — выполняется локальным адаптером. Вызывающие
 * сайты не меняются при переключении режима.
 */

import { isApiAvailable, markApiUnavailable, markApiAvailable, shouldUseLocal } from './availability.ts';
import { localRequest } from './localAdapter.ts';
import { findLocalRoom } from './localState.ts';
import type { ApiError, FetchOptions } from './http.ts';
import { serverFetch } from './http.ts';

export {
  API_BASE,
  apiError,
  forgetRoom,
  memberTokenKey,
  rememberRoom,
  roomToken,
  tokenKey,
} from './http.ts';
export type { ApiError, FetchOptions } from './http.ts';
export {
  isApiAvailable,
  isBrowserOffline,
  isLocalMode,
  LOCAL_MODE_EVENT,
  markApiAvailable,
  markApiUnavailable,
  setLocalMode,
  shouldUseLocal,
} from './availability.ts';
export {
  clearOutbox,
  dirtyRoomCodes,
  flushLocalOutbox,
  getLocalRoomBootstrap,
  hasDirtyRooms,
  keepLocalOnly,
  localRequest,
  readOutbox,
  seedLocalState,
  writeOutbox,
} from './localAdapter.ts';
export {
  LOCAL_OUTBOX_KEY,
  LOCAL_STATE_KEY,
  LOCAL_STATE_VERSION,
  emptyLocalState,
  markRoomsClean,
  readLocalState,
  resetLocalState,
  writeLocalState,
} from './localState.ts';
export {
  getPushConfig,
  getStoredSubscription,
  isPushEnabled,
  isPushSupported,
  sendTestNotification,
  subscribeToPush,
  unsubscribeFromPush,
  urlBase64ToUint8Array,
} from './push.ts';
export type { PushConfig, PushFetcher, PushSubscriptionSnapshot } from './push.ts';

function isFallbackError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const status = (error as ApiError | undefined)?.status;
  return typeof status === 'number' && (status === 0 || status >= 500);
}

function localRoomCode(path: string): string | null {
  const match = path.match(/^\/api\/rooms\/([^/?]+)/);
  return match?.[1] ? decodeURIComponent(match[1]).toUpperCase() : null;
}

/** HTTP-клиент с прозрачным локальным режимом. */
export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const code = options.code ?? localRoomCode(path) ?? undefined;
  const hasLocalRoom = Boolean(code && findLocalRoom(code));
  // Комната, созданная на сервере, не должна ломаться из-за включённого локального режима.
  if (shouldUseLocal() && hasLocalRoom) return localRequest<T>(path, options);

  try {
    const result = await serverFetch<T>(path, options);
    markApiAvailable();
    return result;
  } catch (error) {
    if (isFallbackError(error)) {
      markApiUnavailable();
      return localRequest<T>(path, options);
    }
    throw error;
  }
}

/** Стабильный псевдоним для call-site, которые хотят явно переключать режимы. */
export const request = apiFetch;
