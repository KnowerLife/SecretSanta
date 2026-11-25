import { $, $$, escapeHtml, uid } from './utils.js?v=67';
import { t } from './i18n.js?v=67';
import { apiState, apiFetch, detectBackend, roomSession, setRoomSession } from './api.js?v=67';
import { state, saveState, clearChatCacheForCode } from './storage.js?v=67';
import { currentGame, currentMe, ensureGame, recomputeExclusions, pushLocalActivity, localActivity, groupPairs, pairKey, isExcluded } from './game.js?v=67';
import { formatDate, daysUntil, formatTime, activityText } from './dates.js?v=67';
import { renderChat, loadChatMessages, resetChatState, invalidateChat, hasChatLoaded, hasAnyChatLoaded } from './chat.js?v=67';
import { renderRoomGuide, renderPresetChips } from './guides.js?v=67';
import { toast, setNotice } from './feedback.js?v=67';

// Комната: рендер, синхронизация с бэкендом, SSE и доступ.
function inviteUrl(game) {
  const sess = roomSession(game.code);
  const url = new URL(location.href);
  const token = sess?.inviteToken;
  url.hash = token
    ? `join?code=${encodeURIComponent(game.code)}&invite=${encodeURIComponent(token)}`
    : `join?code=${encodeURIComponent(game.code)}`;
  return url.toString();
}
function renderInviteText(game) {
  const el = $('#inviteText'); if (!el || !game) return;
  const lines = [t('dash.inviteGreeting', { name: game.name })];
  if (game.budgetMin || game.budgetMax) lines.push(t('dash.inviteBudget', { min: game.budgetMin, max: game.budgetMax }));
  if (game.eventDate) lines.push(t('dash.inviteDate', { date: formatDate(game.eventDate) }));
  lines.push(t('dash.inviteJoin', { url: inviteUrl(game) }));
  lines.push(t('dash.inviteCode', { code: game.code }));
  el.value = lines.join('\n');
}

let dashTab = 'overview';
function setDashTab(tab, opts = {}) {
  if (!tab) return;
  dashTab = tab;
  $$('.dash-tab[data-dash-tab]').forEach(btn => {
    const active = btn.dataset.dashTab === tab;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  $$('[data-dash-pane]').forEach(pane => {
    const active = pane.dataset.dashPane === tab;
    pane.classList.toggle('is-active', active);
    pane.hidden = !active;
  });
  if (opts.scroll) {
    const pane = document.querySelector(`[data-dash-pane="${tab}"]`);
    if (pane) pane.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
async function addWish(text) {
  const game = currentGame(); const me = currentMe(game); if (!game || !me || !text) return false;
  const sess = roomSession(game.code);
  if (sess && sess.token && game.backend) {
    try {
      const data = await apiFetch(`/api/rooms/${game.code}/wishlist`, { method: 'POST', token: sess.token, body: { text } });
      me.wishlist.push({ id: data.item?.id || uid('w'), text });
      saveState(); renderDashboard(); toast(t('toast.wishAdded')); refreshDashboard();
      return true;
    } catch (err) { console.warn(err); toast(err.message || t('toast.drawFail')); return false; }
  }
  me.wishlist.push({ id: uid('w'), text });
  pushLocalActivity(game, 'room.wishlist_updated', { memberId: me.id, name: me.name });
  saveState(); renderDashboard(); loadActivity(); toast(t('toast.wishAdded'));
  return true;
}

function renderDashboard() {
  const game = currentGame(); const me = currentMe(game);
  if (!game || !me) { $('#noGame').classList.remove('hidden'); $('#gameArea').classList.add('hidden'); setNotice(''); return; }
  ensureGame(game);
  $('#noGame').classList.add('hidden'); $('#gameArea').classList.remove('hidden');

  $('#gameCodeLabel').textContent = game.code;
  $('#gameTitleLabel').textContent = game.name;
  const demoBadge = $('#demoBadge'); if (demoBadge) demoBadge.classList.toggle('hidden', !game.demo);
  const resetDemoBtn = $('#resetDemoBtn'); if (resetDemoBtn) resetDemoBtn.classList.toggle('hidden', !game.demo);
  const parts = [t('dash.budget', { min: game.budgetMin, max: game.budgetMax })];
  if (game.eventDate) parts.push(t('dash.date', { date: formatDate(game.eventDate) }));
  if (game.theme) parts.push(game.theme);
  $('#gameMetaLabel').textContent = parts.join(' · ');
  renderInviteText(game);
  setDashTab(dashTab || 'overview');
  renderRoomGuide(game, me);
  renderPresetChips(game, me);

  const d = daysUntil(game.eventDate);
  if (d === null) $('#countdownLabel').textContent = '';
  else if (d > 1) $('#countdownLabel').textContent = t('dash.daysLeft', { n: d });
  else if (d === 1) $('#countdownLabel').textContent = t('dash.daysTomorrow');
  else if (d === 0) $('#countdownLabel').textContent = t('dash.daysToday');
  else $('#countdownLabel').textContent = t('dash.daysPast', { n: Math.abs(d) });

  const bs = $('#backendStatusLabel');
  if (bs) {
    const sess = roomSession(game.code);
    const online = !!(sess && sess.token && apiState.online);
    const offline = !sess || !sess.token || apiState.online === false;
    bs.textContent = online ? `● ${t('dash.backendOnline')}` : (offline ? `● ${t('dash.backendOffline')}` : '');
    bs.classList.toggle('is-online', online);
    bs.classList.toggle('is-offline', offline);
  }

  const drawn = game.assignments && Object.keys(game.assignments).length > 0;
  const revealed = !!(game.revealed && game.revealed[me.id]);

  $('#drawBtn').disabled = drawn;
  $('#drawBtn').textContent = drawn ? t('dash.drawDone') : t('dash.draw');
  $('#resetDrawBtn').classList.toggle('hidden', !drawn);
  $('#revealBtn').classList.toggle('hidden', !(drawn && !revealed));

  // stats
  $('#statPlayers').textContent = String(game.participants.length);
  const withWish = game.participants.filter(p => p.wishlist.length > 0).length;
  $('#statWishlists').textContent = game.participants.length ? Math.round((withWish / game.participants.length) * 100) + '%' : '0%';
  $('#statDraw').textContent = drawn ? t('dash.statusDrawYes') : t('dash.statusDrawNo');
  const giftsDone = game.participants.filter(p => ['bought','done'].includes(p.giftStatus)).length;
  const giftPct = game.participants.length ? Math.round((giftsDone / game.participants.length) * 100) : 0;
  const sg = $('#statGifts');
  if (sg) sg.textContent = game.participants.length ? giftPct + '%' : '0%';
  const progressPct = $('#progressPct');
  const progressFill = $('#progressFill');
  const progressBar = document.querySelector('.progress-bar[role="progressbar"]');
  const readiness = game.participants.length ? Math.round(((drawn ? 40 : 0) + (withWish / game.participants.length) * 30 + (giftPct / 100) * 30)) : 0;
  if (progressPct) progressPct.textContent = readiness + '%';
  if (progressFill) progressFill.style.width = readiness + '%';
  if (progressBar) progressBar.setAttribute('aria-valuenow', String(readiness));
  const checklist = $('#gameChecklist');
  if (checklist) {
    const profileFilled = !!(me.address || me.profileNote || me.antiWishlist || me.size || me.links || me.allergies);
    const items = [
      { done: game.participants.length >= 3, label: t('dash.check1') },
      { done: me.wishlist.length > 0, label: t('dash.check2') },
      { done: profileFilled, label: t('dash.check3') },
      { done: drawn, label: t('dash.check4') },
      { done: (me.giftStatus || 'none') !== 'none', label: t('dash.check5') },
    ];
    checklist.innerHTML = items.map(i => {
      const mark = i.done ? 'i-check' : 'i-circle';
      return `<li class="${i.done ? 'is-done' : ''}"><span class="checklist__mark" aria-hidden="true"><svg class="card-icon checklist__icon"><use href="#${mark}"></use></svg></span><span>${escapeHtml(i.label)}</span></li>`;
    }).join('');
    if (items.every(i => i.done)) checklist.insertAdjacentHTML('beforeend', `<li class="checklist__done">${escapeHtml(t('dash.checkAllDone'))}</li>`);
  }
  $('#participantsCount').textContent = String(game.participants.length);

  // participants
  $('#participantsList').innerHTML = game.participants.map(p => {
    const tags = [];
    if (p.wishlist.length) tags.push(t('dash.participantWishes', { n: p.wishlist.length }));
    if (p.giftStatus && p.giftStatus !== 'none') tags.push(t('dash.gift.' + p.giftStatus));
    if (p.isOrganizer) tags.push(t('dash.participantOrganizer'));
    const canRemove = !drawn && p.id !== me.id;
    const rm = canRemove ? `<button class="link-btn" data-rm="${p.id}" type="button">${escapeHtml(t('dash.participantRemove'))}</button>` : '';
    return `<li><span><strong>${escapeHtml(p.name)}</strong>${tags.length ? ` <span class="muted small">· ${escapeHtml(tags.join(', '))}</span>` : ''}</span><span>${rm}</span></li>`;
  }).join('');
  $$('[data-rm]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.rm; const p = game.participants.find(x => x.id === id);
    game.participants = game.participants.filter(x => x.id !== id);
    game.exclusions = (game.exclusions || []).filter(e => e.a !== id && e.b !== id);
    saveState(); renderDashboard(); toast(p ? t('toast.participantRemoved', { name: p.name }) : t('toast.participantRemovedSimple'));
  });

  // exclusions
  const exList = $('#exclusionsList');
  const exForm = $('#exclusionForm');
  const exA = $('#exclusionA');
  const exB = $('#exclusionB');
  if (exList) {
    const nameById = new Map(game.participants.map(p => [p.id, p.name]));
    const ex = game.exclusions || [];
    exList.innerHTML = ex.length ? ex.map(e => {
      const a = nameById.get(e.a) || e.a;
      const b = nameById.get(e.b) || e.b;
      const canRm = !drawn && !e.group;
      const rm = canRm ? `<button class="link-btn" data-rm-ex="${escapeHtml(e.a)}|${escapeHtml(e.b)}" type="button">${escapeHtml(t('dash.exclusionsRemove'))}</button>` : '';
      const tag = e.group ? ` <span class="muted small">· ${escapeHtml(e.group)}</span>` : '';
      return `<li><span>${escapeHtml(a)} ↔ ${escapeHtml(b)}${tag}</span><span>${rm}</span></li>`;
    }).join('') : `<li><span class="muted small">${escapeHtml(t('dash.exclusionsNone'))}</span></li>`;
    $$('[data-rm-ex]').forEach(btn => btn.onclick = async () => {
      const [a,b] = String(btn.dataset.rmEx || '').split('|');
      game.manualExclusions = (game.manualExclusions || []).filter(e => !((e.a===a&&e.b===b)||(e.a===b&&e.b===a)));
      pushLocalActivity(game, 'room.exclusion_removed', {});
      const sess = roomSession(game.code);
      if (sess && sess.token && game.backend) {
        try { await apiFetch(`/api/rooms/${game.code}/exclusions/${encodeURIComponent(a)}/${encodeURIComponent(b)}`, { method: 'DELETE', token: sess.token }); } catch (e) { console.warn(e); }
      }
      recomputeExclusions(game);
      saveState(); renderDashboard(); loadActivity();
    });
  }
  if (exA && exB) {
    const opts = `<option value="">—</option>` + game.participants.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    const va = exA.value; const vb = exB.value;
    exA.innerHTML = opts; exB.innerHTML = opts;
    if (va) exA.value = va; if (vb) exB.value = vb;
  }
  if (exForm) exForm.classList.toggle('hidden', drawn);

  // groups ("snowdrifts")
  const groupsList = $('#groupsList');
  const groupsBlock = $('#groupsBlock');
  const groupForm = $('#groupForm');
  const groupMembers = $('#groupMembers');
  if (groupsList) {
    const groups = game.groups || [];
    const nameById = new Map(game.participants.map(p => [p.id, p.name]));
    groupsList.innerHTML = groups.length ? groups.map(g => {
      const members = (g.members || []).map(id => nameById.get(id) || id).join(', ');
      const rm = drawn ? '' : `<button class="link-btn" data-rm-group="${escapeHtml(g.id)}" type="button">${escapeHtml(t('dash.exclusionsRemove'))}</button>`;
      return `<li><span><strong>${escapeHtml(g.name)}</strong> <span class="muted small">· ${escapeHtml(t('dash.groupsCount', { n: (g.members || []).length }))}</span><br><span class="muted small">${escapeHtml(members)}</span></span><span>${rm}</span></li>`;
    }).join('') : `<li><span class="muted small">${escapeHtml(t('dash.groupsNone'))}</span></li>`;
    $$('[data-rm-group]').forEach(btn => btn.onclick = async () => {
      const id = btn.dataset.rmGroup;
      const group = (game.groups || []).find(g => g.id === id);
      if (!group) return;
      const members = group.members || [];
      const retained = groupPairs(game.groups, id);
      const toDelete = [];
      for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
        if (!retained.has(pairKey(members[i], members[j]))) toDelete.push([members[i], members[j]]);
      }
      const sess = roomSession(game.code);
      if (sess && sess.token && game.backend) {
        disconnectSSE();
        for (const [a, b] of toDelete) {
          try {
            await apiFetch(`/api/rooms/${game.code}/exclusions/${encodeURIComponent(a)}/${encodeURIComponent(b)}?groupName=${encodeURIComponent(group.name)}`, { method: 'DELETE', token: sess.token });
          } catch (e) { console.warn(e); }
        }
      }
      game.groups = (game.groups || []).filter(g => g.id !== id);
      recomputeExclusions(game);
      pushLocalActivity(game, 'room.exclusion_removed', { groupName: group.name });
      saveState();
      let synced = true;
      if (sess && sess.token && game.backend) {
        try { await syncRoomFromBackend(game.code); } catch (e) { synced = false; console.warn(e); }
      }
      renderDashboard(); loadActivity(); toast(t('dash.groupsRemoved'));
      if (synced && sess && sess.token && game.backend) connectSSE(game.code);
    });
  }
  if (groupsBlock) groupsBlock.classList.toggle('groups-locked', drawn);
  if (groupMembers && groupMembers.dataset.sig !== game.participants.map(p => p.id).join(',')) {
    groupMembers.dataset.sig = game.participants.map(p => p.id).join(',');
    const checked = new Set((groupMembers.querySelectorAll('input:checked') || []).length
      ? Array.from(groupMembers.querySelectorAll('input:checked')).map(i => i.value) : []);
    groupMembers.innerHTML = `<p class="muted small" style="margin:0 0 6px;">${escapeHtml(t('dash.groupsHint'))}</p>` +
      game.participants.map(p => `<label class="group-check"><input type="checkbox" value="${escapeHtml(p.id)}" ${checked.has(p.id) ? 'checked' : ''} ${drawn ? 'disabled' : ''}> ${escapeHtml(p.name)}</label>`).join('');
  }
  if (groupForm) groupForm.classList.toggle('hidden', drawn);

  // assignment
  const recipientProfile = $('#recipientProfile');
  if (drawn && game.assignments[me.id] && revealed) {
    const recv = game.participants.find(p => p.id === game.assignments[me.id]);
    $('#myAssignment').classList.remove('muted', 'assignment--art');
    $('#myAssignment').innerHTML = t('dash.recipientYou', { name: escapeHtml(recv ? recv.name : '—') });
    $('#recipientWishlist').classList.remove('hidden');
    $('#recipientWishlistList').innerHTML = (recv && recv.wishlist.length)
      ? recv.wishlist.map(w => `<li><span>${escapeHtml(w.text)}</span></li>`).join('')
      : `<li class="list-empty-art"><div class="card-media card-media--state"><img src="assets/images/wishlist-empty.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span class="muted">${escapeHtml(t('dash.recipientWishlistEmpty'))}</span></li>`;
    if (recipientProfile) {
      const addr = (recv?.address || '').trim();
      const note = (recv?.profileNote || '').trim();
      const anti = (recv?.antiWishlist || '').trim();
      const size = (recv?.size || '').trim();
      const links = (recv?.links || '').trim();
      const allergies = (recv?.allergies || '').trim();
      const hasAny = !!(addr || note || anti || size || links || allergies);
      recipientProfile.classList.remove('hidden');
      $('#recipientAddressRow').classList.toggle('hidden', !addr);
      $('#recipientNoteRow').classList.toggle('hidden', !note);
      $('#recipientAntiRow').classList.toggle('hidden', !anti);
      $('#recipientSizeRow').classList.toggle('hidden', !size);
      $('#recipientLinksRow').classList.toggle('hidden', !links);
      $('#recipientAllergiesRow').classList.toggle('hidden', !allergies);
      $('#recipientAddress').textContent = addr;
      $('#recipientProfileNote').textContent = note;
      $('#recipientAntiWishlist').textContent = anti;
      $('#recipientSize').textContent = size;
      $('#recipientLinks').textContent = links;
      $('#recipientAllergies').textContent = allergies;
      $('#recipientProfileEmpty').classList.toggle('hidden', hasAny);
    }
  } else if (drawn && game.assignments[me.id] && !revealed) {
    $('#myAssignment').classList.remove('muted', 'assignment--art');
    $('#myAssignment').textContent = t('dash.recipientReady');
    $('#recipientWishlist').classList.add('hidden');
    if (recipientProfile) recipientProfile.classList.add('hidden');
  } else {
    $('#myAssignment').classList.add('muted', 'assignment--art');
    $('#myAssignment').innerHTML = `<div class="card-media card-media--state"><img src="assets/images/recipient-waiting.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span>${escapeHtml(t('dash.recipientNone'))}</span>`;
    $('#recipientWishlist').classList.add('hidden');
    if (recipientProfile) recipientProfile.classList.add('hidden');
  }

  // my wishlist
  $('#myWishlist').innerHTML = me.wishlist.length
    ? me.wishlist.map(w => `<li><span>${escapeHtml(w.text)}</span><button class="link-btn" data-rm-wish="${w.id}" type="button">${escapeHtml(t('dash.wishDelete'))}</button></li>`).join('')
    : `<li class="list-empty-art"><div class="card-media card-media--state"><img src="assets/images/wishlist-empty.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span class="muted">${escapeHtml(t('dash.myWishlistEmpty'))}</span></li>`;
  $$('[data-rm-wish]').forEach(btn => btn.onclick = async () => {
    const wid = btn.dataset.rmWish;
    const sess = roomSession(game.code);
    if (sess && sess.token && game.backend) {
      try { await apiFetch(`/api/rooms/${game.code}/wishlist/${wid}`, { method: 'DELETE', token: sess.token }); } catch (e) { console.warn(e); }
    }
    me.wishlist = me.wishlist.filter(w => w.id !== wid); saveState(); renderDashboard();
  });

  const pf = $('#profileForm');
  if (pf && !pf.contains(document.activeElement)) {
    const a = $('#profileAddress'); if (a) a.value = me.address || '';
    const n = $('#profileNote'); if (n) n.value = me.profileNote || '';
    const aw = $('#profileAnti'); if (aw) aw.value = me.antiWishlist || '';
    const sz = $('#profileSize'); if (sz) sz.value = me.size || '';
    const lk = $('#profileLinks'); if (lk) lk.value = me.links || '';
    const al = $('#profileAllergies'); if (al) al.value = me.allergies || '';
  }

  $('#myGiftStatus').value = me.giftStatus || 'none';
  if (hasAnyChatLoaded() && !hasChatLoaded(game.code)) resetChatState();
  renderChat(game, me, drawn);
  const chatSess = roomSession(game.code);
  if (drawn && chatSess?.token && apiState.online) loadChatMessages({ silent: true });
  setNotice('');
}
function mapBackendRoom(code, data) {
  const prev = state.games[code] || {};
  const prevById = new Map((prev.participants || []).map(p => [p.id, p]));
  const prevByName = new Map((prev.participants || []).map(p => [String(p.name || '').toLowerCase(), p]));
  const members = (data.members || []).map(m => {
    const old = prevById.get(m.id) || prevByName.get(String(m.name || '').toLowerCase()) || {};
    const backendWishlist = Array.isArray(m.wishlist) ? m.wishlist.map(w => ({ id: w.id, text: w.text })) : null;
    return {
      id: m.id,
      name: m.name,
      isOrganizer: m.role === 'organizer',
      wishlist: backendWishlist !== null ? backendWishlist : (Array.isArray(old.wishlist) ? old.wishlist : []),
      giftStatus: m.giftStatus || old.giftStatus || 'none',
      joinedAt: m.joinedAt || old.joinedAt || null,
      address: m.address != null ? m.address : (old.address || ''),
      profileNote: m.profileNote != null ? m.profileNote : (old.profileNote || ''),
      antiWishlist: m.antiWishlist != null ? m.antiWishlist : (old.antiWishlist || ''),
      size: m.size != null ? m.size : (old.size || ''),
      links: m.links != null ? m.links : (old.links || ''),
      allergies: m.allergies != null ? m.allergies : (old.allergies || ''),
    };
  });
  const backendExclusions = Array.isArray(data.exclusions) ? data.exclusions : (prev.exclusions || []);
  const groupPairs = new Set();
  (prev.groups || []).forEach(g => {
    for (let i = 0; i < (g.members || []).length; i++) for (let j = i + 1; j < g.members.length; j++) {
      groupPairs.add([g.members[i], g.members[j]].sort().join('|'));
    }
  });
  const game = {
    ...prev,
    code,
    name: data.room?.name || prev.name || code,
    budgetMin: Number(data.room?.budgetMin ?? prev.budgetMin ?? 0),
    budgetMax: Number(data.room?.budgetMax ?? prev.budgetMax ?? 0),
    eventDate: data.room?.eventDate || prev.eventDate || '',
    theme: data.room?.theme || prev.theme || '',
    mode: data.room?.mode || prev.mode || 'classic',
    participants: members,
    groups: prev.groups || [],
    manualExclusions: backendExclusions.filter(e => !groupPairs.has([e.a, e.b].sort().join('|'))),
    exclusions: backendExclusions,
    assignments: prev.assignments || {},
    revealed: prev.revealed || {},
    backend: true,
    drawInfo: data.draw || null,
    createdAt: prev.createdAt || Date.now(),
  };
  // if backend says draw exists but we don't have mapping, keep empty; assignment fetched separately
  if (data.draw && !Object.keys(game.assignments).length) {
    game.assignments = game.assignments || {};
  }
  if (!data.draw) { game.assignments = {}; game.revealed = {}; }
  recomputeExclusions(game);
  state.games[code] = game;
  return game;
}

async function syncRoomFromBackend(code) {
  const sess = roomSession(code);
  if (!sess || !sess.token) return null;
  const data = await apiFetch(`/api/rooms/${code.toUpperCase()}`, { token: sess.token });
  const game = mapBackendRoom(code.toUpperCase(), data);
  // sync my identity
  if (data.me && data.me.id) {
    if (state.session && state.session.gameCode === code.toUpperCase()) {
      state.session.participantId = data.me.id;
    }
    setRoomSession(code, { memberId: data.me.id });
  }
  // fetch my assignment if drawn
  if (data.draw) {
    try {
      const asn = await apiFetch(`/api/rooms/${code.toUpperCase()}/assignment`, { token: sess.token });
      if (asn && asn.drawn && asn.assignment) {
        const me = currentMe(game);
        if (me) {
          let recv = game.participants.find(p => p.id === asn.assignment.recipientMemberId);
          if (!recv) {
            recv = { id: asn.assignment.recipientMemberId, name: asn.assignment.recipientName || 'Recipient', isOrganizer: false, wishlist: [], giftStatus: 'none', address: '', profileNote: '', antiWishlist: '' };
            game.participants.push(recv);
          }
          if (asn.assignment.recipientName) recv.name = asn.assignment.recipientName;
          if (asn.assignment.recipientAddress != null) recv.address = asn.assignment.recipientAddress;
          if (asn.assignment.recipientProfileNote != null) recv.profileNote = asn.assignment.recipientProfileNote;
          if (asn.assignment.recipientAntiWishlist != null) recv.antiWishlist = asn.assignment.recipientAntiWishlist;
          if (asn.assignment.recipientSize != null) recv.size = asn.assignment.recipientSize;
          if (asn.assignment.recipientLinks != null) recv.links = asn.assignment.recipientLinks;
          if (asn.assignment.recipientAllergies != null) recv.allergies = asn.assignment.recipientAllergies;
          game.assignments[me.id] = asn.assignment.recipientMemberId;
        }
      }
    } catch {}
  }
  saveState();
  return game;
}

let sse = null;
let sseCode = null;
function disconnectSSE() {
  if (sse) { try { sse.close(); } catch {} sse = null; sseCode = null; }
}
function connectSSE(code) {
  const c = (code || '').toUpperCase();
  const sess = roomSession(c);
  if (!sess || !sess.token || !apiState.online) { disconnectSSE(); return; }
  if (sse && sseCode === c) return;
  disconnectSSE();
  const url = `${apiState.base}/api/rooms/${c}/events?token=${encodeURIComponent(sess.token)}`;
  try {
    sse = new EventSource(url);
    sseCode = c;
    const onEvt = () => { if (currentGame()?.code === c) refreshDashboard(); };
    ['room.draw_completed','room.wishlist_updated','room.gift_status_updated','room.draw_reset','room.member_joined','room.created','room.profile_updated','room.exclusion_added','room.exclusion_removed'].forEach(t => sse.addEventListener(t, onEvt));
    sse.addEventListener('room.message', () => {
      if (currentGame()?.code !== c) return;
      invalidateChat();
      loadChatMessages({ silent: true, force: true });
      loadActivity();
    });
    sse.onerror = () => { /* browser will retry; keep simple */ };
  } catch (e) { console.warn('SSE failed', e); }
}

async function loadSessions() {
  const game = currentGame();
  const list = $('#sessionsList');
  const notice = $('#accessNotice');
  if (!game || !list) return;
  const sess = roomSession(game.code);
  if (!sess || !sess.token || !apiState.online) {
    list.innerHTML = `<li class="list-empty-art"><div class="card-media card-media--state"><img src="assets/images/access-empty.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span class="muted small">${escapeHtml(t('dash.noSessions'))}</span></li>`;
    if (notice) notice.textContent = '';
    return;
  }
  try {
    const data = await apiFetch(`/api/rooms/${game.code}/sessions`, { token: sess.token });
    const sessions = data.sessions || [];
    if (!sessions.length) {
      list.innerHTML = `<li class="list-empty-art"><div class="card-media card-media--state"><img src="assets/images/access-empty.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span class="muted small">${escapeHtml(t('dash.noSessions'))}</span></li>`;
    } else {
      list.innerHTML = sessions.slice(0, 10).map(s => {
        const cur = sess.sessionId && s.id === sess.sessionId;
        const revoked = !!s.revoked_at;
        const meta = [cur ? t('dash.sessionCurrent') : '', revoked ? t('dash.sessionRevoked') : '', (s.last_seen_at || s.created_at || '').replace('T',' ').replace('Z','')].filter(Boolean).join(' · ');
        const btn = (!revoked && !cur) ? `<button class="link-btn" data-revoke-sess="${escapeHtml(s.id)}" type="button">${escapeHtml(t('dash.revokeSession'))}</button>` : '';
        return `<li><span><strong>${escapeHtml((s.user_agent || 'Session').slice(0, 48))}</strong>${meta ? ` <span class="muted small">· ${escapeHtml(meta)}</span>` : ''}</span><span>${btn}</span></li>`;
      }).join('');
      $$('[data-revoke-sess]').forEach(btn => btn.onclick = async () => {
        const sid = btn.dataset.revokeSess;
        try {
          await apiFetch(`/api/rooms/${game.code}/sessions/revoke`, { method: 'POST', token: sess.token, body: { sessionId: sid } });
          toast(t('dash.sessionRevokedOk'));
          loadSessions();
        } catch (e) { console.warn(e); toast(e.message || 'Error'); }
      });
    }
    if (notice) notice.textContent = apiState.base ? `API: ${apiState.base}` : '';
  } catch (e) {
    list.innerHTML = `<li class="list-empty-art"><div class="card-media card-media--state"><img src="assets/images/access-empty.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span class="muted small">${escapeHtml(t('dash.noSessions'))}</span></li>`;
    if (notice) notice.textContent = '';
  }
}

async function loadActivity() {
  const panel = $('#activityPanel'); if (!panel) return;
  const game = currentGame(); const me = currentMe(game);
  const organizer = !!(me && (me.isOrganizer || game?.demo));
  panel.classList.toggle('hidden', !organizer);
  if (!organizer) return;
  const list = $('#activityList'); const notice = $('#activityNotice');
  let events = [];
  const sess = roomSession(game.code);
  if (sess && sess.token && apiState.online && game.backend) {
    try {
      const data = await apiFetch(`/api/rooms/${game.code}/activity`, { token: sess.token });
      events = Array.isArray(data.events) ? data.events : [];
      if (notice) notice.textContent = '';
    } catch (e) {
      events = localActivity(game);
      if (notice) notice.textContent = e.message || t('dash.activityDemo');
    }
  } else {
    events = localActivity(game);
    if (notice) notice.textContent = game.demo ? t('dash.activityDemo') : '';
  }
  const seenGroups = new Set();
  events = events.filter(ev => {
    const name = ev.payload?.groupName;
    if (!name) return true;
    const key = `${ev.type}:${name}`;
    if (seenGroups.has(key)) return false;
    seenGroups.add(key); return true;
  });
  if (!list) return;
  list.innerHTML = events.length ? events.map(ev => `
    <li class="activity-item">
      <span class="activity-item__dot" aria-hidden="true"></span>
      <span><strong>${escapeHtml(activityText(ev, game))}</strong>${ev.createdAt ? ` <span class="muted small">· ${escapeHtml(formatTime(ev.createdAt))}</span>` : ''}</span>
    </li>`).join('') : `<li class="list-empty-art"><div class="card-media card-media--state"><img src="assets/images/activity-empty.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" /></div><span class="muted small">${escapeHtml(t('dash.activityEmpty'))}</span></li>`;
}

async function refreshDashboard() {
  const game = currentGame();
  if (!game) { renderDashboard(); return; }
  const code = game.code;
  const sess = roomSession(code);
  if (sess && sess.token) {
    try {
      await detectBackend();
      if (apiState.online) {
        await syncRoomFromBackend(code);
        connectSSE(code);
        loadSessions();
      } else {
        disconnectSSE();
      }
    } catch (e) {
      console.warn('sync failed', e);
    }
  } else {
    disconnectSSE();
  }
  renderDashboard();
  loadActivity();
}

export { inviteUrl, renderInviteText, setDashTab, addWish, renderDashboard, mapBackendRoom, syncRoomFromBackend, connectSSE, disconnectSSE, loadSessions, loadActivity, refreshDashboard };
