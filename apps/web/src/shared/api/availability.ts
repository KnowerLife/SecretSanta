/** Определяет, работает ли сервер, и хранит явный выбор режима «локально». */

import { API_BASE } from './http.ts';

export const LOCAL_MODE_EVENT = 'ss:v69:local-mode';
const LOCAL_MODE_KEY = 'ss:v69:local-mode';
const HEALTH_TTL_MS = 10_000;
const HEALTH_TIMEOUT_MS = 1800;

let cachedAvailable: boolean | null = null;
let checkedAt = 0;
let pendingCheck: Promise<boolean> | null = null;

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

/** Пользователь явно переключился в локальный режим (или сервер был недоступен). */
export function isLocalMode(): boolean {
  return storage()?.getItem(LOCAL_MODE_KEY) === '1';
}

export function setLocalMode(enabled: boolean): void {
  const store = storage();
  if (!store) return;
  if (enabled) store.setItem(LOCAL_MODE_KEY, '1');
  else store.removeItem(LOCAL_MODE_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCAL_MODE_EVENT, { detail: { local: enabled } }));
  }
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Все запросы идут в localStorage, пока не будет сделан явный выбор после восстановления сети. */
export function shouldUseLocal(): boolean {
  return isLocalMode() || isBrowserOffline();
}

export function markApiUnavailable(): void {
  cachedAvailable = false;
  checkedAt = Date.now();
  setLocalMode(true);
}

export function markApiAvailable(): void {
  cachedAvailable = true;
  checkedAt = Date.now();
}

/** Проверка /api/health с коротким таймаутом и кешем. Не меняет режим автоматически. */
export async function isApiAvailable(force = false): Promise<boolean> {
  if (!force && cachedAvailable !== null && Date.now() - checkedAt < HEALTH_TTL_MS) {
    return cachedAvailable;
  }
  if (pendingCheck) return pendingCheck;

  pendingCheck = (async () => {
    if (typeof fetch !== 'function') return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
      const available = response.ok;
      cachedAvailable = available;
      checkedAt = Date.now();
      if (available) markApiAvailable();
      return available;
    } catch {
      cachedAvailable = false;
      checkedAt = Date.now();
      return false;
    } finally {
      clearTimeout(timer);
    }
  })().finally(() => {
    pendingCheck = null;
  });

  return pendingCheck;
}
