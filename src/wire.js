import { $, $$, makeCode, uid, downloadText } from './utils.js?v=68';
import { state, saveState, clearChatCacheForCode } from './storage.js?v=68';
import { apiState, apiFetch, detectBackend, roomSession, setRoomSession } from './api.js?v=68';
import { t, getLang } from './i18n.js?v=68';
import { toast, openConfirm, closeConfirm, confirmOk } from './feedback.js?v=68';
import { views, navigate, updateNavHint } from './router.js?v=68';
import { ensureGame, recomputeExclusions, currentGame, currentMe, derangement, pairKey, groupPairs, isExcluded, pushLocalActivity, createDemoGame } from './game.js?v=68';
import { renderChat, loadChatMessages, sendChatMessage, resetChatState, setChatChannel } from './chat.js?v=68';
import { renderSiteGuide, renderRoomGuide, renderPresetChips, focusGuideTarget, setRoomGuideStep } from './guides.js?v=68';
import { setDashTab, addWish, refreshDashboard, renderDashboard, syncRoomFromBackend, disconnectSSE, connectSSE, loadSessions, loadActivity, inviteUrl } from './room.js?v=68';
import { hideQuickPersonal, renderQuickResult, setQuickPairs, getQuickPairs } from './quick.js?v=68';

// Единая регистрация обработчиков DOM-событий приложения.
function wire() {
  const demoBtn = $('#demoBtn');
  if (demoBtn) demoBtn.addEventListener('click', createDemoGame);
  const demoBtnModes = $('#demoBtnModes');
  if (demoBtnModes) demoBtnModes.addEventListener('click', createDemoGame);
  const resetDemoBtn = $('#resetDemoBtn');
  if (resetDemoBtn) resetDemoBtn.addEventListener('click', () => { createDemoGame(); });
  document.addEventListener('click', async (e) => {
    const preset = e.target.closest('[data-preset-key]');
    if (preset) {
      const text = t(preset.dataset.presetKey);
      if (preset.dataset.presetKind === 'wish') { await addWish(text); return; }
      const field = $('#profileAnti'); if (!field) return;
      const current = field.value.trim();
      if (current.includes(text)) return;
      field.value = current ? `${current}, ${text}` : text;
      $('#profileForm')?.requestSubmit();
      return;
    }
    const el = e.target.closest('[data-nav]');
    if (el) {
      e.preventDefault();
      const nav = el.dataset.nav || (el.getAttribute('href') || '').replace('#', '');
      if (nav === 'quick') { hideQuickPersonal(); if (location.hash.includes('?')) location.hash = 'quick'; }
      navigate(nav);
      return;
    }
    const action = e.target.closest('[data-guide-action]');
    if (action) { if (action.dataset.guideAction === 'demo') createDemoGame(); return; }
    const go = e.target.closest('[data-guide-go]');
    if (go) { setDashTab(go.dataset.guideGo, { scroll: true }); focusGuideTarget(go.dataset.guideFocus); return; }
    const step = e.target.closest('[data-guide-step]');
    if (step) {
      const i = Number(step.dataset.guideStep);
      if (step.closest('#siteGuide')) renderSiteGuide(i);
      else { setRoomGuideStep(i); renderRoomGuide(currentGame(), currentMe(currentGame()), i); }
    }
  });
  $$('[data-dash-tab]').forEach(btn => btn.addEventListener('click', () => setDashTab(btn.dataset.dashTab, { scroll: true })));
  const navEl = $('.nav');
  if (navEl) navEl.addEventListener('scroll', updateNavHint, { passive: true });
  window.addEventListener('resize', updateNavHint);
  updateNavHint();
  window.addEventListener('hashchange', () => {
    const raw = location.hash.replace('#', ''); const v = raw.split('?')[0];
    if (views.includes(v)) navigate(v);
  });

  $('#createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#createError'); err.textContent = '';
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const name = $('#gameName').value.trim();
    const orgName = $('#organizerName').value.trim();
    const budgetMin = Number($('#budgetMin').value);
    const budgetMax = Number($('#budgetMax').value);
    const eventDate = $('#eventDate').value;
    const theme = $('#theme').value.trim();
    if (!name || !orgName) { err.textContent = t('err.createRequired'); return; }
    if (!eventDate) { err.textContent = t('err.createDate'); return; }
    if (isNaN(budgetMin) || isNaN(budgetMax) || budgetMax < budgetMin) { err.textContent = t('err.createBudget'); return; }
    if (submitBtn) submitBtn.disabled = true;
    try {
      await detectBackend();
      if (apiState.online) {
        try {
          const data = await apiFetch('/api/rooms', {
            method: 'POST',
            body: { name, organizerName: orgName, budgetMin, budgetMax, eventDate, theme, mode: 'classic' },
          });
          const code = String(data.room.code).toUpperCase();
          setRoomSession(code, {
            token: data.token,
            sessionId: data.sessionId,
            memberId: data.member?.id,
            inviteToken: data.inviteToken,
            role: data.member?.role,
          });
          const game = {
            code, name, budgetMin, budgetMax, eventDate, theme,
            participants: [{ id: data.member.id, name: orgName, isOrganizer: true, wishlist: [], giftStatus: 'none', address: '', profileNote: '', antiWishlist: '' }],
            assignments: {}, revealed: {}, exclusions: [], createdAt: Date.now(), backend: true,
          };
          state.games[code] = game;
          state.session = { gameCode: code, participantId: data.member.id };
          saveState();
          e.target.reset();
          $('#budgetMin').value = 500; $('#budgetMax').value = 1500;
          toast(t('toast.created'));
          navigate('dashboard');
          refreshDashboard();
          return;
        } catch (apiErr) {
          console.warn('backend create failed, fallback local', apiErr);
          // fallback to local below
        }
      }
      let code = makeCode(); while (state.games[code]) code = makeCode();
      const organizer = { id: uid('p'), name: orgName, isOrganizer: true, wishlist: [], giftStatus: 'none', address: '', profileNote: '', antiWishlist: '' };
      const game = { code, name, budgetMin, budgetMax, eventDate, theme, participants: [organizer], assignments: {}, revealed: {}, exclusions: [], createdAt: Date.now(), backend: false };
      state.games[code] = game;
      state.session = { gameCode: code, participantId: organizer.id };
      saveState();
      e.target.reset();
      $('#budgetMin').value = 500; $('#budgetMax').value = 1500;
      toast(t('toast.created'));
      navigate('dashboard');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  $('#joinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#joinError'); err.textContent = '';
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const code = $('#joinCode').value.trim().toUpperCase();
    const name = $('#joinName').value.trim();
    if (!code || !name) { err.textContent = t('err.joinRequired'); return; }
    if (submitBtn) submitBtn.disabled = true;
    try {
      await detectBackend();
      if (apiState.online) {
        try {
          const sess = roomSession(code) || {};
          const body = { code, name };
          if (sess.memberToken) body.memberToken = sess.memberToken;
          if (sess.inviteToken) body.inviteToken = sess.inviteToken;
          const data = await apiFetch('/api/rooms/join', { method: 'POST', body, token: sess.token });
          const rcode = String(data.room.code).toUpperCase();
          setRoomSession(rcode, {
            token: data.token,
            sessionId: data.sessionId,
            memberId: data.member?.id,
            memberToken: data.memberToken || sess.memberToken,
            inviteToken: sess.inviteToken,
            role: data.member?.role,
          });
          // seed local game; then sync full state
          if (!state.games[rcode]) {
            state.games[rcode] = { code: rcode, name: data.room.name, participants: [], assignments: {}, revealed: {}, exclusions: [], createdAt: Date.now(), backend: true };
          }
          state.session = { gameCode: rcode, participantId: data.member.id };
          saveState();
          await syncRoomFromBackend(rcode);
          e.target.reset();
          toast(t('toast.joined'));
          navigate('dashboard');
          renderDashboard();
          return;
        } catch (apiErr) {
          if (apiErr && apiErr.status === 404) { err.textContent = t('err.joinNotFoundOnline'); return; }
          console.warn('backend join failed, fallback local', apiErr);
          // fall through to local
        }
      }
      const game = state.games[code];
      if (!game) { err.textContent = t('err.joinNotFound'); return; }
      ensureGame(game);
      let p = game.participants.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!p) { p = { id: uid('p'), name, isOrganizer: false, wishlist: [], giftStatus: 'none', address: '', profileNote: '', antiWishlist: '' }; game.participants.push(p); }
      state.session = { gameCode: code, participantId: p.id };
      saveState();
      e.target.reset();
      toast(t('toast.joined'));
      navigate('dashboard');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  $('#addParticipantForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const game = currentGame(); if (!game) return; ensureGame(game);
    const sess = roomSession(game.code);
    if (sess && sess.token && game.backend) {
      toast(getLang() === 'ru' ? 'В онлайн-режиме поделитесь кодом/ссылкой, чтобы участник присоединился сам.' : 'In online mode, share the code/link so the participant can join.');
      return;
    }
    const input = $('#addName'); const name = input.value.trim(); if (!name) return;
    if (game.participants.some(p => p.name.toLowerCase() === name.toLowerCase())) { toast(t('toast.participantExists')); return; }
    const participant = { id: uid('p'), name, isOrganizer: false, wishlist: [], giftStatus: 'none', address: '', profileNote: '', antiWishlist: '' };
    game.participants.push(participant);
    pushLocalActivity(game, 'room.member_joined', { memberId: participant.id, name });
    saveState(); input.value = ''; renderDashboard(); loadActivity(); toast(t('toast.participantAdded'));
  });

  const exclusionForm = $('#exclusionForm');
  if (exclusionForm) exclusionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
    const a = $('#exclusionA').value; const b = $('#exclusionB').value;
    if (!a || !b || a === b) { toast(t('dash.exclusionsSame')); return; }
    const [x, y] = [a, b].sort();
    if ((game.manualExclusions || []).some(e => (e.a===x&&e.b===y)||(e.a===y&&e.b===x))) { toast(t('dash.exclusionsExists')); return; }
    const sess = roomSession(game.code);
    if (sess && sess.token && game.backend) {
      try {
        await apiFetch(`/api/rooms/${game.code}/exclusions`, { method: 'POST', token: sess.token, body: { a: x, b: y } });
        await syncRoomFromBackend(game.code);
        renderDashboard(); loadActivity(); toast(t('dash.exclusionsAdded'));
        return;
      } catch (err) { console.warn(err); toast(err.message || t('toast.drawFail')); return; }
    }
    game.manualExclusions = game.manualExclusions || [];
    game.manualExclusions.push({ id: uid('ex'), a: x, b: y });
    recomputeExclusions(game);
    pushLocalActivity(game, 'room.exclusion_added', {});
    saveState(); renderDashboard(); loadActivity(); toast(t('dash.exclusionsAdded'));
  });

  const groupForm = $('#groupForm');
  if (groupForm) groupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let game = currentGame(); if (!game) return;
    const name = ($('#groupName')?.value || '').trim();
    const members = Array.from(document.querySelectorAll('#groupMembers input:checked')).map(i => i.value);
    if (!name || members.length < 2) { toast(t('dash.groupsNeed')); return; }
    const existing = groupPairs(game.groups);
    const newPairs = new Set();
    for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
      newPairs.add(pairKey(members[i], members[j]));
    }
    const group = { id: uid('grp'), name, members };
    // Save the group locally first so SSE-triggered syncs classify its pairs as group exclusions.
    game.groups = game.groups || [];
    game.groups.push(group);
    recomputeExclusions(game);
    pushLocalActivity(game, 'room.exclusion_added', { groupName: name });
    saveState();
    const sess = roomSession(game.code);
    let synced = true;
    if (sess && sess.token && game.backend) {
      disconnectSSE();
      const failed = new Set();
      for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
        const key = pairKey(members[i], members[j]);
        if (existing.has(key)) continue;
        try {
          await apiFetch(`/api/rooms/${game.code}/exclusions`, {
            method: 'POST', token: sess.token,
            body: { a: members[i], b: members[j], groupName: name },
          });
        } catch (err) { console.warn(err); failed.add(key); }
      }
      try { game = await syncRoomFromBackend(game.code) || game; }
      catch (e) { synced = false; console.warn(e); }
      // Exclusions created for this group are shown as group pairs, not manual ones.
      game.manualExclusions = (game.manualExclusions || []).filter(e => !newPairs.has(pairKey(e.a, e.b)));
      // Keep constraints locally even if a backend write failed.
      failed.forEach(key => {
        const [a, b] = key.split('|');
        if (!isExcluded(game.manualExclusions, a, b)) game.manualExclusions.push({ id: uid('ex'), a, b });
      });
      recomputeExclusions(game);
    }
    if ($('#groupName')) $('#groupName').value = '';
    saveState(); renderDashboard(); loadActivity(); toast(t('dash.groupsCreated'));
    if (synced && sess && sess.token && game.backend) connectSSE(game.code);
  });

  $('#wishlistForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#wishText'); const text = (input?.value || '').trim(); if (!text) return;
    if (await addWish(text)) input.value = '';
  });

  const chatTabRecipient = $('#chatTabRecipient');
  const chatTabSanta = $('#chatTabSanta');
  if (chatTabRecipient) chatTabRecipient.addEventListener('click', () => {
    setChatChannel('to_recipient');
    const game = currentGame(); const me = currentMe(game);
    renderChat(game, me, !!(game && game.assignments && Object.keys(game.assignments).length > 0));
    loadChatMessages({ silent: true, force: true });
  });
  if (chatTabSanta) chatTabSanta.addEventListener('click', () => {
    setChatChannel('to_santa');
    const game = currentGame(); const me = currentMe(game);
    renderChat(game, me, !!(game && game.assignments && Object.keys(game.assignments).length > 0));
    loadChatMessages({ silent: true, force: true });
  });
  $$('[data-tpl]').forEach(btn => btn.addEventListener('click', () => {
    const input = $('#chatInput'); if (!input) return;
    input.value = t(btn.dataset.tpl); input.focus();
  }));
  const chatForm = $('#chatForm');
  if (chatForm) chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#chatInput');
    const text = (input?.value || '').trim();
    if (!text) return;
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await sendChatMessage(text);
      if (input) input.value = '';
    } catch (err) {
      console.warn(err);
      toast(err.message || 'Chat error');
    } finally {
      if (btn) btn.disabled = false;
      if (input) input.focus();
    }
  });

  const profileForm = $('#profileForm');
  if (profileForm) profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const game = currentGame(); const me = currentMe(game);
    if (!game || !me) return;
    const address = ($('#profileAddress')?.value || '').trim();
    const profileNote = ($('#profileNote')?.value || '').trim();
    const antiWishlist = ($('#profileAnti')?.value || '').trim();
    const size = ($('#profileSize')?.value || '').trim();
    const links = ($('#profileLinks')?.value || '').trim();
    const allergies = ($('#profileAllergies')?.value || '').trim();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      const sess = roomSession(game.code);
      if (sess && sess.token && game.backend) {
        await apiFetch(`/api/rooms/${game.code}/profile`, { method: 'POST', token: sess.token, body: { address, profileNote, antiWishlist, size, links, allergies } });
      }
      me.address = address; me.profileNote = profileNote; me.antiWishlist = antiWishlist;
      me.size = size; me.links = links; me.allergies = allergies;
      pushLocalActivity(game, 'room.profile_updated', { memberId: me.id, name: me.name });
      saveState();
      toast(t('dash.profileSaved'));
      const notice = $('#profileNotice');
      if (notice) { notice.textContent = t('dash.profileSaved'); setTimeout(() => { if (notice.textContent === t('dash.profileSaved')) notice.textContent = ''; }, 2000); }
    } catch (err) {
      console.warn(err);
      toast(err.message || 'Error');
    } finally {
      if (btn) btn.disabled = false;
      renderPresetChips(game, me);
      renderRoomGuide(game, me);
    }
  });


  $('#drawBtn').addEventListener('click', async () => {
    const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
    ensureGame(game);
    if (game.participants.length < 3) { toast(t('toast.drawNeed3')); return; }
    const sess = roomSession(game.code);
    if (sess && sess.token && game.backend) {
      $('#drawBtn').disabled = true;
      try {
        await apiFetch(`/api/rooms/${game.code}/draw`, { method: 'POST', token: sess.token, body: {} });
        await syncRoomFromBackend(game.code);
        clearChatCacheForCode(game.code); resetChatState();
        renderDashboard();
        toast(t('toast.drawDone'));
      } catch (e) {
        console.warn(e);
        toast(e.data?.error === 'draw_failed_constraints' ? t('toast.drawFail') : (e.message || t('toast.drawFail')));
        renderDashboard();
      }
      return;
    }
    const map = derangement(game.participants, game.exclusions || []);
    if (!map) { toast(t('toast.drawFail')); return; }
    game.assignments = map; game.revealed = {};
    pushLocalActivity(game, 'room.draw_completed', { memberCount: game.participants.length });
    clearChatCacheForCode(game.code); resetChatState();
    saveState(); renderDashboard(); loadActivity(); toast(t('toast.drawDone'));
  });

  $('#revealBtn').addEventListener('click', () => {
    const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
    if (!game.assignments || !game.assignments[me.id]) return;
    game.revealed = game.revealed || {}; game.revealed[me.id] = true;
    saveState(); renderDashboard();
  });

  $('#resetDrawBtn').addEventListener('click', () => {
    const game = currentGame(); if (!game) return;
    openConfirm(t('confirm.reset'), async () => {
      const sess = roomSession(game.code);
      if (sess && sess.token && game.backend) {
        try {
          await apiFetch(`/api/rooms/${game.code}/draw/reset`, { method: 'POST', token: sess.token, body: {} });
          await syncRoomFromBackend(game.code);
          clearChatCacheForCode(game.code); resetChatState();
          renderDashboard(); toast(t('toast.drawReset'));
        } catch (e) { console.warn(e); toast(e.message || t('toast.drawFail')); }
        return;
      }
      game.assignments = {}; game.revealed = {};
      pushLocalActivity(game, 'room.draw_reset', {});
      clearChatCacheForCode(game.code); resetChatState();
      saveState(); renderDashboard(); loadActivity(); toast(t('toast.drawReset'));
    });
  });

  $('#leaveBtn').addEventListener('click', () => {
    openConfirm(t('confirm.leave'), () => {
      disconnectSSE();
      state.session = null; saveState(); renderDashboard(); navigate('home');
    });
  });

  $('#copyCodeBtn').addEventListener('click', async () => {
    const game = currentGame(); if (!game) return;
    const sess = roomSession(game.code);
    const inviteToken = sess?.inviteToken;
    const url = new URL(location.href);
    url.hash = inviteToken ? `join?code=${encodeURIComponent(game.code)}&invite=${encodeURIComponent(inviteToken)}` : `join?code=${encodeURIComponent(game.code)}`;
    const text = inviteToken ? url.toString() : game.code;
    try { await navigator.clipboard.writeText(text); toast(inviteToken ? t('toast.copiedLink') : t('toast.copied')); } catch { toast(text); }
  });

  const inviteBtn = $('#inviteBtn');
  if (inviteBtn) inviteBtn.addEventListener('click', () => {
    setDashTab('access', { scroll: true });
    const b = $('#copyInviteBtn');
    if (b) b.click();
    else {
      const game = currentGame();
      if (game) { navigator.clipboard?.writeText(location.origin + location.pathname + '#join?code=' + encodeURIComponent(game.code)); toast(t('toast.copiedLink')); }
    }
  });
  const inviteCopyBtn = $('#inviteCopyBtn');
  if (inviteCopyBtn) inviteCopyBtn.addEventListener('click', async () => {
    const text = $('#inviteText')?.value || ''; if (!text) return;
    try { await navigator.clipboard.writeText(text); toast(t('toast.copied')); } catch { toast(text); }
  });
  const shareInvite = (network) => {
    const text = $('#inviteText')?.value || ''; if (!text) return;
    const url = encodeURIComponent(text);
    const targets = {
      telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl(currentGame() || { code: '' }))}&text=${url}`,
      whatsapp: `https://wa.me/?text=${url}`,
      email: `mailto:?subject=${encodeURIComponent(t('cta.title'))}&body=${url}`,
    };
    window.open(targets[network], '_blank', 'noopener,noreferrer');
  };
  const inviteTelegramBtn = $('#inviteTelegramBtn'); if (inviteTelegramBtn) inviteTelegramBtn.addEventListener('click', () => shareInvite('telegram'));
  const inviteWhatsappBtn = $('#inviteWhatsappBtn'); if (inviteWhatsappBtn) inviteWhatsappBtn.addEventListener('click', () => shareInvite('whatsapp'));
  const inviteEmailBtn = $('#inviteEmailBtn'); if (inviteEmailBtn) inviteEmailBtn.addEventListener('click', () => shareInvite('email'));
  const copyInviteBtn = $('#copyInviteBtn');
  if (copyInviteBtn) copyInviteBtn.addEventListener('click', async () => {
    const game = currentGame(); if (!game) return;
    const sess = roomSession(game.code);
    let inviteToken = sess?.inviteToken;
    if (!inviteToken && sess?.token && apiState.online) {
      try {
        const inv = await apiFetch(`/api/rooms/${game.code}/invites`, { method: 'POST', token: sess.token, body: { label: 'ui', role: 'participant' } });
        inviteToken = inv.invite?.token;
        if (inviteToken) { setRoomSession(game.code, { inviteToken }); saveState(); }
      } catch (e) { console.warn(e); }
    }
    const url = new URL(location.href);
    url.hash = inviteToken ? `join?code=${encodeURIComponent(game.code)}&invite=${encodeURIComponent(inviteToken)}` : `join?code=${encodeURIComponent(game.code)}`;
    try { await navigator.clipboard.writeText(url.toString()); toast(t('toast.copiedLink')); } catch { toast(url.toString()); }
  });
  const refreshSessionsBtn = $('#refreshSessionsBtn');
  if (refreshSessionsBtn) refreshSessionsBtn.addEventListener('click', () => loadSessions());

  $('#myGiftStatus').addEventListener('change', async (e) => {
    const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
    const val = e.target.value;
    me.giftStatus = val;
    pushLocalActivity(game, 'room.gift_status_updated', { memberId: me.id, name: me.name, giftStatus: val });
    saveState(); loadActivity(); toast(t('toast.statusSaved'));
    const sess = roomSession(game.code);
    if (sess && sess.token && game.backend) {
      try { await apiFetch(`/api/rooms/${game.code}/gift-status`, { method: 'POST', token: sess.token, body: { status: val } }); }
      catch (err) { console.warn(err); }
    }
  });

  $('#confirmOkBtn').addEventListener('click', confirmOk);
  $$('[data-close-confirm]').forEach(el => el.addEventListener('click', closeConfirm));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#confirmModal').classList.contains('hidden')) {
      e.preventDefault();
      closeConfirm();
    }
  });

  const quickDrawBtn = $('#quickDrawBtn');
  const quickResetBtn = $('#quickResetBtn');
  const quickCopyBtn = $('#quickCopyBtn');
  if (quickDrawBtn) quickDrawBtn.addEventListener('click', () => {
    hideQuickPersonal();
    const err = $('#quickError'); if (err) err.textContent = '';
    const raw = ($('#quickNames')?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const names = raw.map(s => s.replace(/\s+/g, ' '));
    const seen = new Set();
    for (const n of names) { const k = n.toLowerCase(); if (seen.has(k)) { if (err) err.textContent = t('quick.errDup'); return; } seen.add(k); }
    if (names.length < 3) { if (err) err.textContent = t('quick.errMin'); return; }
    const participants = names.map((name, i) => ({ id: 'q' + i, name }));
    const map = derangement(participants, []);
    if (!map) { if (err) err.textContent = t('quick.errFail'); return; }
    setQuickPairs(participants.map(p => ({ santa: p.name, recipient: participants.find(r => r.id === map[p.id])?.name || '' })));
    renderQuickResult();
  });
  if (quickResetBtn) quickResetBtn.addEventListener('click', () => {
    hideQuickPersonal();
    setQuickPairs([]);
    const qn = $('#quickNames'); if (qn) qn.value = '';
    const err = $('#quickError'); if (err) err.textContent = '';
    renderQuickResult();
  });
  if (quickCopyBtn) quickCopyBtn.addEventListener('click', async () => {
    const quick = getQuickPairs();
    if (!quick.length) return;
    const text = quick.map(p => `${p.santa} → ${p.recipient}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast(t('quick.copied')); } catch { toast(text); }
  });
  const quickCsvBtn = $('#quickCsvBtn');
  if (quickCsvBtn) quickCsvBtn.addEventListener('click', () => {
    const quick = getQuickPairs();
    if (!quick.length) return;
    const csv = '\uFEFFСанта,Получатель\n' + quick.map(p => `"${p.santa.replace(/"/g, '""')}","${p.recipient.replace(/"/g, '""')}"`).join('\n');
    downloadText('secret-santa-pairs.csv', csv, 'text/csv;charset=utf-8');
    toast(t('quick.csvDone'));
  });
  const quickPrintBtn = $('#quickPrintBtn');
  if (quickPrintBtn) quickPrintBtn.addEventListener('click', () => window.print());
}

export { wire };
