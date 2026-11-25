import { locale, t } from './i18n.js?v=68';

// Локальное форматирование дат и текста событий активности.
function formatDate(dateStr) {
  if (!dateStr) return '';
  try { const d = new Date(dateStr + 'T00:00:00'); return d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return dateStr; }
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}
function formatTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return String(iso).replace('T', ' ').replace('Z', ''); }
}
function activityText(ev, game) {
  const p = ev.payload || {};
  const actor = ev.actorName || p.name || '';
  switch (ev.type) {
    case 'room.created': return t('dash.evt.created', { name: p.name || (game && game.name) || '' });
    case 'room.member_joined': return t('dash.evt.joined', { name: actor });
    case 'room.wishlist_updated': return t('dash.evt.wishlist', { name: actor });
    case 'room.gift_status_updated': {
      const status = p.giftStatus || 'none';
      const known = ['none','idea','bought','done'];
      const label = known.includes(status) ? t('dash.gift.' + status) : status;
      return t('dash.evt.status', { name: actor, status: label });
    }
    case 'room.profile_updated': return t('dash.evt.profile', { name: actor });
    case 'room.exclusion_added': return p.groupName ? t('dash.evt.groupAdded', { name: p.groupName }) : t('dash.evt.exclusionAdded');
    case 'room.exclusion_removed': return p.groupName ? t('dash.evt.groupRemoved', { name: p.groupName }) : t('dash.evt.exclusionRemoved');
    case 'room.draw_completed': return t('dash.evt.drawDone', { n: p.memberCount ?? (game?.participants?.length || 0) });
    case 'room.draw_reset': return t('dash.evt.drawReset');
    case 'room.message': return t('dash.evt.message');
    default: return t('dash.evt.unknown');
  }
}

export { formatDate, daysUntil, formatTime, activityText };
