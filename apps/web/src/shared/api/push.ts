/** Подписка на Web Push через service worker. Все внешние API проверяются на существование (мок-безопасно). */

import { serverFetch } from './http.ts';
import type { FetchOptions } from './http.ts';

export interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
  subject?: string;
}

export interface PushSubscriptionSnapshot {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type PushFetcher = <T>(path: string, options?: FetchOptions) => Promise<T>;

function pushStorageKey(code: string): string {
  return `ss:v69:push:${code.toUpperCase()}`;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    typeof PushManager !== 'undefined' &&
    'serviceWorker' in navigator
  );
}

export function getStoredSubscription(code: string): PushSubscriptionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(pushStorageKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PushSubscriptionSnapshot>;
    if (!parsed.endpoint || !parsed.keys?.p256dh || !parsed.keys?.auth) return null;
    return { endpoint: parsed.endpoint, keys: { p256dh: parsed.keys.p256dh, auth: parsed.keys.auth } };
  } catch {
    return null;
  }
}

function storeSubscription(code: string, subscription: PushSubscriptionSnapshot | null): void {
  if (typeof window === 'undefined') return;
  const key = pushStorageKey(code);
  if (subscription) window.localStorage.setItem(key, JSON.stringify(subscription));
  else window.localStorage.removeItem(key);
}

export async function getPushConfig(fetcher: PushFetcher = serverFetch): Promise<PushConfig> {
  return fetcher<PushConfig>('/api/push/config');
}

/** VAPID-ключ приходит в URL-safe base64 без padding. */
export function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function snapshot(subscription: PushSubscription): PushSubscriptionSnapshot {
  const json = typeof subscription.toJSON === 'function' ? subscription.toJSON() : null;
  const endpoint = json?.endpoint ?? subscription.endpoint;
  const rawKey = (name: 'p256dh' | 'auth'): string | null => {
    if (json?.keys?.[name]) return json.keys[name] ?? null;
    const key = subscription.getKey(name);
    if (!key) return null;
    let binary = '';
    for (const byte of new Uint8Array(key)) binary += String.fromCharCode(byte);
    return btoa(binary);
  };
  const p256dh = rawKey('p256dh');
  const auth = rawKey('auth');
  if (!endpoint || !p256dh || !auth) throw new Error('push_subscription_incomplete');
  return { endpoint, keys: { p256dh, auth } };
}

/**
 * Включает уведомления: разрешение → подписка через SW → сохранение на сервере.
 * Возвращает снимок подписки, чтобы UI мог показать состояние «включено».
 */
export async function subscribeToPush(
  roomCode: string,
  memberId?: string,
  fetcher: PushFetcher = serverFetch,
): Promise<PushSubscriptionSnapshot> {
  if (!isPushSupported()) throw new Error('push_unsupported');
  const config = await getPushConfig(fetcher);
  if (!config.enabled || !config.publicKey) throw new Error('push_not_configured');
  if (typeof Notification.requestPermission !== 'function') throw new Error('push_unsupported');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('push_permission_denied');

  const registration =
    (await navigator.serviceWorker.ready.catch(() => null)) ??
    (await navigator.serviceWorker.register('/sw.js').catch(() => null));
  if (!registration?.pushManager?.subscribe) throw new Error('push_unsupported');

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(config.publicKey) as BufferSource,
  });
  const saved = snapshot(subscription);
  await fetcher('/api/push/subscribe', {
    method: 'POST',
    body: { ...saved, roomCode: roomCode.toUpperCase(), memberId },
  });
  storeSubscription(roomCode, saved);
  return saved;
}

/** Отключает уведомления: удаляет подписку на сервере и в браузере. */
export async function unsubscribeFromPush(roomCode: string, fetcher: PushFetcher = serverFetch): Promise<void> {
  let endpoint = getStoredSubscription(roomCode)?.endpoint;
  if (!endpoint && isPushSupported()) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const subscription = await registration?.pushManager?.getSubscription?.().catch(() => null);
    if (subscription) endpoint = subscription.endpoint;
  }
  if (endpoint) {
    await fetcher('/api/push/unsubscribe', { method: 'POST', body: { endpoint } });
  }
  if (isPushSupported()) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const subscription = await registration?.pushManager?.getSubscription?.().catch(() => null);
    await subscription?.unsubscribe?.().catch(() => false);
  }
  storeSubscription(roomCode, null);
}

/** Без активной подписки запрос на сервер не отправляется. */
export async function sendTestNotification(roomCode: string, fetcher: PushFetcher = serverFetch): Promise<void> {
  if (!getStoredSubscription(roomCode)) throw new Error('push_not_enabled');
  await fetcher(`/api/rooms/${encodeURIComponent(roomCode.toUpperCase())}/push/test`, { method: 'POST' });
}

export function isPushEnabled(roomCode: string): boolean {
  return getStoredSubscription(roomCode) !== null;
}
