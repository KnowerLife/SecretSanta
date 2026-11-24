(() => {
  const STORAGE_KEY = 'secret-santa-simple-v1';
  const LANG_KEY = 'secret-santa-lang';
  const views = ['home', 'create', 'join', 'dashboard'];
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const I18N = {
    ru: {
      'meta.title': 'Тайный Санта — организатор обмена подарками',
      'meta.desc': 'Простой и уютный способ организовать Тайный Санта: создайте игру, пригласите участников по коду и проведите честную жеребьёвку.',
      'skip': 'К содержимому',
      'nav.aria': 'Основная навигация',
      'brand.aria': 'Тайный Санта — на главную',
      'wish.label': 'Новое пожелание',
      'participant.label': 'Имя участника',
      'brand.name': '<span class="brand__word">Тайный</span> <span class="brand__word brand__word--accent">Санта</span>',
      'nav.home': 'Главная',
      'nav.create': 'Создать игру',
      'nav.join': 'Войти по коду',
      'nav.dashboard': 'Моя игра',
      'nav.lang': 'EN',
      'nav.langAria': 'Switch to English',
      'hero.eyebrow': 'Новогодний обмен подарками',
      'hero.title': '<span class="brand__word">Тайный</span> <span class="brand__word brand__word--accent">Санта</span>',
      'hero.lead': 'Организуйте обмен подарками легко и приятно: создайте игру, пригласите участников по коду и проведите честную жеребьёвку. Каждый узнает только своего получателя.',
      'hero.ctaCreate': 'Создать игру',
      'hero.ctaJoin': 'Войти по коду',
      'hero.note': 'Бесплатно · Без регистрации · Данные сохраняются в вашем браузере',
      'steps.kicker': 'Как это работает',
      'steps.title': 'Три простых шага до праздника',
      'steps.sub': 'Создайте игру, соберите участников и проведите жеребьёвку — всё понятно и без лишних действий.',
      'steps.1.num': 'Шаг 1',
      'steps.1.title': 'Создайте игру',
      'steps.1.text': 'Укажите название, дату обмена и бюджет. Комната с кодом для участников будет готова сразу.',
      'steps.2.num': 'Шаг 2',
      'steps.2.title': 'Соберите участников',
      'steps.2.text': 'Поделитесь кодом комнаты. Участники войдут, добавят себя и смогут оставить пожелания к подарку.',
      'steps.3.num': 'Шаг 3',
      'steps.3.title': 'Проведите жеребьёвку',
      'steps.3.text': 'Когда все готовы, запустите жеребьёвку. Каждый участник увидит только своего получателя.',
      'faq.kicker': 'Вопросы и ответы',
      'faq.title': 'Частые вопросы',
      'faq.1.q': 'Что такое «Тайный Санта»?',
      'faq.1.a': 'Это игра, в которой каждый участник тайно готовит подарок другому человеку. Пары определяются случайной жеребьёвкой, а результат каждый узнаёт лично.',
      'faq.2.q': 'Нужна ли регистрация?',
      'faq.2.a': 'Нет. Достаточно создать игру или войти по коду. В этой версии данные сохраняются локально в вашем браузере.',
      'faq.3.q': 'Кто увидит результат жеребьёвки?',
      'faq.3.a': 'Только вы видите имя человека, которому готовите подарок. Остальные пары остаются тайной.',
      'faq.4.q': 'Сколько нужно участников?',
      'faq.4.a': 'Минимум три человека, чтобы жеребьёвка прошла корректно и никто не получил самого себя.',
      'cta.kicker': 'Готовы начать?',
      'cta.title': 'Организуйте Тайный Санта онлайн',
      'cta.sub': 'Создайте игру за минуту и пригласите участников по коду.',
      'create.kicker': 'Новая игра',
      'create.title': 'Создать игру',
      'create.sub': 'Заполните основные настройки — комната будет готова сразу после создания.',
      'create.gameName': 'Название игры',
      'create.gameNamePh': 'Например: Новый год в офисе',
      'create.organizerName': 'Ваше имя',
      'create.organizerNamePh': 'Как вас зовут',
      'create.eventDate': 'Дата обмена',
      'create.budget': 'Бюджет подарка',
      'create.budgetMin': 'От, ₽',
      'create.budgetMax': 'До, ₽',
      'create.theme': 'Тема или пожелания',
      'create.optional': '(необязательно)',
      'create.themePh': 'Например: уютные и полезные подарки',
      'create.submit': 'Создать игру',
      'create.cancel': 'Отмена',
      'join.kicker': 'Присоединиться',
      'join.title': 'Войти в игру',
      'join.sub': 'Введите код комнаты и своё имя, чтобы присоединиться к обмену подарками.',
      'join.code': 'Код комнаты',
      'join.codePh': 'SANTA-XXXX',
      'join.codeHint': 'Код можно получить у организатора игры.',
      'join.name': 'Ваше имя',
      'join.namePh': 'Например: Анна',
      'join.submit': 'Войти в игру',
      'join.cancel': 'Отмена',
      'dash.emptyKicker': 'Моя игра',
      'dash.emptyTitle': 'Здесь появится ваша игра',
      'dash.emptySub': 'Создайте новую игру или войдите по коду, чтобы начать обмен подарками.',
      'dash.emptyCreate': 'Создать игру',
      'dash.emptyJoin': 'Войти по коду',
      'dash.roomCode': 'Код комнаты',
      'dash.copy': 'Скопировать',
      'dash.copyAria': 'Скопировать код комнаты',
      'dash.draw': 'Провести жеребьёвку',
      'dash.drawDone': 'Жеребьёвка проведена',
      'dash.reveal': 'Показать, кому я дарю',
      'dash.reset': 'Сбросить жеребьёвку',
      'dash.leave': 'Выйти из игры',
      'dash.recipientTitle': 'Ваш получатель',
      'dash.recipientSub': 'Здесь появится имя после жеребьёвки',
      'dash.recipientNone': 'Жеребьёвка ещё не проведена.',
      'dash.recipientReady': 'Жеребьёвка проведена. Нажмите «Показать, кому я дарю».',
      'dash.recipientYou': 'Вы дарите подарок: <strong>{name}</strong>',
      'dash.recipientWishlist': 'Пожелания получателя',
      'dash.recipientWishlistEmpty': 'Пожеланий пока нет.',
      'dash.myWishlistTitle': 'Мои пожелания',
      'dash.myWishlistSub': 'Подскажите Санте, что вам приятно получить',
      'dash.myWishlistPh': 'Например: книга или тёплый плед',
      'dash.myWishlistAdd': 'Добавить',
      'dash.myWishlistEmpty': 'Добавьте пожелания, чтобы упростить выбор подарка.',
      'dash.wishDelete': 'Удалить',
      'dash.participantsTitle': 'Участники',
      'dash.participantsSub': 'Минимум 3 человека для жеребьёвки',
      'dash.participantsPh': 'Имя участника',
      'dash.participantsAdd': 'Добавить',
      'dash.participantRemove': 'Убрать',
      'dash.participantOrganizer': 'организатор',
      'dash.participantWishes': 'пожеланий: {n}',
      'dash.statusTitle': 'Статус игры',
      'dash.statusSub': 'Краткая сводка по текущей игре',
      'dash.statusPlayers': 'Участников',
      'dash.statusWishlists': 'С пожеланиями',
      'dash.statusDraw': 'Жеребьёвка',
      'dash.statusDrawNo': 'не проведена',
      'dash.statusDrawYes': 'проведена',
      'dash.giftStatus': 'Мой статус подарка',
      'dash.gift.none': 'Ещё не начал(а)',
      'dash.gift.idea': 'Выбираю идею',
      'dash.gift.bought': 'Подарок куплен',
      'dash.gift.done': 'Подарок готов',
      'dash.budget': 'Бюджет: {min}–{max} ₽',
      'dash.date': 'Дата: {date}',
      'dash.daysLeft': 'До обмена: {n} дн.',
      'dash.daysTomorrow': 'До обмена: завтра',
      'dash.daysToday': 'Сегодня день обмена',
      'dash.daysPast': 'Обмен прошёл ({n} дн. назад)',
      'confirm.title': 'Подтверждение',
      'confirm.ok': 'Подтвердить',
      'confirm.cancel': 'Отмена',
      'confirm.reset': 'Сбросить жеребьёвку? Участникам нужно будет открыть результат заново.',
      'confirm.leave': 'Выйти из этой игры на этом устройстве?',
      'footer.tagline': 'Простой и уютный способ организовать обмен подарками.',
      'footer.game': 'Игра',
      'footer.sections': 'Разделы',
      'footer.how': 'Как это работает',
      'footer.copy': '© Тайный Санта',
      'footer.made': 'Сделано с заботой о празднике',
      'toast.created': 'Игра создана',
      'toast.joined': 'Вы вошли в игру',
      'toast.participantAdded': 'Участник добавлен',
      'toast.participantExists': 'Такой участник уже есть',
      'toast.participantRemoved': 'Участник удалён: {name}',
      'toast.participantRemovedSimple': 'Участник удалён',
      'toast.wishAdded': 'Пожелание добавлено',
      'toast.drawDone': 'Жеребьёвка проведена',
      'toast.drawNeed3': 'Нужно минимум 3 участника',
      'toast.drawFail': 'Не удалось провести жеребьёвку, попробуйте ещё раз',
      'toast.drawReset': 'Жеребьёвка сброшена',
      'toast.copied': 'Код скопирован',
      'toast.statusSaved': 'Статус сохранён',
      'err.createRequired': 'Укажите название игры и ваше имя.',
      'err.createDate': 'Укажите дату обмена.',
      'err.createBudget': 'Проверьте бюджет.',
      'err.joinRequired': 'Введите код комнаты и имя.',
      'err.joinNotFound': 'Игра с таким кодом не найдена в этом браузере.',
    },
    en: {
      'meta.title': 'Secret Santa — gift exchange organizer',
      'meta.desc': 'A simple and cozy way to organize Secret Santa: create a game, invite participants with a code, and run a fair draw.',
      'skip': 'Skip to content',
      'nav.aria': 'Main navigation',
      'brand.aria': 'Secret Santa - home',
      'wish.label': 'New wish',
      'participant.label': 'Participant name',
      'brand.name': '<span class="brand__word">Secret</span> <span class="brand__word brand__word--accent">Santa</span>',
      'nav.home': 'Home',
      'nav.create': 'Create game',
      'nav.join': 'Join by code',
      'nav.dashboard': 'My game',
      'nav.lang': 'RU',
      'nav.langAria': 'Переключить на русский',
      'hero.eyebrow': 'Holiday gift exchange',
      'hero.title': '<span class="brand__word">Secret</span> <span class="brand__word brand__word--accent">Santa</span>',
      'hero.lead': 'Organize a gift exchange easily and warmly: create a game, invite participants with a code, and run a fair draw. Everyone learns only their recipient.',
      'hero.ctaCreate': 'Create game',
      'hero.ctaJoin': 'Join by code',
      'hero.note': 'Free · No sign-up · Data stays in your browser',
      'steps.kicker': 'How it works',
      'steps.title': 'Three simple steps to the holiday',
      'steps.sub': 'Create a game, gather participants, and run the draw — clear and simple.',
      'steps.1.num': 'Step 1',
      'steps.1.title': 'Create a game',
      'steps.1.text': 'Set the name, exchange date, and budget. A room with an invite code is ready right away.',
      'steps.2.num': 'Step 2',
      'steps.2.title': 'Gather participants',
      'steps.2.text': 'Share the room code. Participants join, add themselves, and can leave gift wishes.',
      'steps.3.num': 'Step 3',
      'steps.3.title': 'Run the draw',
      'steps.3.text': 'When everyone is ready, run the draw. Each participant sees only their own recipient.',
      'faq.kicker': 'Questions & answers',
      'faq.title': 'Frequently asked questions',
      'faq.1.q': 'What is "Secret Santa"?',
      'faq.1.a': 'It’s a game where everyone secretly prepares a gift for another person. Pairs are assigned by a random draw, and everyone learns their result privately.',
      'faq.2.q': 'Do I need to register?',
      'faq.2.a': 'No. Just create a game or join by code. In this version, data is stored locally in your browser.',
      'faq.3.q': 'Who sees the draw result?',
      'faq.3.a': 'Only you see the name of the person you are gifting to. Other pairs remain secret.',
      'faq.4.q': 'How many participants are needed?',
      'faq.4.a': 'At least three people, so the draw works correctly and no one gets themselves.',
      'cta.kicker': 'Ready to start?',
      'cta.title': 'Organize Secret Santa online',
      'cta.sub': 'Create a game in a minute and invite participants with a code.',
      'create.kicker': 'New game',
      'create.title': 'Create a game',
      'create.sub': 'Fill in the basics — the room will be ready right after creation.',
      'create.gameName': 'Game name',
      'create.gameNamePh': 'For example: Office New Year',
      'create.organizerName': 'Your name',
      'create.organizerNamePh': 'What is your name',
      'create.eventDate': 'Exchange date',
      'create.budget': 'Gift budget',
      'create.budgetMin': 'From, ₽',
      'create.budgetMax': 'To, ₽',
      'create.theme': 'Theme or wishes',
      'create.optional': '(optional)',
      'create.themePh': 'For example: cozy and useful gifts',
      'create.submit': 'Create game',
      'create.cancel': 'Cancel',
      'join.kicker': 'Join',
      'join.title': 'Join a game',
      'join.sub': 'Enter the room code and your name to join the gift exchange.',
      'join.code': 'Room code',
      'join.codePh': 'SANTA-XXXX',
      'join.codeHint': 'You can get the code from the game organizer.',
      'join.name': 'Your name',
      'join.namePh': 'For example: Anna',
      'join.submit': 'Join game',
      'join.cancel': 'Cancel',
      'dash.emptyKicker': 'My game',
      'dash.emptyTitle': 'Your game will appear here',
      'dash.emptySub': 'Create a new game or join by code to start the gift exchange.',
      'dash.emptyCreate': 'Create game',
      'dash.emptyJoin': 'Join by code',
      'dash.roomCode': 'Room code',
      'dash.copy': 'Copy',
      'dash.copyAria': 'Copy room code',
      'dash.draw': 'Run draw',
      'dash.drawDone': 'Draw completed',
      'dash.reveal': 'Show who I’m gifting to',
      'dash.reset': 'Reset draw',
      'dash.leave': 'Leave game',
      'dash.recipientTitle': 'Your recipient',
      'dash.recipientSub': 'The name will appear here after the draw',
      'dash.recipientNone': 'The draw has not been run yet.',
      'dash.recipientReady': 'The draw is done. Click “Show who I’m gifting to”.',
      'dash.recipientYou': 'You are gifting to: <strong>{name}</strong>',
      'dash.recipientWishlist': 'Recipient wishes',
      'dash.recipientWishlistEmpty': 'No wishes yet.',
      'dash.myWishlistTitle': 'My wishes',
      'dash.myWishlistSub': 'Help Santa pick something you’ll enjoy',
      'dash.myWishlistPh': 'For example: a book or a warm blanket',
      'dash.myWishlistAdd': 'Add',
      'dash.myWishlistEmpty': 'Add wishes to make gift choosing easier.',
      'dash.wishDelete': 'Delete',
      'dash.participantsTitle': 'Participants',
      'dash.participantsSub': 'At least 3 people are needed for the draw',
      'dash.participantsPh': 'Participant name',
      'dash.participantsAdd': 'Add',
      'dash.participantRemove': 'Remove',
      'dash.participantOrganizer': 'organizer',
      'dash.participantWishes': 'wishes: {n}',
      'dash.statusTitle': 'Game status',
      'dash.statusSub': 'Quick summary of the current game',
      'dash.statusPlayers': 'Participants',
      'dash.statusWishlists': 'With wishes',
      'dash.statusDraw': 'Draw',
      'dash.statusDrawNo': 'not run',
      'dash.statusDrawYes': 'completed',
      'dash.giftStatus': 'My gift status',
      'dash.gift.none': 'Not started yet',
      'dash.gift.idea': 'Choosing an idea',
      'dash.gift.bought': 'Gift bought',
      'dash.gift.done': 'Gift ready',
      'dash.budget': 'Budget: {min}–{max} ₽',
      'dash.date': 'Date: {date}',
      'dash.daysLeft': 'Days until exchange: {n}',
      'dash.daysTomorrow': 'Exchange is tomorrow',
      'dash.daysToday': 'Exchange is today',
      'dash.daysPast': 'Exchange was {n} days ago',
      'confirm.title': 'Confirmation',
      'confirm.ok': 'Confirm',
      'confirm.cancel': 'Cancel',
      'confirm.reset': 'Reset the draw? Participants will need to reveal the result again.',
      'confirm.leave': 'Leave this game on this device?',
      'footer.tagline': 'A simple and cozy way to organize a gift exchange.',
      'footer.game': 'Game',
      'footer.sections': 'Sections',
      'footer.how': 'How it works',
      'footer.copy': '© Secret Santa',
      'footer.made': 'Made with holiday care',
      'toast.created': 'Game created',
      'toast.joined': 'You joined the game',
      'toast.participantAdded': 'Participant added',
      'toast.participantExists': 'This participant already exists',
      'toast.participantRemoved': 'Participant removed: {name}',
      'toast.participantRemovedSimple': 'Participant removed',
      'toast.wishAdded': 'Wish added',
      'toast.drawDone': 'Draw completed',
      'toast.drawNeed3': 'At least 3 participants are needed',
      'toast.drawFail': 'Could not run the draw, please try again',
      'toast.drawReset': 'Draw reset',
      'toast.copied': 'Code copied',
      'toast.statusSaved': 'Status saved',
      'err.createRequired': 'Enter the game name and your name.',
      'err.createDate': 'Select the exchange date.',
      'err.createBudget': 'Check the budget.',
      'err.joinRequired': 'Enter the room code and your name.',
      'err.joinNotFound': 'No game with this code was found in this browser.',
    }
  };

  let lang = localStorage.getItem(LANG_KEY) || 'ru';
  function t(key, vars = {}) {
    const dict = I18N[lang] || I18N.ru;
    let str = dict[key] ?? I18N.ru[key] ?? key;
    Object.keys(vars).forEach(k => { str = str.replaceAll(`{${k}}`, vars[k]); });
    return str;
  }
  function locale() { return lang === 'en' ? 'en-US' : 'ru-RU'; }

  function applyLang(nextLang) {
    if (nextLang) lang = nextLang;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === 'en' ? 'en' : 'ru';
    document.title = t('meta.title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t('meta.desc'));
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-placeholder]').forEach(el => { el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)); });
    $$('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
    const langBtn = $('#langToggle');
    if (langBtn) { langBtn.textContent = t('nav.lang'); langBtn.setAttribute('aria-label', t('nav.langAria')); }
    renderDashboard();
  }

  function uid(prefix = 'id') { return prefix + '_' + Math.random().toString(36).slice(2, 10); }
  function makeCode() { const part = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(2, 6) || 'AB12'; return 'SANTA-' + part; }
  function escapeHtml(str = '') { return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      s.games = s.games || {};
      s.session = s.session || null;
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
    } catch { return { games: {}, session: null }; }
  }
  const state = loadState();
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function ensureGame(game) {
    if (!game) return;
    game.participants = game.participants || [];
    game.assignments = game.assignments || {};
    game.revealed = game.revealed || {};
    game.participants.forEach(p => { p.wishlist = p.wishlist || []; if (!p.giftStatus) p.giftStatus = 'none'; });
  }
  Object.values(state.games).forEach(ensureGame);

  function currentGame() { const code = state.session && state.session.gameCode; return code ? state.games[code] : null; }
  function currentMe(game) { if (!game || !state.session) return null; return game.participants.find(p => p.id === state.session.participantId) || null; }

  function toast(msg) {
    const layer = $('#toastLayer'); if (!layer) return;
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    layer.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, 2400);
  }
  function setNotice(msg) { const n = $('#dashNotice'); if (!n) return; if (msg) { n.textContent = msg; n.classList.remove('hidden'); } else { n.textContent = ''; n.classList.add('hidden'); } }

  function navigate(view) {
    if (!views.includes(view)) view = 'home';
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    $$('[data-nav]').forEach(el => {
      const nav = el.dataset.nav || (el.getAttribute('href') || '').replace('#', '');
      const isCurrent = nav === view && el.closest('.nav');
      if (el.closest('.nav')) {
        el.classList.toggle('is-active', isCurrent);
        if (isCurrent) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      }
    });
    const hash = location.hash.replace('#', '').split('?')[0];
    if (hash !== view) location.hash = view;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (view === 'dashboard') renderDashboard();
  }

  function derangement(participants) {
    const ids = participants.map(p => p.id);
    if (ids.length < 3) return null;
    for (let attempt = 0; attempt < 1000; attempt++) {
      const recv = ids.slice();
      for (let i = recv.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [recv[i], recv[j]] = [recv[j], recv[i]]; }
      if (ids.every((id, i) => id !== recv[i])) {
        const map = {}; ids.forEach((id, i) => map[id] = recv[i]); return map;
      }
    }
    return null;
  }

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

  let confirmCb = null;
  let lastFocusBeforeModal = null;
  function openConfirm(text, cb) {
    $('#confirmText').textContent = text;
    confirmCb = cb;
    lastFocusBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modal = $('#confirmModal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    const ok = $('#confirmOkBtn');
    if (ok) ok.focus();
  }
  function closeConfirm() {
    confirmCb = null;
    const modal = $('#confirmModal');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (lastFocusBeforeModal) {
      lastFocusBeforeModal.focus();
      lastFocusBeforeModal = null;
    }
  }

  function renderDashboard() {
    const game = currentGame(); const me = currentMe(game);
    if (!game || !me) { $('#noGame').classList.remove('hidden'); $('#gameArea').classList.add('hidden'); setNotice(''); return; }
    ensureGame(game);
    $('#noGame').classList.add('hidden'); $('#gameArea').classList.remove('hidden');

    $('#gameCodeLabel').textContent = game.code;
    $('#gameTitleLabel').textContent = game.name;
    const parts = [t('dash.budget', { min: game.budgetMin, max: game.budgetMax })];
    if (game.eventDate) parts.push(t('dash.date', { date: formatDate(game.eventDate) }));
    if (game.theme) parts.push(game.theme);
    $('#gameMetaLabel').textContent = parts.join(' · ');

    const d = daysUntil(game.eventDate);
    if (d === null) $('#countdownLabel').textContent = '';
    else if (d > 1) $('#countdownLabel').textContent = t('dash.daysLeft', { n: d });
    else if (d === 1) $('#countdownLabel').textContent = t('dash.daysTomorrow');
    else if (d === 0) $('#countdownLabel').textContent = t('dash.daysToday');
    else $('#countdownLabel').textContent = t('dash.daysPast', { n: Math.abs(d) });

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
    $('#participantsCount').textContent = String(game.participants.length);

    // participants
    $('#participantsList').innerHTML = game.participants.map(p => {
      const tags = [];
      if (p.wishlist.length) tags.push(t('dash.participantWishes', { n: p.wishlist.length }));
      if (p.isOrganizer) tags.push(t('dash.participantOrganizer'));
      const canRemove = !drawn && p.id !== me.id;
      const rm = canRemove ? `<button class="link-btn" data-rm="${p.id}" type="button">${escapeHtml(t('dash.participantRemove'))}</button>` : '';
      return `<li><span><strong>${escapeHtml(p.name)}</strong>${tags.length ? ` <span class="muted small">· ${escapeHtml(tags.join(', '))}</span>` : ''}</span><span>${rm}</span></li>`;
    }).join('');
    $$('[data-rm]').forEach(btn => btn.onclick = () => {
      const id = btn.dataset.rm; const p = game.participants.find(x => x.id === id);
      game.participants = game.participants.filter(x => x.id !== id);
      saveState(); renderDashboard(); toast(p ? t('toast.participantRemoved', { name: p.name }) : t('toast.participantRemovedSimple'));
    });

    // assignment
    if (drawn && game.assignments[me.id] && revealed) {
      const recv = game.participants.find(p => p.id === game.assignments[me.id]);
      $('#myAssignment').classList.remove('muted');
      $('#myAssignment').innerHTML = t('dash.recipientYou', { name: escapeHtml(recv ? recv.name : '—') });
      $('#recipientWishlist').classList.remove('hidden');
      $('#recipientWishlistList').innerHTML = (recv && recv.wishlist.length)
        ? recv.wishlist.map(w => `<li><span>${escapeHtml(w.text)}</span></li>`).join('')
        : `<li><span class="muted">${escapeHtml(t('dash.recipientWishlistEmpty'))}</span></li>`;
    } else if (drawn && game.assignments[me.id] && !revealed) {
      $('#myAssignment').classList.remove('muted');
      $('#myAssignment').textContent = t('dash.recipientReady');
      $('#recipientWishlist').classList.add('hidden');
    } else {
      $('#myAssignment').classList.add('muted');
      $('#myAssignment').textContent = t('dash.recipientNone');
      $('#recipientWishlist').classList.add('hidden');
    }

    // my wishlist
    $('#myWishlist').innerHTML = me.wishlist.length
      ? me.wishlist.map(w => `<li><span>${escapeHtml(w.text)}</span><button class="link-btn" data-rm-wish="${w.id}" type="button">${escapeHtml(t('dash.wishDelete'))}</button></li>`).join('')
      : `<li><span class="muted">${escapeHtml(t('dash.myWishlistEmpty'))}</span></li>`;
    $$('[data-rm-wish]').forEach(btn => btn.onclick = () => {
      me.wishlist = me.wishlist.filter(w => w.id !== btn.dataset.rmWish); saveState(); renderDashboard();
    });

    $('#myGiftStatus').value = me.giftStatus || 'none';
    setNotice('');
  }

  function wire() {
    $$('[data-nav]').forEach(el => el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.nav || el.getAttribute('href').replace('#', ''));
    }));
    window.addEventListener('hashchange', () => {
      const raw = location.hash.replace('#', ''); const v = raw.split('?')[0];
      if (views.includes(v)) navigate(v);
    });

    $('#createForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const err = $('#createError'); err.textContent = '';
      const name = $('#gameName').value.trim();
      const orgName = $('#organizerName').value.trim();
      const budgetMin = Number($('#budgetMin').value);
      const budgetMax = Number($('#budgetMax').value);
      const eventDate = $('#eventDate').value;
      const theme = $('#theme').value.trim();
      if (!name || !orgName) { err.textContent = t('err.createRequired'); return; }
      if (!eventDate) { err.textContent = t('err.createDate'); return; }
      if (isNaN(budgetMin) || isNaN(budgetMax) || budgetMax < budgetMin) { err.textContent = t('err.createBudget'); return; }
      let code = makeCode(); while (state.games[code]) code = makeCode();
      const organizer = { id: uid('p'), name: orgName, isOrganizer: true, wishlist: [], giftStatus: 'none' };
      const game = { code, name, budgetMin, budgetMax, eventDate, theme, participants: [organizer], assignments: {}, revealed: {}, createdAt: Date.now() };
      state.games[code] = game;
      state.session = { gameCode: code, participantId: organizer.id };
      saveState();
      e.target.reset();
      $('#budgetMin').value = 500; $('#budgetMax').value = 1500;
      toast(t('toast.created'));
      navigate('dashboard');
    });

    $('#joinForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const err = $('#joinError'); err.textContent = '';
      const code = $('#joinCode').value.trim().toUpperCase();
      const name = $('#joinName').value.trim();
      if (!code || !name) { err.textContent = t('err.joinRequired'); return; }
      const game = state.games[code];
      if (!game) { err.textContent = t('err.joinNotFound'); return; }
      ensureGame(game);
      let p = game.participants.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!p) { p = { id: uid('p'), name, isOrganizer: false, wishlist: [], giftStatus: 'none' }; game.participants.push(p); }
      state.session = { gameCode: code, participantId: p.id };
      saveState();
      e.target.reset();
      toast(t('toast.joined'));
      navigate('dashboard');
    });

    $('#addParticipantForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const game = currentGame(); if (!game) return; ensureGame(game);
      const input = $('#addName'); const name = input.value.trim(); if (!name) return;
      if (game.participants.some(p => p.name.toLowerCase() === name.toLowerCase())) { toast(t('toast.participantExists')); return; }
      game.participants.push({ id: uid('p'), name, isOrganizer: false, wishlist: [], giftStatus: 'none' });
      saveState(); input.value = ''; renderDashboard(); toast(t('toast.participantAdded'));
    });

    $('#wishlistForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
      const input = $('#wishText'); const text = input.value.trim(); if (!text) return;
      me.wishlist.push({ id: uid('w'), text });
      saveState(); input.value = ''; renderDashboard(); toast(t('toast.wishAdded'));
    });

    $('#drawBtn').addEventListener('click', () => {
      const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
      ensureGame(game);
      if (game.participants.length < 3) { toast(t('toast.drawNeed3')); return; }
      const map = derangement(game.participants);
      if (!map) { toast(t('toast.drawFail')); return; }
      game.assignments = map; game.revealed = {};
      saveState(); renderDashboard(); toast(t('toast.drawDone'));
    });

    $('#revealBtn').addEventListener('click', () => {
      const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
      if (!game.assignments || !game.assignments[me.id]) return;
      game.revealed = game.revealed || {}; game.revealed[me.id] = true;
      saveState(); renderDashboard();
    });

    $('#resetDrawBtn').addEventListener('click', () => {
      const game = currentGame(); if (!game) return;
      openConfirm(t('confirm.reset'), () => {
        game.assignments = {}; game.revealed = {}; saveState(); renderDashboard(); toast(t('toast.drawReset'));
      });
    });

    $('#leaveBtn').addEventListener('click', () => {
      openConfirm(t('confirm.leave'), () => {
        state.session = null; saveState(); renderDashboard(); navigate('home');
      });
    });

    $('#copyCodeBtn').addEventListener('click', async () => {
      const game = currentGame(); if (!game) return;
      try { await navigator.clipboard.writeText(game.code); toast(t('toast.copied')); } catch { toast(game.code); }
    });

    $('#myGiftStatus').addEventListener('change', (e) => {
      const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
      me.giftStatus = e.target.value; saveState(); toast(t('toast.statusSaved'));
    });

    $('#confirmOkBtn').addEventListener('click', () => { const cb = confirmCb; closeConfirm(); if (cb) cb(); });
    $$('[data-close-confirm]').forEach(el => el.addEventListener('click', closeConfirm));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#confirmModal').classList.contains('hidden')) {
        e.preventDefault();
        closeConfirm();
      }
    });
  }

  // init
  wire();
  const langBtn = $('#langToggle');
  if (langBtn) langBtn.addEventListener('click', () => applyLang(lang === 'ru' ? 'en' : 'ru'));

  // handle join link with code
  const rawHash = location.hash.replace('#', '');
  if (rawHash.startsWith('join')) {
    const q = rawHash.split('?')[1] || '';
    const code = new URLSearchParams(q).get('code');
    if (code) $('#joinCode').value = code.toUpperCase();
  }

  applyLang(lang);
  const start = rawHash.split('?')[0];
  navigate(views.includes(start) ? start : 'home');
  if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {})); }
})();
