import { $, $$, escapeHtml } from './utils.js?v=67';
import { t } from './i18n.js?v=67';
import { currentGame, currentMe } from './game.js?v=67';

// Пошаговые гиды сайта и комнаты, пресеты вишлиста.
let siteGuideStep = 0;
let roomGuideStep = null;
const SITE_GUIDE = [
  {
    id: 'format', title: 'guide.site.1.title', text: 'guide.site.1.text', tip: 'guide.site.1.tip', image: 'assets/images/guide-format.jpg',
    cta: [
      { key: 'nav.create', nav: 'create', cls: 'btn-primary' },
      { key: 'nav.join', nav: 'join', cls: 'btn-secondary' },
      { key: 'hero.ctaDemo', action: 'demo', cls: 'btn-ghost' },
    ],
  },
  {
    id: 'create', title: 'guide.site.2.title', text: 'guide.site.2.text', tip: 'guide.site.2.tip', image: 'assets/images/step-create-game.jpg',
    cta: [
      { key: 'nav.create', nav: 'create', cls: 'btn-primary' },
      { key: 'nav.join', nav: 'join', cls: 'btn-secondary' },
    ],
  },
  {
    id: 'invite', title: 'guide.site.3.title', text: 'guide.site.3.text', tip: 'guide.site.3.tip', image: 'assets/images/step-invite-friends.jpg',
    cta: [
      { key: 'hero.ctaDemo', action: 'demo', cls: 'btn-primary' },
      { key: 'nav.create', nav: 'create', cls: 'btn-secondary' },
    ],
  },
  {
    id: 'prep', title: 'guide.site.4.title', text: 'guide.site.4.text', tip: 'guide.site.4.tip', image: 'assets/images/guide-prep.jpg',
    cta: [{ key: 'hero.ctaDemo', action: 'demo', cls: 'btn-primary' }],
  },
  {
    id: 'draw', title: 'guide.site.5.title', text: 'guide.site.5.text', tip: 'guide.site.5.tip', image: 'assets/images/step-draw-gifts.jpg',
    cta: [
      { key: 'hero.ctaDemo', action: 'demo', cls: 'btn-primary' },
      { key: 'nav.quick', nav: 'quick', cls: 'btn-secondary' },
    ],
  },
];
const ROOM_GUIDE = [
  { id: 'team', title: 'guide.room.1.title', text: 'guide.room.1.text', tip: 'guide.room.1.tip', image: 'assets/images/guide-room-team.jpg', cta: 'guide.room.1.cta', tab: 'access', focus: '#copyInviteBtn' },
  { id: 'wishes', title: 'guide.room.2.title', text: 'guide.room.2.text', tip: 'guide.room.2.tip', image: 'assets/images/guide-room-wishes.jpg', cta: 'guide.room.2.cta', tab: 'overview', focus: '#wishText' },
  { id: 'profile', title: 'guide.room.3.title', text: 'guide.room.3.text', tip: 'guide.room.3.tip', image: 'assets/images/guide-room-profile.jpg', cta: 'guide.room.3.cta', tab: 'people', focus: '#profileAnti' },
  { id: 'draw', title: 'guide.room.4.title', text: 'guide.room.4.text', tip: 'guide.room.4.tip', image: 'assets/images/guide-room-draw.jpg', cta: 'guide.room.4.cta', tab: 'overview', focus: '#drawBtn' },
  { id: 'gift', title: 'guide.room.5.title', text: 'guide.room.5.text', tip: 'guide.room.5.tip', image: 'assets/images/guide-room-gift.jpg', cta: 'guide.room.5.cta', tab: 'overview', focus: '#myGiftStatus' },
];
const WISH_PRESETS = ['preset.wish.1', 'preset.wish.2', 'preset.wish.3', 'preset.wish.4', 'preset.wish.5', 'preset.wish.6'];
const ANTI_PRESETS = ['preset.anti.1', 'preset.anti.2', 'preset.anti.3', 'preset.anti.4', 'preset.anti.5', 'preset.anti.6'];

function guideRailHtml(steps, activeIndex, panelId, doneFlags) {
  return steps.map((step, i) => {
    const done = doneFlags ? doneFlags[i] : false;
    const active = i === activeIndex;
    const cls = ['guide__step', active ? 'is-active' : '', done ? 'is-done' : ''].filter(Boolean).join(' ');
    const mark = done
      ? '<svg class="card-icon" aria-hidden="true"><use href="#i-check"></use></svg>'
      : `<span class="guide__step-num">${i + 1}</span>`;
    return `<button class="${cls}" type="button" role="tab" aria-selected="${active}" aria-controls="${panelId}" data-guide-step="${i}">${mark}<span data-i18n="${step.title}">${escapeHtml(t(step.title))}</span></button>`;
  }).join('');
}
function guideDialogue(step) {
  return `<div class="guide__copy">
    <h3 data-i18n="${step.title}">${escapeHtml(t(step.title))}</h3>
    <p data-i18n="${step.text}">${escapeHtml(t(step.text))}</p>
    <div class="guide__tip"><svg class="card-icon" aria-hidden="true"><use href="#i-sparkle"></use></svg><span data-i18n="${step.tip}">${escapeHtml(t(step.tip))}</span></div>
  </div>`;
}
function renderSiteGuide(index = siteGuideStep) {
  const rail = $('#siteGuideRail'); const detail = $('#siteGuideDetail'); if (!rail || !detail) return;
  siteGuideStep = Math.max(0, Math.min(index, SITE_GUIDE.length - 1));
  const step = SITE_GUIDE[siteGuideStep];
  rail.innerHTML = guideRailHtml(SITE_GUIDE, siteGuideStep, 'siteGuideDetail');
  const actions = step.cta.map(c => c.nav
    ? `<button class="btn ${c.cls}" type="button" data-nav="${c.nav}" data-i18n="${c.key}">${escapeHtml(t(c.key))}</button>`
    : `<button class="btn ${c.cls}" type="button" data-guide-action="${c.action}" data-i18n="${c.key}">${escapeHtml(t(c.key))}</button>`).join('');
  const media = step.image
    ? `<div class="guide__media"><img src="${step.image}" alt="" width="600" height="400" loading="lazy" decoding="async" /></div>`
    : '';
  detail.innerHTML = `${guideDialogue(step)}${media}<div class="guide__actions">${actions}</div>`;
  const progress = $('#siteGuideProgress'); if (progress) progress.textContent = `${siteGuideStep + 1} / ${SITE_GUIDE.length}`;
}
function roomStepDone(id, game, me) {
  if (!game) return false;
  if (id === 'team') return (game.participants || []).length >= 3;
  if (id === 'wishes') return ((me && me.wishlist) || []).length > 0;
  if (id === 'profile') return !!(me && (me.address || me.profileNote || me.antiWishlist || me.size || me.links || me.allergies));
  if (id === 'draw') return Object.keys(game.assignments || {}).length > 0;
  if (id === 'gift') return !!(me && ['bought', 'done'].includes(me.giftStatus));
  return false;
}
function renderRoomGuide(game, me, index = roomGuideStep) {
  const rail = $('#roomGuideRail'); const detail = $('#roomGuideDetail'); if (!rail || !detail) return;
  const doneFlags = ROOM_GUIDE.map(s => roomStepDone(s.id, game, me));
  const current = doneFlags.indexOf(false);
  const drawn = doneFlags[3];
  const activeIndex = index === null || index === undefined
    ? (current === -1 ? ROOM_GUIDE.length - 1 : current)
    : Math.max(0, Math.min(index, ROOM_GUIDE.length - 1));
  roomGuideStep = activeIndex;
  const step = ROOM_GUIDE[activeIndex];
  rail.innerHTML = guideRailHtml(ROOM_GUIDE, activeIndex, 'roomGuideDetail', doneFlags);
  const focus = step.id === 'draw' && drawn ? '#myAssignment' : step.focus;
  const ctaKey = step.id === 'draw' && drawn ? 'guide.room.4.doneCta' : step.cta;
  const actions = `<div class="guide__actions"><button class="btn btn-primary" type="button" data-guide-go="${step.tab}" data-guide-focus="${focus}" data-i18n="${ctaKey}">${escapeHtml(t(ctaKey))}</button></div>`;
  const media = step.image
    ? `<div class="guide__media"><img src="${step.image}" alt="" width="800" height="600" loading="lazy" decoding="async" /></div>`
    : '';
  detail.innerHTML = `${guideDialogue(step)}${media}${actions}`;
  const progress = $('#roomGuideProgress');
  if (progress) progress.textContent = current === -1 ? t('guide.allDone') : `${doneFlags.filter(Boolean).length} / ${ROOM_GUIDE.length}`;
}
function renderPresetChips(game, me) {
  $$('[data-preset]').forEach(box => {
    const anti = box.dataset.preset === 'anti';
    const keys = anti ? ANTI_PRESETS : WISH_PRESETS;
    const wishes = (me && me.wishlist || []).map(w => String(w.text || ''));
    const antiText = (me && me.antiWishlist) || '';
    box.innerHTML = keys.map(key => {
      const text = t(key);
      const added = anti ? antiText.includes(text) : wishes.includes(text);
      const cls = ['preset-chip', anti ? 'preset-chip--anti' : '', added ? 'is-added' : ''].filter(Boolean).join(' ');
      const icon = added ? 'i-check' : anti ? 'i-alert' : 'i-gift';
      return `<button class="${cls}" type="button" data-preset-key="${key}" data-preset-kind="${anti ? 'anti' : 'wish'}" aria-pressed="${added}"><svg class="card-icon" aria-hidden="true"><use href="#${icon}"></use></svg><span data-i18n="${key}">${escapeHtml(text)}</span></button>`;
    }).join('');
  });
}
function focusGuideTarget(selector) {
  if (!selector) return;
  setTimeout(() => {
    const el = $(selector);
    if (el && el.getClientRects().length) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }, 220);
}

export function setRoomGuideStep(index) { roomGuideStep = index; }

export { renderSiteGuide, renderRoomGuide, renderPresetChips, focusGuideTarget };
