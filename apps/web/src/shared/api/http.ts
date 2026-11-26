/** Низкоуровневый HTTP-клиент. Не знает о локальном режиме — используется напрямую для синхронизации. */

export const API_BASE =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE ?? '';

export type ApiError = Error & { status?: number; code?: string };

export function apiError(message: string, status?: number, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  if (status !== undefined) error.status = status;
  if (code) error.code = code;
  return error;
}

export function tokenKey(code: string): string {
  return `ss:v69:token:${code.toUpperCase()}`;
}

export function memberTokenKey(code: string): string {
  return `ss:v69:member:${code.toUpperCase()}`;
}

export function rememberRoom(code: string, token: string, memberToken?: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(tokenKey(code), token);
  if (memberToken) window.localStorage.setItem(memberTokenKey(code), memberToken);
  document.cookie = `ss_token=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
  document.cookie = `ss_token_${code.toUpperCase()}=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
}

export function forgetRoom(code: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(tokenKey(code));
  window.localStorage.removeItem(memberTokenKey(code));
}

export function roomToken(code: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(tokenKey(code));
}

export interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  code?: string;
}

/** Отправляет запрос на сервер, минуя локальный адаптер. */
export async function serverFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, token, code } = options;
  const authToken = token === undefined && code ? roomToken(code) : token;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!response.ok) {
    throw apiError(data.error ?? `HTTP ${response.status}`, response.status, data.error);
  }
  return data;
}
