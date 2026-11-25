import { $, parseHashParams } from './src/utils.js?v=67';
import { setRoomSession, detectBackend } from './src/api.js?v=67';
import { getLang, applyLang } from './src/i18n.js?v=67';
import { applyTheme, cycleTheme } from './src/theme.js?v=67';
import { views, navigate } from './src/router.js?v=67';
import { currentGame } from './src/game.js?v=67';
import { refreshDashboard } from './src/room.js?v=67';
import { flushOfflineQueue } from './src/offline.js?v=67';
import { showQuickPersonal } from './src/quick.js?v=67';
import { initLazyArt } from './src/lazy-art.js?v=67';
import { wire } from './src/wire.js?v=67';
import { initInstall } from './src/install.js?v=67';

// init
initLazyArt();
wire();
initInstall();
const langBtn = $('#langToggle');
if (langBtn) langBtn.addEventListener('click', () => applyLang(getLang() === 'ru' ? 'en' : 'ru'));
const themeToggle = $('#themeToggle');
if (themeToggle) themeToggle.addEventListener('click', cycleTheme);
// handle join link with code/invite
const rawHash = location.hash.replace('#', '');
if (rawHash.startsWith('join')) {
  const q = rawHash.split('?')[1] || '';
  const params = new URLSearchParams(q);
  const code = params.get('code');
  const invite = params.get('invite');
  if (code) {
    const c = code.toUpperCase();
    $('#joinCode').value = c;
    if (invite) setRoomSession(c, { inviteToken: invite });
  }
}
const hashParams = parseHashParams();
const giftParam = hashParams.get('gift');

applyLang(getLang());
applyTheme();
const start = rawHash.split('?')[0];
navigate(views.includes(start) ? start : 'home');
if (start === 'quick' && giftParam) showQuickPersonal(giftParam);
detectBackend().then(() => { if (currentGame()) refreshDashboard(); });
if (navigator.onLine !== false) flushOfflineQueue();
if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {})); }