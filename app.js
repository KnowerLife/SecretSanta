(() => {
  const STORAGE_KEY = 'secret-santa-simple-v1';
  const LANG_KEY = 'secret-santa-lang';
  const API_BASE_KEY = 'secret-santa-api-base';
  const views = ['home', 'create', 'join', 'quick', 'dashboard'];
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const DEFAULT_API_BASE = window.SECRET_SANTA_API_BASE || localStorage.getItem(API_BASE_KEY) || 'http://127.0.0.1:8000';
  const apiState = {
    base: DEFAULT_API_BASE.replace(/\/$/, ''),
    online: null, // null unknown, true/false
    checking: false,
  };

  function apiHeaders(token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async function apiFetch(path, { method = 'GET', body, token } = {}) {
    const res = await fetch(apiState.base + path, {
      method,
      headers: apiHeaders(token),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error(data.error || data.detail || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function detectBackend() {
    if (apiState.checking) return apiState.online;
    apiState.checking = true;
    try {
      const ctrl = new AbortController();
      const tmr = setTimeout(() => ctrl.abort(), 1800);
      const res = await fetch(apiState.base + '/api/health', { signal: ctrl.signal });
      clearTimeout(tmr);
      apiState.online = res.ok;
    } catch {
      apiState.online = false;
    } finally {
      apiState.checking = false;
    }
    return apiState.online;
  }

  function roomSession(code) {
    state.backend = state.backend || { rooms: {} };
    state.backend.rooms = state.backend.rooms || {};
    return state.backend.rooms[(code || '').toUpperCase()] || null;
  }
  function setRoomSession(code, sess) {
    state.backend = state.backend || { rooms: {} };
    state.backend.rooms = state.backend.rooms || {};
    state.backend.rooms[(code || '').toUpperCase()] = { ...(state.backend.rooms[(code || '').toUpperCase()] || {}), ...sess };
  }

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
      'nav.quick': 'Быстрая жеребьёвка',
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
      'quick.kicker': 'Быстрый инструмент',
      'quick.title': 'Быстрая жеребьёвка',
      'quick.sub': 'Введите имена участников — каждый получит случайного получателя. Без регистрации и без комнаты.',
      'quick.namesLabel': 'Имена участников',
      'quick.namesPh': 'Каждое имя с новой строки\nНапример:\nАнна\nБорис\nВика',
      'quick.namesHint': 'Минимум 3 участника. Пустые строки игнорируются.',
      'quick.draw': 'Провести жеребьёвку',
      'quick.reset': 'Очистить',
      'quick.resultTitle': 'Результат',
      'quick.resultEmpty': 'Здесь появятся пары после жеребьёвки.',
      'quick.copy': 'Скопировать результат',
      'quick.copied': 'Результат скопирован',
      'quick.errMin': 'Нужно минимум 3 участника',
      'quick.errDup': 'Имена должны быть уникальными',
      'quick.errFail': 'Не удалось провести жеребьёвку',
      'quick.pair': '{santa} → {recipient}',
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
      'dash.statusGifts': 'Подарки готовы',
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
      'toast.backendOnline': 'Подключено к серверу',
      'toast.backendOffline': 'Сервер недоступен, используем локальный режим',
      'toast.copiedLink': 'Ссылка скопирована',
      'err.createRequired': 'Укажите название игры и ваше имя.',
      'err.createDate': 'Укажите дату обмена.',
      'err.createBudget': 'Проверьте бюджет.',
      'err.joinRequired': 'Введите код комнаты и имя.',
      'err.joinNotFound': 'Игра с таким кодом не найдена в этом браузере.',
      'err.joinNotFoundOnline': 'Игра с таким кодом не найдена на сервере.',
      'err.network': 'Ошибка сети. Проверьте подключение к серверу.',
      'dash.backendOnline': 'Онлайн',
      'dash.backendOffline': 'Локально',
      'dash.copyLink': 'Скопировать ссылку',
      'dash.accessTitle': 'Доступ и сессии',
      'dash.accessSub': 'Приглашение, ссылка и активные сессии',
      'dash.copyInvite': 'Скопировать invite-ссылку',
      'dash.refreshSessions': 'Обновить сессии',
      'dash.noSessions': 'Нет активных сессий или сервер недоступен.',
      'dash.sessionCurrent': 'текущая',
      'dash.sessionRevoked': 'отозвана',
      'dash.revokeSession': 'Отозвать',
      'dash.sessionRevokedOk': 'Сессия отозвана',
      'dash.exclusionsTitle': 'Исключения',
      'dash.exclusionsSub': 'Кто не должен дарить кому',
      'dash.exclusionsAdd': 'Добавить исключение',
      'dash.exclusionsNone': 'Исключений нет.',
      'dash.exclusionsA': 'Участник А',
      'dash.exclusionsB': 'Участник Б',
      'dash.exclusionsRemove': 'Удалить',
      'dash.exclusionsSame': 'Выберите двух разных участников',
      'dash.exclusionsExists': 'Такое исключение уже есть',
      'dash.exclusionsAdded': 'Исключение добавлено',
      'dash.chatTitle': 'Анонимный чат',
      'dash.chatSub': 'Общайтесь тайно с получателем или своим Сантой',
      'dash.chatToRecipient': 'Моему получателю',
      'dash.chatToSanta': 'Моему Санте',
      'dash.chatPlaceholder': 'Напишите анонимное сообщение...',
      'dash.chatSend': 'Отправить',
      'dash.chatEmpty': 'Пока нет сообщений.',
      'dash.chatNoDraw': 'Чат станет доступен после жеребьёвки.',
      'dash.chatYou': 'Вы',
      'dash.chatThem': 'Собеседник',
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
      'nav.quick': 'Quick draw',
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
      'quick.kicker': 'Quick tool',
      'quick.title': 'Quick draw',
      'quick.sub': 'Enter participant names — everyone gets a random recipient. No sign-up, no room.',
      'quick.namesLabel': 'Participant names',
      'quick.namesPh': 'One name per line\nFor example:\nAnna\nBoris\nVika',
      'quick.namesHint': 'At least 3 participants. Empty lines are ignored.',
      'quick.draw': 'Run draw',
      'quick.reset': 'Clear',
      'quick.resultTitle': 'Result',
      'quick.resultEmpty': 'Pairs will appear here after the draw.',
      'quick.copy': 'Copy result',
      'quick.copied': 'Result copied',
      'quick.errMin': 'At least 3 participants are needed',
      'quick.errDup': 'Names must be unique',
      'quick.errFail': 'Could not run the draw',
      'quick.pair': '{santa} → {recipient}',
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
      'dash.statusGifts': 'Gifts ready',
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
      'toast.backendOnline': 'Connected to server',
      'toast.backendOffline': 'Server unavailable, using local mode',
      'toast.copiedLink': 'Link copied',
      'err.createRequired': 'Enter the game name and your name.',
      'err.createDate': 'Select the exchange date.',
      'err.createBudget': 'Check the budget.',
      'err.joinRequired': 'Enter the room code and your name.',
      'err.joinNotFound': 'No game with this code was found in this browser.',
      'err.joinNotFoundOnline': 'No game with this code was found on the server.',
      'err.network': 'Network error. Check server connection.',
      'dash.backendOnline': 'Online',
      'dash.backendOffline': 'Local',
      'dash.copyLink': 'Copy link',
      'dash.accessTitle': 'Access & sessions',
      'dash.accessSub': 'Invite link and active sessions',
      'dash.copyInvite': 'Copy invite link',
      'dash.refreshSessions': 'Refresh sessions',
      'dash.noSessions': 'No active sessions or server unavailable.',
      'dash.sessionCurrent': 'current',
      'dash.sessionRevoked': 'revoked',
      'dash.revokeSession': 'Revoke',
      'dash.sessionRevokedOk': 'Session revoked',
      'dash.exclusionsTitle': 'Exclusions',
      'dash.exclusionsSub': 'Who should not gift to whom',
      'dash.exclusionsAdd': 'Add exclusion',
      'dash.exclusionsNone': 'No exclusions.',
      'dash.exclusionsA': 'Participant A',
      'dash.exclusionsB': 'Participant B',
      'dash.exclusionsRemove': 'Remove',
      'dash.exclusionsSame': 'Select two different participants',
      'dash.exclusionsExists': 'This exclusion already exists',
      'dash.exclusionsAdded': 'Exclusion added',
      'dash.chatTitle': 'Anonymous chat',
      'dash.chatSub': 'Chat secretly with your recipient or your Santa',
      'dash.chatToRecipient': 'To my recipient',
      'dash.chatToSanta': 'To my Santa',
      'dash.chatPlaceholder': 'Write an anonymous message...',
      'dash.chatSend': 'Send',
      'dash.chatEmpty': 'No messages yet.',
      'dash.chatNoDraw': 'Chat becomes available after the draw.',
      'dash.chatYou': 'You',
      'dash.chatThem': 'Peer',
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
    renderQuickResult();
  }

  function uid(prefix = 'id') { return prefix + '_' + Math.random().toString(36).slice(2, 10); }
  function makeCode() { const part = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(2, 6) || 'AB12'; return 'SANTA-' + part; }
  function escapeHtml(str = '') { return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

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

  function ensureGame(game) {
    if (!game) return;
    game.participants = game.participants || [];
    game.assignments = game.assignments || {};
    game.revealed = game.revealed || {};
    game.exclusions = game.exclusions || [];
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
    if (view !== 'dashboard') disconnectSSE();
    if (view === 'dashboard') { renderDashboard(); refreshDashboard(); }
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
  let quickPairs = [];
  let chatChannel = 'to_recipient';
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

    const bs = $('#backendStatusLabel');
    if (bs) {
      const sess = roomSession(game.code);
      if (sess && sess.token) {
        bs.textContent = apiState.online ? `● ${t('dash.backendOnline')}` : (apiState.online === false ? `● ${t('dash.backendOffline')}` : '');
        bs.style.color = apiState.online ? '#1f8a4c' : (apiState.online === false ? '#8a6a1f' : '');
      } else {
        bs.textContent = `● ${t('dash.backendOffline')}`;
        bs.style.color = '#8a6a1f';
      }
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
    const sg = $('#statGifts');
    if (sg) sg.textContent = game.participants.length ? Math.round((giftsDone / game.participants.length) * 100) + '%' : '0%';
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
        const canRm = !drawn;
        const rm = canRm ? `<button class="link-btn" data-rm-ex="${escapeHtml(e.a)}|${escapeHtml(e.b)}" type="button">${escapeHtml(t('dash.exclusionsRemove'))}</button>` : '';
        return `<li><span>${escapeHtml(a)} ↔ ${escapeHtml(b)}</span><span>${rm}</span></li>`;
      }).join('') : `<li><span class="muted small">${escapeHtml(t('dash.exclusionsNone'))}</span></li>`;
      $$('[data-rm-ex]').forEach(btn => btn.onclick = () => {
        const [a,b] = String(btn.dataset.rmEx || '').split('|');
        game.exclusions = (game.exclusions || []).filter(e => !((e.a===a&&e.b===b)||(e.a===b&&e.b===a)));
        saveState(); renderDashboard();
      });
    }
    if (exA && exB) {
      const opts = `<option value="">—</option>` + game.participants.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
      const va = exA.value; const vb = exB.value;
      exA.innerHTML = opts; exB.innerHTML = opts;
      if (va) exA.value = va; if (vb) exB.value = vb;
    }
    if (exForm) exForm.classList.toggle('hidden', drawn);

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
    $$('[data-rm-wish]').forEach(btn => btn.onclick = async () => {
      const wid = btn.dataset.rmWish;
      const sess = roomSession(game.code);
      if (sess && sess.token && game.backend) {
        try { await apiFetch(`/api/rooms/${game.code}/wishlist/${wid}`, { method: 'DELETE', token: sess.token }); } catch (e) { console.warn(e); }
      }
      me.wishlist = me.wishlist.filter(w => w.id !== wid); saveState(); renderDashboard();
    });

    $('#myGiftStatus').value = me.giftStatus || 'none';
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
      };
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
      exclusions: Array.isArray(data.exclusions) ? data.exclusions : (prev.exclusions || []),
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
            // ensure recipient exists in participants list
            if (!game.participants.some(p => p.id === asn.assignment.recipientMemberId)) {
              game.participants.push({ id: asn.assignment.recipientMemberId, name: asn.assignment.recipientName || 'Recipient', isOrganizer: false, wishlist: [], giftStatus: 'none' });
            }
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
      ['room.draw_completed','room.wishlist_updated','room.gift_status_updated','room.draw_reset','room.member_joined','room.created','room.message'].forEach(t => sse.addEventListener(t, onEvt));
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
      list.innerHTML = `<li><span class="muted small">${escapeHtml(t('dash.noSessions'))}</span></li>`;
      if (notice) notice.textContent = '';
      return;
    }
    try {
      const data = await apiFetch(`/api/rooms/${game.code}/sessions`, { token: sess.token });
      const sessions = data.sessions || [];
      if (!sessions.length) {
        list.innerHTML = `<li><span class="muted small">${escapeHtml(t('dash.noSessions'))}</span></li>`;
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
      list.innerHTML = `<li><span class="muted small">${escapeHtml(t('dash.noSessions'))}</span></li>`;
      if (notice) notice.textContent = '';
    }
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
  }

  function renderQuickResult() {
    const list = $('#quickResultList');
    const meta = $('#quickResultMeta');
    const copyBtn = $('#quickCopyBtn');
    if (!list) return;
    if (!quickPairs.length) {
      list.innerHTML = `<li><span class="muted small">${escapeHtml(t('quick.resultEmpty'))}</span></li>`;
      if (meta) meta.textContent = '';
      if (copyBtn) copyBtn.disabled = true;
      return;
    }
    list.innerHTML = quickPairs.map(p => `<li><span><strong>${escapeHtml(p.santa)}</strong> → ${escapeHtml(p.recipient)}</span></li>`).join('');
    if (meta) meta.textContent = `${quickPairs.length}`;
    if (copyBtn) copyBtn.disabled = false;
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
              participants: [{ id: data.member.id, name: orgName, isOrganizer: true, wishlist: [], giftStatus: 'none' }],
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
        const organizer = { id: uid('p'), name: orgName, isOrganizer: true, wishlist: [], giftStatus: 'none' };
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
        if (!p) { p = { id: uid('p'), name, isOrganizer: false, wishlist: [], giftStatus: 'none' }; game.participants.push(p); }
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
        toast(lang === 'ru' ? 'В онлайн-режиме поделитесь кодом/ссылкой, чтобы участник присоединился сам.' : 'In online mode, share the code/link so the participant can join.');
        return;
      }
      const input = $('#addName'); const name = input.value.trim(); if (!name) return;
      if (game.participants.some(p => p.name.toLowerCase() === name.toLowerCase())) { toast(t('toast.participantExists')); return; }
      game.participants.push({ id: uid('p'), name, isOrganizer: false, wishlist: [], giftStatus: 'none' });
      saveState(); input.value = ''; renderDashboard(); toast(t('toast.participantAdded'));
    });

    const exclusionForm = $('#exclusionForm');
    if (exclusionForm) exclusionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
      const a = $('#exclusionA').value; const b = $('#exclusionB').value;
      if (!a || !b || a === b) { toast(t('dash.exclusionsSame')); return; }
      const [x, y] = [a, b].sort();
      if ((game.exclusions || []).some(e => (e.a===x&&e.b===y)||(e.a===y&&e.b===x))) { toast(t('dash.exclusionsExists')); return; }
      const sess = roomSession(game.code);
      if (sess && sess.token && game.backend) {
        try {
          await apiFetch(`/api/rooms/${game.code}/exclusions`, { method: 'POST', token: sess.token, body: { a: x, b: y } });
          await syncRoomFromBackend(game.code);
          renderDashboard(); toast(t('dash.exclusionsAdded'));
          return;
        } catch (err) { console.warn(err); toast(err.message || t('toast.drawFail')); return; }
      }
      game.exclusions = game.exclusions || [];
      game.exclusions.push({ id: uid('ex'), a: x, b: y });
      saveState(); renderDashboard(); toast(t('dash.exclusionsAdded'));
    });

    $('#wishlistForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const game = currentGame(); const me = currentMe(game); if (!game || !me) return;
      const input = $('#wishText'); const text = input.value.trim(); if (!text) return;
      const sess = roomSession(game.code);
      if (sess && sess.token && game.backend) {
        try {
          const data = await apiFetch(`/api/rooms/${game.code}/wishlist`, { method: 'POST', token: sess.token, body: { text } });
          me.wishlist.push({ id: data.item?.id || uid('w'), text });
          saveState(); input.value = ''; renderDashboard(); toast(t('toast.wishAdded'));
          refreshDashboard();
          return;
        } catch (err) { console.warn(err); toast(err.message || t('toast.drawFail')); return; }
      }
      me.wishlist.push({ id: uid('w'), text });
      saveState(); input.value = ''; renderDashboard(); toast(t('toast.wishAdded'));
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
      openConfirm(t('confirm.reset'), async () => {
        const sess = roomSession(game.code);
        if (sess && sess.token && game.backend) {
          try {
            await apiFetch(`/api/rooms/${game.code}/draw/reset`, { method: 'POST', token: sess.token, body: {} });
            await syncRoomFromBackend(game.code);
            renderDashboard(); toast(t('toast.drawReset'));
          } catch (e) { console.warn(e); toast(e.message || t('toast.drawFail')); }
          return;
        }
        game.assignments = {}; game.revealed = {}; saveState(); renderDashboard(); toast(t('toast.drawReset'));
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
      me.giftStatus = val; saveState(); toast(t('toast.statusSaved'));
      const sess = roomSession(game.code);
      if (sess && sess.token && game.backend) {
        try { await apiFetch(`/api/rooms/${game.code}/gift-status`, { method: 'POST', token: sess.token, body: { status: val } }); }
        catch (err) { console.warn(err); }
      }
    });

    $('#confirmOkBtn').addEventListener('click', () => { const cb = confirmCb; closeConfirm(); if (cb) cb(); });
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
      const err = $('#quickError'); if (err) err.textContent = '';
      const raw = ($('#quickNames')?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const names = raw.map(s => s.replace(/\s+/g, ' '));
      const seen = new Set();
      for (const n of names) { const k = n.toLowerCase(); if (seen.has(k)) { if (err) err.textContent = t('quick.errDup'); return; } seen.add(k); }
      if (names.length < 3) { if (err) err.textContent = t('quick.errMin'); return; }
      const participants = names.map((name, i) => ({ id: 'q' + i, name }));
      const map = derangement(participants, []);
      if (!map) { if (err) err.textContent = t('quick.errFail'); return; }
      quickPairs = participants.map(p => ({ santa: p.name, recipient: participants.find(r => r.id === map[p.id])?.name || '' }));
      renderQuickResult();
    });
    if (quickResetBtn) quickResetBtn.addEventListener('click', () => {
      quickPairs = [];
      const qn = $('#quickNames'); if (qn) qn.value = '';
      const err = $('#quickError'); if (err) err.textContent = '';
      renderQuickResult();
    });
    if (quickCopyBtn) quickCopyBtn.addEventListener('click', async () => {
      if (!quickPairs.length) return;
      const text = quickPairs.map(p => `${p.santa} → ${p.recipient}`).join('\n');
      try { await navigator.clipboard.writeText(text); toast(t('quick.copied')); } catch { toast(text); }
    });

  }

  // init
  wire();
  const langBtn = $('#langToggle');
  if (langBtn) langBtn.addEventListener('click', () => applyLang(lang === 'ru' ? 'en' : 'ru'));

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

  applyLang(lang);
  const start = rawHash.split('?')[0];
  navigate(views.includes(start) ? start : 'home');
  detectBackend().then(() => { if (currentGame()) refreshDashboard(); });
  if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {})); }
})();
