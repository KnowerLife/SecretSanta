import { state, saveState } from './storage.js?v=67';
import { uid } from './utils.js?v=67';
import { getLang } from './i18n.js?v=67';
import { activityText } from './dates.js?v=67';
import { navigate } from './router.js?v=67';
import { renderDashboard } from './room.js?v=67';
import { toast } from './feedback.js?v=67';

// Модель игры: исключения, жеребьёвка, активность и демо.
function ensureGame(game) {
  if (!game) return;
  game.participants = game.participants || [];
  game.assignments = game.assignments || {};
  game.revealed = game.revealed || {};
  game.exclusions = game.exclusions || [];
  if (!game.manualExclusions) game.manualExclusions = (game.exclusions || []).filter(e => !e.group);
  game.groups = game.groups || [];
  recomputeExclusions(game);
  game.participants.forEach(p => { p.wishlist = p.wishlist || []; if (!p.giftStatus) p.giftStatus = 'none'; if (p.address == null) p.address = ''; if (p.profileNote == null) p.profileNote = ''; if (p.antiWishlist == null) p.antiWishlist = ''; if (p.size == null) p.size = ''; if (p.links == null) p.links = ''; if (p.allergies == null) p.allergies = ''; });
}
function recomputeExclusions(game) {
  const manual = game.manualExclusions || [];
  const grouped = [];
  (game.groups || []).forEach(g => {
    const m = g.members || [];
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) grouped.push({ id: 'grp_' + g.id + '_' + i + '_' + j, a: m[i], b: m[j], group: g.name });
  });
  game.exclusions = manual.concat(grouped);
}
Object.values(state.games).forEach(ensureGame);

function currentGame() { const code = state.session && state.session.gameCode; return code ? state.games[code] : null; }
function currentMe(game) { if (!game || !state.session) return null; return game.participants.find(p => p.id === state.session.participantId) || null; }
function pairKey(a, b) { return [a, b].sort().join('|'); }
function groupPairs(groups, skipId = null) {
  const pairs = new Set();
  (groups || []).forEach(g => {
    if (g.id === skipId) return;
    const m = g.members || [];
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) pairs.add(pairKey(m[i], m[j]));
  });
  return pairs;
}
function isExcluded(exclusions, a, b) {
  return (exclusions || []).some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
}
function derangement(participants, exclusions = []) {
  const ids = participants.map(p => p.id);
  if (ids.length < 2) return null;
  for (let attempt = 0; attempt < 2000; attempt++) {
    const recv = ids.slice();
    for (let i = recv.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [recv[i], recv[j]] = [recv[j], recv[i]]; }
    let ok = true;
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] === recv[i] || isExcluded(exclusions, ids[i], recv[i])) { ok = false; break; }
    }
    if (ok) { const map = {}; ids.forEach((id, i) => map[id] = recv[i]); return map; }
  }
  return null;
}
function pushLocalActivity(game, type, payload = {}) {
  if (!game) return;
  const me = currentMe(game);
  const actorId = payload.memberId || me?.id || null;
  game.activityLog = Array.isArray(game.activityLog) ? game.activityLog : [];
  game.activityLog.push({
    id: uid('evt'), type, createdAt: new Date().toISOString(),
    actorId, actorName: me?.name || '', payload,
  });
  game.activityLog = game.activityLog.slice(-50);
}
function localActivity(game) {
  if (!game) return [];
  const items = [];
  const stamp = (offset) => new Date(Date.now() - offset * 60000).toISOString();
  if (game.createdAt) items.push({ type: 'room.created', createdAt: new Date(game.createdAt).toISOString(), payload: { name: game.name } });
  (game.participants || []).slice(0, 6).forEach((p, i) => items.push({
    type: 'room.member_joined', actorName: p.name, createdAt: stamp(120 - i * 12), payload: { name: p.name, memberId: p.id },
  }));
  if (game.participants?.some(p => (p.wishlist || []).length)) {
    items.push({ type: 'room.wishlist_updated', actorName: game.participants.find(p => (p.wishlist || []).length)?.name, createdAt: stamp(50), payload: {} });
  }
  if (Object.keys(game.assignments || {}).length) {
    items.push({ type: 'room.draw_completed', createdAt: stamp(20), payload: { memberCount: game.participants.length } });
  }
  const stored = Array.isArray(game.activityLog) ? game.activityLog : [];
  const storedTypes = new Set(stored.map(e => e.type));
  return [...stored, ...items.reverse().filter(e => !storedTypes.has(e.type))]
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
    .slice(0, 20);
}
function createDemoGame() {
  const code = 'DEMO-SANTA';
  const meId = 'p_demo_me';
  const p2 = 'p_demo_anna';
  const p3 = 'p_demo_ilya';
  const p4 = 'p_demo_maria';
  const game = {
    code,
    name: getLang() === 'en' ? 'New Year Demo Game' : 'Демо-игра: Новый год',
    budgetMin: 1000,
    budgetMax: 2500,
    eventDate: '2026-12-28',
    theme: getLang() === 'en' ? 'Cozy winter' : 'Уютная зима',
    mode: 'classic',
    participants: [
      { id: meId, name: getLang() === 'en' ? 'You' : 'Вы', isOrganizer: true, wishlist: [{ id: 'w1', text: getLang() === 'en' ? 'Warm scarf' : 'Тёплый шарф' }, { id: 'w2', text: getLang() === 'en' ? 'Board game' : 'Настольная игра' }], giftStatus: 'idea', address: getLang() === 'en' ? 'Moscow, pickup at office' : 'Москва, заберу в офисе', profileNote: getLang() === 'en' ? 'I love tea, books, and hiking' : 'Люблю чай, книги и походы', antiWishlist: getLang() === 'en' ? 'No perfume' : 'Без парфюмерии', size: getLang() === 'en' ? 'M / shoe 39' : 'M / обувь 39', links: getLang() === 'en' ? 'https://example.com/wishlist' : 'https://example.com/wishlist', allergies: getLang() === 'en' ? 'No nuts' : 'Аллергия на орехи' },
      { id: p2, name: getLang() === 'en' ? 'Anna' : 'Анна', isOrganizer: false, wishlist: [{ id: 'w3', text: getLang() === 'en' ? 'Ceramic mug' : 'Керамическая кружка' }], giftStatus: 'bought', address: '', profileNote: getLang() === 'en' ? 'Coffee and plants' : 'Кофе и растения', antiWishlist: getLang() === 'en' ? 'No sweets' : 'Без сладкого' },
      { id: p3, name: getLang() === 'en' ? 'Ilya' : 'Илья', isOrganizer: false, wishlist: [{ id: 'w4', text: getLang() === 'en' ? 'Headlamp' : 'Налобный фонарь' }], giftStatus: 'none', address: getLang() === 'en' ? 'Saint Petersburg, delivery by courier' : 'Санкт-Петербург, доставка курьером', profileNote: getLang() === 'en' ? 'Camping, tech gadgets' : 'Походы и гаджеты', antiWishlist: '' },
      { id: p4, name: getLang() === 'en' ? 'Maria' : 'Мария', isOrganizer: false, wishlist: [], giftStatus: 'done', address: '', profileNote: '', antiWishlist: getLang() === 'en' ? 'No candles' : 'Без свечей' },
    ],
    exclusions: [],
    assignments: { [meId]: p2, [p2]: p3, [p3]: p4, [p4]: meId },
    revealed: { [meId]: true },
    backend: false,
    demo: true,
    createdAt: Date.now(),
  };
  state.games[code] = game;
  state.session = { gameCode: code, participantId: meId };
  saveState();
  toast(getLang() === 'en' ? 'Demo game loaded' : 'Демо-игра загружена');
  navigate('dashboard');
  renderDashboard();
}

export { ensureGame, recomputeExclusions, currentGame, currentMe, pairKey, groupPairs, isExcluded, derangement, pushLocalActivity, localActivity, createDemoGame };
