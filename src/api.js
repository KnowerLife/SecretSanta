import { state } from './storage.js?v=68';

// HTTP-клиент, базовый URL и сессии комнаты.
const API_BASE_KEY = 'secret-santa-api-base';
const DEFAULT_API_BASE = window.SECRET_SANTA_API_BASE || localStorage.getItem(API_BASE_KEY) || 'http://127.0.0.1:8000';
const apiState = {
  base: DEFAULT_API_BASE.replace(/\/$/, ''),
  online: null, // null unknown, true/false
  checking: false,
};

function apiHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(apiState.base + path, {
    method,
    headers: apiHeaders(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data.error || data.detail || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function detectBackend() {
  if (apiState.checking) return apiState.online;
  apiState.checking = true;
  try {
    const ctrl = new AbortController();
    const tmr = setTimeout(() => ctrl.abort(), 1800);
    const res = await fetch(apiState.base + '/api/health', { signal: ctrl.signal });
    clearTimeout(tmr);
    apiState.online = res.ok;
  } catch {
    apiState.online = false;
  } finally {
    apiState.checking = false;
  }
  return apiState.online;
}

function roomSession(code) {
  state.backend = state.backend || { rooms: {} };
  state.backend.rooms = state.backend.rooms || {};
  return state.backend.rooms[(code || '').toUpperCase()] || null;
}
function setRoomSession(code, sess) {
  state.backend = state.backend || { rooms: {} };
  state.backend.rooms = state.backend.rooms || {};
  state.backend.rooms[(code || '').toUpperCase()] = { ...(state.backend.rooms[(code || '').toUpperCase()] || {}), ...sess };
}

export { apiState, apiFetch, detectBackend, roomSession, setRoomSession };
