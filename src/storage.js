// Локальное состояние, кеш чата и офлайн-очередь.

const STORAGE_KEY = 'secret-santa-simple-v1';
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    s.games = s.games || {};
    s.session = s.session || null;
    s.backend = s.backend && typeof s.backend === 'object' ? s.backend : { rooms: {} };
    s.backend.rooms = s.backend.rooms || {};
    // migrate from previous versions if present and current empty
    if (!Object.keys(s.games).length) {
      for (const key of ['secret-santa-mvp-v11','secret-santa-mvp-v10','secret-santa-mvp-v9']) {
        try {
          const old = JSON.parse(localStorage.getItem(key));
          if (old && old.games && Object.keys(old.games).length) { s.games = old.games; s.session = old.session || null; break; }
        } catch {}
      }
    }
    return s;
  } catch { return { games: {}, session: null, backend: { rooms: {} } }; }
}
const state = loadState();
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const OFFLINE_QUEUE_KEY = 'secret-santa-offline-queue';
const CHAT_CACHE_KEY = 'secret-santa-chat-cache';
function getChatStore() {
  try { const s = JSON.parse(localStorage.getItem(CHAT_CACHE_KEY) || '{}'); return s && typeof s === 'object' ? s : {}; }
  catch { return {}; }
}
function saveChatStore(store) { localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(store)); }
function clearChatCacheForCode(code) {
  const store = getChatStore();
  Object.keys(store).forEach(k => { if (k.startsWith(code + ':')) delete store[k]; });
  saveChatStore(store);
}
function getOfflineQueue() {
  try { const q = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); return Array.isArray(q) ? q : []; }
  catch { return []; }
}
function setOfflineQueue(items) { localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items)); }

export { STORAGE_KEY, OFFLINE_QUEUE_KEY, CHAT_CACHE_KEY, state, saveState, getChatStore, saveChatStore, clearChatCacheForCode, getOfflineQueue, setOfflineQueue };
