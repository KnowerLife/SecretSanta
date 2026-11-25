import { $, $$, escapeHtml, uid } from './utils.js?v=67';
import { t, locale } from './i18n.js?v=67';
import { currentGame, currentMe } from './game.js?v=67';
import { roomSession, apiFetch, apiState } from './api.js?v=67';
import { getChatStore, saveChatStore, clearChatCacheForCode } from './storage.js?v=67';
import { toast } from './feedback.js?v=67';
import { queueOfflineMessage } from './offline.js?v=67';

// Анонимный чат: рендер, загрузка и отправка сообщений.
let chatChannel = 'to_recipient';
let chatCache = { to_recipient: [], to_santa: [] };
let chatLoadedKey = '';
let chatLoading = false;
function resetChatState() {
  chatChannel = 'to_recipient';
  chatCache = { to_recipient: [], to_santa: [] };
  chatLoadedKey = '';
  chatLoading = false;
}

function renderChat(game, me, drawn) {
  const notice = $('#chatNotice');
  const list = $('#chatMessages');
  const form = $('#chatForm');
  const input = $('#chatInput');
  const tabR = $('#chatTabRecipient');
  const tabS = $('#chatTabSanta');
  if (!list || !tabR || !tabS) return;

  tabR.classList.toggle('is-active', chatChannel === 'to_recipient');
  tabS.classList.toggle('is-active', chatChannel === 'to_santa');
  tabR.classList.toggle('btn-secondary', chatChannel === 'to_recipient');
  tabR.classList.toggle('btn-ghost', chatChannel !== 'to_recipient');
  tabS.classList.toggle('btn-secondary', chatChannel === 'to_santa');
  tabS.classList.toggle('btn-ghost', chatChannel !== 'to_santa');

  const sess = game ? roomSession(game.code) : null;
  const canChat = !!(drawn && sess?.token);
  const setEnabled = (enabled) => {
    if (form) {
      if (input) input.disabled = !enabled;
      const b = form.querySelector('button[type="submit"]');
      if (b) b.disabled = !enabled;
    }
    $$('[data-tpl]').forEach(btn => { btn.disabled = !enabled; });
  };
  if (!drawn) {
    if (notice) notice.textContent = t('dash.chatNoDraw');
    list.innerHTML = `<div class="chat-empty"><div class="card-media card-media--chat"><img src="assets/images/chat-waiting.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span class="muted small">${escapeHtml(t('dash.chatNoDraw'))}</span></div>`;
    setEnabled(false);
    return;
  }
  if (!canChat) {
    const msg = t('dash.chatUnavailable');
    if (notice) notice.textContent = msg;
    list.innerHTML = `<div class="chat-empty"><div class="card-media card-media--chat"><img src="assets/images/chat-waiting.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span class="muted small">${escapeHtml(msg)}</span></div>`;
    setEnabled(false);
    return;
  }

  setEnabled(true);
  if (notice) notice.textContent = '';
  const msgs = chatCache[chatChannel] || [];
  if (!msgs.length) {
    list.innerHTML = `<div class="chat-empty"><div class="card-media card-media--chat"><img src="assets/images/chat-empty.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span class="muted small">${escapeHtml(t('dash.chatEmpty'))}</span></div>`;
  } else {
    list.innerHTML = msgs.map(m => {
      const cls = m.fromMe ? 'chat-msg chat-msg--me' : 'chat-msg chat-msg--them';
      const who = m.fromMe ? t('dash.chatYou') : t('dash.chatThem');
      const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) : '';
      const pending = m.pending ? `<span class="chat-msg__pending">${escapeHtml(t('dash.chatPending'))}</span>` : '';
      return `<div class="${cls}"><div class="chat-msg__meta"><span>${escapeHtml(who)}</span>${pending}${time ? `<span>${escapeHtml(time)}</span>` : ''}</div><div class="chat-msg__text">${escapeHtml(m.text || '')}</div></div>`;
    }).join('');
    list.scrollTop = list.scrollHeight;
  }
}

async function loadChatMessages({ silent = false, force = false } = {}) {
  const game = currentGame();
  const me = currentMe(game);
  if (!game || !me) return;
  const sess = roomSession(game.code);
  const drawn = !!(game.assignments && Object.keys(game.assignments).length > 0);
  if (!drawn || !sess?.token) { renderChat(game, me, drawn); return; }
  const key = `${game.code}:${chatChannel}`;
  if (!apiState.online) {
    chatCache[chatChannel] = getChatStore()[key] || [];
    renderChat(game, me, drawn);
    return;
  }
  if (!force && chatLoadedKey === key) { renderChat(game, me, drawn); return; }
  if (chatLoading) return;
  chatLoading = true;
  try {
    const data = await apiFetch(`/api/rooms/${game.code}/messages?channel=${encodeURIComponent(chatChannel)}`, { token: sess.token });
    chatCache[chatChannel] = Array.isArray(data.messages) ? data.messages : [];
    const store = getChatStore(); store[key] = chatCache[chatChannel]; saveChatStore(store);
    chatLoadedKey = key;
  } catch (e) {
    chatCache[chatChannel] = getChatStore()[key] || [];
    if (!silent) { console.warn(e); toast(e.message || 'Chat error'); }
  } finally {
    chatLoading = false;
    const g2 = currentGame(); const m2 = currentMe(g2);
    const drawn2 = !!(g2 && g2.assignments && Object.keys(g2.assignments).length > 0);
    renderChat(g2, m2, drawn2);
  }
}

async function sendChatMessage(text) {
  const game = currentGame();
  const me = currentMe(game);
  if (!game || !me) return;
  const sess = roomSession(game.code);
  if (!sess?.token) throw new Error('No session');
  let data;
  try {
    data = await apiFetch(`/api/rooms/${game.code}/messages`, { method: 'POST', token: sess.token, body: { channel: chatChannel, text } });
  } catch (err) {
    if (!err.status || navigator.onLine === false) {
      queueOfflineMessage({ code: game.code, channel: chatChannel, text });
      chatCache[chatChannel] = chatCache[chatChannel] || [];
      chatCache[chatChannel].push({ id: uid('off'), fromMe: true, text, createdAt: new Date().toISOString(), channel: chatChannel, pending: true });
      const drawn = !!(game.assignments && Object.keys(game.assignments).length > 0);
      renderChat(game, me, drawn);
      toast(t('toast.queuedOffline'));
      return;
    }
    throw err;
  }
  if (data && data.message) {
    chatCache[chatChannel] = chatCache[chatChannel] || [];
    chatCache[chatChannel].push(data.message);
    const key = `${game.code}:${chatChannel}`;
    const store = getChatStore(); store[key] = chatCache[chatChannel]; saveChatStore(store);
    chatLoadedKey = key;
  }
  const drawn = !!(game.assignments && Object.keys(game.assignments).length > 0);
  renderChat(game, me, drawn);
}

export function setChatChannel(channel) { chatChannel = channel; }
export function invalidateChat() { chatLoadedKey = ''; }
export function hasChatLoaded(code) { return !!chatLoadedKey && chatLoadedKey.startsWith(code + ':'); }
export function hasAnyChatLoaded() { return !!chatLoadedKey; }

export { resetChatState, renderChat, loadChatMessages, sendChatMessage };
