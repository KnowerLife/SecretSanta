import { $, uid } from './utils.js?v=67';
import { getOfflineQueue, setOfflineQueue } from './storage.js?v=67';
import { roomSession, apiFetch } from './api.js?v=67';
import { t } from './i18n.js?v=67';
import { toast } from './feedback.js?v=67';
import { currentGame } from './game.js?v=67';
import { invalidateChat, loadChatMessages } from './chat.js?v=67';
import { loadActivity } from './room.js?v=67';

// Офлайн-баннер и отправка очереди сообщений.
function queueOfflineMessage(entry) {
  const q = getOfflineQueue();
  q.push({ ...entry, id: uid('off'), createdAt: Date.now() });
  setOfflineQueue(q);
  updateOfflineUI();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => reg.sync?.register('secret-santa-sync')).catch(() => {});
  }
}
let offlineFlushPromise = null;
function flushOfflineQueue() {
  if (offlineFlushPromise) return offlineFlushPromise;
  const q = getOfflineQueue();
  if (!q.length) return Promise.resolve(0);
  offlineFlushPromise = (async () => {
    const pending = [];
    let sent = 0;
    let affectedCode = null;
    for (const item of q) {
      try {
        const sess = roomSession(item.code);
        if (!sess?.token) throw new Error('no session');
        await apiFetch(`/api/rooms/${item.code}/messages`, {
          method: 'POST', token: sess.token,
          body: { channel: item.channel, text: item.text },
        });
        sent++; affectedCode = item.code;
      } catch {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts < 10) pending.push(item);
      }
    }
    setOfflineQueue(pending);
    if (sent) {
      toast(t('toast.queueSent'));
      if (currentGame()?.code === affectedCode) {
        invalidateChat();
        loadChatMessages({ silent: true, force: true });
        loadActivity();
      }
    }
    return sent;
  })().finally(() => { offlineFlushPromise = null; });
  return offlineFlushPromise;
}
function updateOfflineUI() {
  const banner = $('#offlineBanner'); if (!banner) return;
  const online = navigator.onLine !== false;
  banner.classList.toggle('hidden', online);
  const text = $('#offlineBannerText');
  if (text && !online) text.textContent = t('nav.offline');
}

export { queueOfflineMessage, flushOfflineQueue, updateOfflineUI };
