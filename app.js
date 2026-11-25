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
      'nav.offline': 'Нет соединения — игра доступна офлайн, сообщения отправятся позже',
      'nav.online': 'Соединение восстановлено',
      'nav.lang': 'EN',
      'nav.langAria': 'Switch to English',
      'hero.eyebrow': 'Новогодний обмен подарками',
      'hero.title': '<span class="brand__word">Тайный</span> <span class="brand__word brand__word--accent">Санта</span>',
      'hero.lead': 'Организуйте обмен подарками легко и приятно: создайте игру, пригласите участников по коду и проведите честную жеребьёвку. Каждый узнает только своего получателя.',
      'hero.ctaCreate': 'Создать игру',
      'hero.ctaJoin': 'Войти по коду',
      'hero.ctaDemo': 'Посмотреть демо',
      'hero.note': 'Бесплатно · Без регистрации · Данные сохраняются в вашем браузере',
      'hero.trust.1': '🔒 Приватная жеребьёвка',
      'hero.trust.2': '💬 Анонимный чат',
      'hero.trust.3': '📦 Адрес и анти-пожелания',
      'hero.trust.4': '⚡ Демо за 1 клик',
      'modes.kicker': 'Выберите формат',
      'modes.title': 'Как хотите начать?',
      'modes.sub': 'Полная игра с комнатой, быстрая жеребьёвка или демо для знакомства.',
      'modes.full.title': 'Полная игра',
      'modes.full.text': 'Комната, приглашения, вишлисты, исключения, анонимный чат и статусы подарков.',
      'modes.full.cta': 'Создать игру',
      'modes.quick.title': 'Быстрая жеребьёвка',
      'modes.quick.text': 'Просто введите имена и получите пары — без комнаты и регистрации.',
      'modes.quick.cta': 'Открыть жеребьёвку',
      'modes.demo.title': 'Посмотреть демо',
      'modes.demo.text': 'Загрузите пример игры, чтобы увидеть кабинет участника и организатора.',
      'modes.demo.cta': 'Открыть демо',
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
      'faq.5.q': 'Можно ли играть, если мы в разных городах?',
      'faq.5.a': 'Да. Участники могут заполнить адрес доставки в профиле, а Санта отправит подарок курьером или почтой.',
      'faq.6.q': 'Можно ли задать исключения?',
      'faq.6.a': 'Да. Организатор может указать пары, которые не должны дарить друг другу — например, супругов или коллег из одного отдела.',
      'faq.7.q': 'Что делать, если кто-то забыл подарок?',
      'faq.7.a': 'Организатор видит статусы подарков и может напомнить участникам. Анонимный чат помогает уточнить детали без раскрытия тайны.',
      'faq.8.q': 'Можно ли провести жеребьёвку заново?',
      'faq.8.a': 'Да. Организатор может сбросить жеребьёвку и запустить её снова, если состав или правила изменились.',
      'audience.kicker': 'Для любой компании',
      'audience.title': 'Играйте с теми, кто вам дорог',
      'audience.sub': 'Тайный Санта подходит для друзей, семьи, коллег и команд на удалёнке.',
      'audience.friends.title': 'С друзьями',
      'audience.friends.text': 'Добавьте интриги в встречу: каждый готовит сюрприз, а потом все угадывают своего Санту.',
      'audience.work.title': 'С коллегами',
      'audience.work.text': 'Идеально для офиса и удалёнки: единая ссылка, исключения, статусы подарков и анонимный чат.',
      'audience.family.title': 'С семьёй',
      'audience.family.text': 'Создайте тёплую традицию: от братьев и сестёр до бабушек и дедушек — каждый получит сюрприз.',
      'audience.remote.title': 'На расстоянии',
      'audience.remote.text': 'Участники в разных городах? Заполните адрес доставки в профиле и отправьте подарок курьером.',
      'ideas.kicker': 'Идеи для вдохновения',
      'ideas.title': 'Подарки, которые порадуют',
      'ideas.sub': 'Собирайте вишлисты проще — вот категории, которые часто выбирают.',
      'ideas.cozy.title': 'Уют и дом',
      'ideas.cozy.text': 'Кружки, пледы, свечи, чай и книги — тёплые подарки для домашнего вечера.',
      'ideas.hobby.title': 'Хобби и интересы',
      'ideas.hobby.text': 'Наборы для творчества, настолки, гаджеты и всё для любимого дела.',
      'ideas.care.title': 'Забота о себе',
      'ideas.care.text': 'Косметика, массажёры, ароматы — но сначала проверьте аллергии в профиле.',
      'ideas.sweet.title': 'Вкусное',
      'ideas.sweet.text': 'Конфеты, кофе, специи и домашние заготовки — сладкий финал праздника.',
      'rules.kicker': 'Правила жеребьёвки',
      'rules.title': 'Как мы обеспечиваем честность',
      'rules.1': 'Каждый участник дарит ровно одному человеку и получает подарок ровно от одного.',
      'rules.2': 'Никто не достаётся самому себе — жеребьёвка учитывает это автоматически.',
      'rules.3': 'Исключения и группы «сугроб» гарантируют, что нежелательные пары не встретятся.',
      'rules.4': 'Организатор не видит пары, а участники видят только своего получателя.',
      'features.kicker': 'Почему это удобно',
      'features.title': 'Всё для спокойной игры',
      'features.sub': 'Организатору — контроль, участникам — простота и интрига.',
      'features.wishlist.title': 'Вишлисты и анти-пожелания',
      'features.wishlist.text': 'Участники добавляют желания, адрес и что лучше не дарить — Санте проще выбрать.',
      'features.chat.title': 'Анонимный чат',
      'features.chat.text': 'Санта и получатель могут уточнить детали, не раскрывая имена.',
      'features.exclusions.title': 'Исключения и честная жеребьёвка',
      'features.exclusions.text': 'Учитывайте пары и ограничения — никто не получит самого себя.',
      'features.status.title': 'Статусы подарков',
      'features.status.text': 'Организатор видит прогресс: кто уже выбрал, купил или отправил подарок.',
      'privacy.kicker': 'Приватность',
      'privacy.title': 'Кто что видит',
      'privacy.sub': 'Тайна остаётся тайной: каждый видит ровно столько, сколько нужно.',
      'privacy.organizer.title': 'Организатор',
      'privacy.organizer.text': 'Видит участников, статусы и готовность к обмену — но не видит, кто кому дарит.',
      'privacy.santa.title': 'Санта',
      'privacy.santa.text': 'Видит только своего получателя, его пожелания и профиль после жеребьёвки.',
      'privacy.member.title': 'Участник',
      'privacy.member.text': 'Видит только то, что дарит ему Санта, и свой анонимный чат. Другие пары скрыты.',
      'testimonials.kicker': 'Опыт игроков',
      'testimonials.title': 'Игры, которые запоминаются',
      'testimonials.1.text': '«Запустили игру за 5 минут, все добавили пожелания, и никто не остался без подарка. Анонимный чат — огонь!»',
      'testimonials.1.name': 'Анна',
      'testimonials.1.role': 'играла с друзьями',
      'testimonials.2.text': '«Для удалённой команды это идеально: адреса в профиле, статусы подарков и понятная жеребьёвка.»',
      'testimonials.2.name': 'Игорь',
      'testimonials.2.role': 'HR в IT-компании',
      'testimonials.3.text': '«Семейная традиция получилась с первого раза. Даже бабушка разобралась по ссылке!»',
      'testimonials.3.name': 'Марина',
      'testimonials.3.role': 'семейная игра',
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
      'quick.csv': 'CSV',
      'quick.print': 'Печать',
      'quick.link': 'Ссылка',
      'quick.personalKicker': 'Ваша персональная ссылка',
      'quick.personalLabel': 'Вы дарите',
      'quick.personalNote': 'Эту ссылку можно отправить только этому участнику — другие пары в ней не видны.',
      'quick.personalCopy': 'Скопировать мою ссылку',
      'quick.personalHello': 'Привет, {name}!',
      'quick.linkCopied': 'Персональная ссылка скопирована',
      'quick.csvDone': 'CSV-файл скачан',
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
      'dash.demoBadge': 'ДЕМО',
      'dash.resetDemo': 'Пересоздать демо',
      'dash.recipientTitle': 'Ваш получатель',
      'dash.recipientSub': 'Здесь появится имя после жеребьёвки',
      'dash.recipientNone': 'Жеребьёвка ещё не проведена.',
      'dash.recipientReady': 'Жеребьёвка проведена. Нажмите «Показать, кому я дарю».',
      'dash.recipientYou': 'Вы дарите подарок: <strong>{name}</strong>',
      'dash.recipientWishlist': 'Пожелания получателя',
      'dash.recipientWishlistEmpty': 'Пожеланий пока нет.',
      'dash.recipientProfileTitle': 'Профиль получателя',
      'dash.recipientProfileEmpty': 'Получатель пока не заполнил профиль.',
      'dash.myWishlistTitle': 'Мои пожелания',
      'dash.myWishlistSub': 'Подскажите Санте, что вам приятно получить',
      'dash.myWishlistPh': 'Например: книга или тёплый плед',
      'dash.myWishlistAdd': 'Добавить',
      'dash.myWishlistEmpty': 'Добавьте пожелания, чтобы упростить выбор подарка.',
      'dash.wishDelete': 'Удалить',
      'dash.myProfileTitle': 'Мой профиль',
      'dash.myProfileSub': 'Помогите Санте: адрес для отправки и предпочтения',
      'dash.profileAddress': 'Адрес / доставка',
      'dash.profileAddressLabel': 'Адрес для доставки (если нужно)',
      'dash.profileAddressPh': 'Город, адрес или способ передачи',
      'dash.profileNote': 'О себе / интересы',
      'dash.profileNoteLabel': 'О себе / интересы',
      'dash.profileNotePh': 'Например: люблю книги, чай, настолки',
      'dash.profileAnti': 'Лучше не дарить',
      'dash.profileAntiLabel': 'Что лучше не дарить',
      'dash.profileAntiPh': 'Аллергии, непереносимые вещи и т.п.',
      'dash.profileSave': 'Сохранить профиль',
      'dash.profileSizeLabel': 'Размер / параметры',
      'dash.profileSizePh': 'Например: M, 42, 38 размер',
      'dash.profileLinksLabel': 'Ссылки на товары / вишлист',
      'dash.profileLinksPh': 'Ссылки на товары, которые понравятся',
      'dash.profileAllergiesLabel': 'Аллергии и табу',
      'dash.profileAllergiesPh': 'Например: аллергия на орехи',
      'dash.profilePrivacy': 'Эти данные видит только ваш Санта после жеребьёвки.',
      'dash.profileSaved': 'Профиль сохранён',
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
      'dash.progressLabel': 'Готовность к обмену',
      'dash.checklistTitle': 'Что осталось сделать',
      'dash.check1': 'Собрать минимум 3 участников',
      'dash.check2': 'Добавить пожелания в вишлист',
      'dash.check3': 'Заполнить профиль для Санты',
      'dash.check4': 'Провести жеребьёвку',
      'dash.check5': 'Отметить статус подарка',
      'dash.checkAllDone': 'Всё готово — осталось обменяться подарками!',
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
      'toast.queuedOffline': 'Нет связи — сообщение отправится при подключении',
      'toast.queueSent': 'Отложенные сообщения отправлены',
      'dash.chatPending': 'Ожидает отправки',
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
      'dash.inviteBtn': 'Пригласить',
      'dash.inviteTextLabel': 'Текст приглашения',
      'dash.inviteCopy': 'Скопировать текст',
      'dash.inviteGreeting': 'Привет! Приглашаю тебя в Тайный Санта «{name}».',
      'dash.inviteBudget': 'Бюджет подарка: {min}–{max}.',
      'dash.inviteDate': 'Дата обмена: {date}.',
      'dash.inviteJoin': 'Присоединяйся по ссылке: {url}',
      'dash.inviteCode': 'Код комнаты: {code}.',
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
      'dash.groupsTitle': 'Группы «сугроб»',
      'dash.groupsSub': 'Люди из одной группы не дарят друг другу — удобно для отделов и семей.',
      'dash.groupsNamePh': 'Название группы',
      'dash.groupsAdd': 'Создать группу',
      'dash.groupsNone': 'Групп пока нет.',
      'dash.groupsCount': '{n} чел.',
      'dash.groupsNeed': 'Выберите минимум двух участников и введите название',
      'dash.groupsCreated': 'Группа создана',
      'dash.groupsRemoved': 'Группа удалена',
      'dash.groupsHint': 'Отметьте участников одной группы:',
      'dash.groupsLocked': 'Группы можно менять только до жеребьёвки.',
      'dash.activityTitle': 'Журнал событий',
      'dash.activitySub': 'Что происходило в игре (только для организатора)',
      'dash.activityEmpty': 'Событий пока нет.',
      'dash.activityDemo': 'Демо-режим: события из локальной игры',
      'dash.evt.created': 'Игра «{name}» создана',
      'dash.evt.joined': '{name} присоединился к игре',
      'dash.evt.wishlist': '{name} обновил вишлист',
      'dash.evt.status': '{name} изменил статус подарка: {status}',
      'dash.evt.profile': '{name} обновил профиль',
      'dash.evt.exclusionAdded': 'Добавлено исключение',
      'dash.evt.exclusionRemoved': 'Удалено исключение',
      'dash.evt.groupAdded': 'Создана группа «{name}»',
      'dash.evt.groupRemoved': 'Удалена группа «{name}»',
      'dash.evt.drawDone': 'Жеребьёвка проведена: {n} участников',
      'dash.evt.drawReset': 'Жеребьёвка сброшена',
      'dash.evt.message': 'Отправлено анонимное сообщение',
      'dash.evt.unknown': 'Событие игры',
      'dash.chatTitle': 'Анонимный чат',
      'dash.chatSub': 'Общайтесь тайно с получателем или своим Сантой',
      'dash.chatToRecipient': 'Моему получателю',
      'dash.chatToSanta': 'Моему Санте',
      'dash.chatPlaceholder': 'Напишите анонимное сообщение...',
      'dash.tplSize': 'Какой у вас размер?',
      'dash.tplAddress': 'Куда удобнее доставить?',
      'dash.tplAllergy': 'Есть аллергии?',
      'dash.tplThanks': 'Спасибо за подарок!',
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
      'nav.offline': 'You are offline — the game still works, messages will be sent later',
      'nav.online': 'Back online',
      'nav.lang': 'RU',
      'nav.langAria': 'Переключить на русский',
      'hero.eyebrow': 'Holiday gift exchange',
      'hero.title': '<span class="brand__word">Secret</span> <span class="brand__word brand__word--accent">Santa</span>',
      'hero.lead': 'Organize a gift exchange easily and warmly: create a game, invite participants with a code, and run a fair draw. Everyone learns only their recipient.',
      'hero.ctaCreate': 'Create game',
      'hero.ctaJoin': 'Join by code',
      'hero.ctaDemo': 'View demo',
      'hero.note': 'Free · No sign-up · Data stays in your browser',
      'hero.trust.1': '🔒 Private draw',
      'hero.trust.2': '💬 Anonymous chat',
      'hero.trust.3': '📦 Address & anti-wishes',
      'hero.trust.4': '⚡ 1-click demo',
      'modes.kicker': 'Choose a format',
      'modes.title': 'How do you want to start?',
      'modes.sub': 'A full room, a quick draw, or a demo to explore the experience.',
      'modes.full.title': 'Full game',
      'modes.full.text': 'Room, invites, wishlists, exclusions, anonymous chat, and gift statuses.',
      'modes.full.cta': 'Create game',
      'modes.quick.title': 'Quick draw',
      'modes.quick.text': 'Just enter names and get pairs — no room, no sign-up.',
      'modes.quick.cta': 'Open quick draw',
      'modes.demo.title': 'View demo',
      'modes.demo.text': 'Load a sample game to see the participant and organizer dashboard.',
      'modes.demo.cta': 'Open demo',
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
      'faq.5.q': 'Can we play if we are in different cities?',
      'faq.5.a': 'Yes. Participants can add a delivery address to their profile, and Santa can send the gift by courier or mail.',
      'faq.6.q': 'Can I set exclusions?',
      'faq.6.a': 'Yes. The organizer can specify pairs who should not gift each other — for example spouses or teammates in the same department.',
      'faq.7.q': 'What if someone forgets a gift?',
      'faq.7.a': 'The organizer can see gift statuses and remind participants. Anonymous chat helps clarify details without revealing identities.',
      'faq.8.q': 'Can we run the draw again?',
      'faq.8.a': 'Yes. The organizer can reset the draw and run it again if the group or rules changed.',
      'audience.kicker': 'For any group',
      'audience.title': 'Play with people who matter to you',
      'audience.sub': 'Secret Santa works for friends, family, colleagues, and remote teams.',
      'audience.friends.title': 'With friends',
      'audience.friends.text': 'Add intrigue to your meetup: everyone prepares a surprise, then guesses their Santa.',
      'audience.work.title': 'With colleagues',
      'audience.work.text': 'Perfect for office and remote teams: one link, exclusions, gift statuses, and anonymous chat.',
      'audience.family.title': 'With family',
      'audience.family.text': 'Start a warm tradition: from siblings to grandparents — everyone gets a surprise.',
      'audience.remote.title': 'Across distances',
      'audience.remote.text': 'In different cities? Add a delivery address in profile and send the gift by courier.',
      'ideas.kicker': 'Gift inspiration',
      'ideas.title': 'Gifts they will love',
      'ideas.sub': 'Build wishlists easier — here are popular categories to pick from.',
      'ideas.cozy.title': 'Cozy & home',
      'ideas.cozy.text': 'Mugs, blankets, candles, tea, and books — warm gifts for a home evening.',
      'ideas.hobby.title': 'Hobbies & interests',
      'ideas.hobby.text': 'Craft kits, board games, gadgets, and everything for a favorite pastime.',
      'ideas.care.title': 'Self-care',
      'ideas.care.text': 'Skincare, massagers, scents — but check allergies in the profile first.',
      'ideas.sweet.title': 'Something sweet',
      'ideas.sweet.text': 'Chocolates, coffee, spices, and homemade treats — a sweet finish to the holiday.',
      'rules.kicker': 'Draw rules',
      'rules.title': 'How we keep it fair',
      'rules.1': 'Everyone gives to exactly one person and receives from exactly one.',
      'rules.2': 'No one gets themselves — the draw handles it automatically.',
      'rules.3': 'Exclusions and snowdrift groups make sure unwanted pairs never meet.',
      'rules.4': 'The organizer cannot see pairs, and participants see only their recipient.',
      'features.kicker': 'Why it’s convenient',
      'features.title': 'Everything for a smooth game',
      'features.sub': 'Control for organizers, simplicity and intrigue for participants.',
      'features.wishlist.title': 'Wishlists and anti-wishes',
      'features.wishlist.text': 'Participants add wishes, address, and what not to gift — easier for Santa to choose.',
      'features.chat.title': 'Anonymous chat',
      'features.chat.text': 'Santa and recipient can clarify details without revealing names.',
      'features.exclusions.title': 'Exclusions and fair draw',
      'features.exclusions.text': 'Account for pairs and constraints — no one gets themselves.',
      'features.status.title': 'Gift statuses',
      'features.status.text': 'The organizer sees progress: who picked, bought, or sent a gift.',
      'privacy.kicker': 'Privacy',
      'privacy.title': 'Who sees what',
      'privacy.sub': 'The secret stays secret: everyone sees just enough.',
      'privacy.organizer.title': 'Organizer',
      'privacy.organizer.text': 'Sees participants, statuses, and readiness — but not who gifts whom.',
      'privacy.santa.title': 'Santa',
      'privacy.santa.text': 'Sees only their recipient, their wishes, and profile after the draw.',
      'privacy.member.title': 'Participant',
      'privacy.member.text': 'Sees only what their Santa is gifting and their anonymous chat. Other pairs are hidden.',
      'testimonials.kicker': 'Player stories',
      'testimonials.title': 'Games people remember',
      'testimonials.1.text': '“We set up the game in 5 minutes, everyone added wishes, and no one was left without a gift. Anonymous chat is awesome!”',
      'testimonials.1.name': 'Anna',
      'testimonials.1.role': 'played with friends',
      'testimonials.2.text': '“Perfect for a remote team: addresses in profiles, gift statuses, and a clear draw.”',
      'testimonials.2.name': 'Igor',
      'testimonials.2.role': 'HR in an IT company',
      'testimonials.3.text': '“Our family tradition worked on the first try. Even grandma figured it out from the link!”',
      'testimonials.3.name': 'Marina',
      'testimonials.3.role': 'family game',
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
      'quick.csv': 'CSV',
      'quick.print': 'Print',
      'quick.link': 'Link',
      'quick.personalKicker': 'Your personal link',
      'quick.personalLabel': 'You are gifting',
      'quick.personalNote': 'Send this link only to this participant — other pairs are not visible in it.',
      'quick.personalCopy': 'Copy my link',
      'quick.personalHello': 'Hi, {name}!',
      'quick.linkCopied': 'Personal link copied',
      'quick.csvDone': 'CSV file downloaded',
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
      'dash.demoBadge': 'DEMO',
      'dash.resetDemo': 'Recreate demo',
      'dash.recipientTitle': 'Your recipient',
      'dash.recipientSub': 'The name will appear here after the draw',
      'dash.recipientNone': 'The draw has not been run yet.',
      'dash.recipientReady': 'The draw is done. Click “Show who I’m gifting to”.',
      'dash.recipientYou': 'You are gifting to: <strong>{name}</strong>',
      'dash.recipientWishlist': 'Recipient wishes',
      'dash.recipientWishlistEmpty': 'No wishes yet.',
      'dash.recipientProfileTitle': 'Recipient profile',
      'dash.recipientProfileEmpty': 'Recipient has not filled out the profile yet.',
      'dash.myWishlistTitle': 'My wishes',
      'dash.myWishlistSub': 'Help Santa pick something you’ll enjoy',
      'dash.myWishlistPh': 'For example: a book or a warm blanket',
      'dash.myWishlistAdd': 'Add',
      'dash.myWishlistEmpty': 'Add wishes to make gift choosing easier.',
      'dash.wishDelete': 'Delete',
      'dash.myProfileTitle': 'My profile',
      'dash.myProfileSub': 'Help your Santa: delivery address and preferences',
      'dash.profileAddress': 'Address / delivery',
      'dash.profileAddressLabel': 'Delivery address (if needed)',
      'dash.profileAddressPh': 'City, address, or how to hand it over',
      'dash.profileNote': 'About me / interests',
      'dash.profileNoteLabel': 'About me / interests',
      'dash.profileNotePh': 'For example: I love books, tea, board games',
      'dash.profileAnti': 'Better not gift',
      'dash.profileAntiLabel': 'Better not gift',
      'dash.profileAntiPh': 'Allergies, dislikes, etc.',
      'dash.profileSave': 'Save profile',
      'dash.profileSizeLabel': 'Size / measurements',
      'dash.profileSizePh': 'For example: M, 42, size 38',
      'dash.profileLinksLabel': 'Product links / wishlist',
      'dash.profileLinksPh': 'Links to products they would like',
      'dash.profileAllergiesLabel': 'Allergies and taboos',
      'dash.profileAllergiesPh': 'For example: nut allergy',
      'dash.profilePrivacy': 'Only your Santa sees this after the draw.',
      'dash.profileSaved': 'Profile saved',
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
      'dash.progressLabel': 'Exchange readiness',
      'dash.checklistTitle': 'What’s left to do',
      'dash.check1': 'Collect at least 3 participants',
      'dash.check2': 'Add items to your wishlist',
      'dash.check3': 'Fill in your profile for Santa',
      'dash.check4': 'Run the draw',
      'dash.check5': 'Update your gift status',
      'dash.checkAllDone': 'All set — just exchange the gifts!',
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
      'toast.queuedOffline': 'Offline — your message will be sent when connected',
      'toast.queueSent': 'Queued messages sent',
      'dash.chatPending': 'Pending',
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
      'dash.inviteBtn': 'Invite',
      'dash.inviteTextLabel': 'Invite message',
      'dash.inviteCopy': 'Copy text',
      'dash.inviteGreeting': 'Hi! I invite you to the Secret Santa game “{name}”.',
      'dash.inviteBudget': 'Gift budget: {min}–{max}.',
      'dash.inviteDate': 'Exchange date: {date}.',
      'dash.inviteJoin': 'Join here: {url}',
      'dash.inviteCode': 'Room code: {code}.',
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
      'dash.groupsTitle': 'Snowdrift groups',
      'dash.groupsSub': 'People in the same group will not gift each other — great for departments and families.',
      'dash.groupsNamePh': 'Group name',
      'dash.groupsAdd': 'Create group',
      'dash.groupsNone': 'No groups yet.',
      'dash.groupsCount': '{n} people',
      'dash.groupsNeed': 'Enter a name and select at least two participants',
      'dash.groupsCreated': 'Group created',
      'dash.groupsRemoved': 'Group removed',
      'dash.groupsHint': 'Select participants in the same group:',
      'dash.groupsLocked': 'Groups can only be changed before the draw.',
      'dash.activityTitle': 'Activity log',
      'dash.activitySub': 'What happened in the game (organizer only)',
      'dash.activityEmpty': 'No events yet.',
      'dash.activityDemo': 'Demo mode: showing local game events',
      'dash.evt.created': 'Game “{name}” created',
      'dash.evt.joined': '{name} joined the game',
      'dash.evt.wishlist': '{name} updated their wishlist',
      'dash.evt.status': '{name} changed gift status: {status}',
      'dash.evt.profile': '{name} updated their profile',
      'dash.evt.exclusionAdded': 'Exclusion added',
      'dash.evt.exclusionRemoved': 'Exclusion removed',
      'dash.evt.groupAdded': 'Group “{name}” created',
      'dash.evt.groupRemoved': 'Group “{name}” removed',
      'dash.evt.drawDone': 'Draw completed: {n} participants',
      'dash.evt.drawReset': 'Draw reset',
      'dash.evt.message': 'Anonymous message sent',
      'dash.evt.unknown': 'Game event',
      'dash.chatTitle': 'Anonymous chat',
      'dash.chatSub': 'Chat secretly with your recipient or your Santa',
      'dash.chatToRecipient': 'To my recipient',
      'dash.chatToSanta': 'To my Santa',
      'dash.chatPlaceholder': 'Write an anonymous message...',
      'dash.tplSize': 'What is your size?',
      'dash.tplAddress': 'Where is it best to deliver?',
      'dash.tplAllergy': 'Any allergies?',
      'dash.tplThanks': 'Thanks for the gift!',
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

  const THEME_KEY = 'secret-santa-theme';
  const THEMES = ['winter', 'midnight', 'cozy'];
  let theme = localStorage.getItem(THEME_KEY) || 'winter';
  if (!THEMES.includes(theme)) theme = 'winter';
  function applyTheme(nextTheme) {
    if (nextTheme && THEMES.includes(nextTheme)) theme = nextTheme;
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    const btn = $('#themeToggle');
    if (btn) {
      const icon = theme === 'winter' ? '☾' : theme === 'midnight' ? '☀' : '❄';
      btn.textContent = icon;
      const label = theme === 'winter' ? (lang === 'en' ? 'Switch theme' : 'Сменить тему') : theme === 'midnight' ? (lang === 'en' ? 'Switch theme' : 'Сменить тему') : (lang === 'en' ? 'Switch theme' : 'Сменить тему');
      btn.setAttribute('aria-label', label);
      btn.title = theme === 'winter' ? (lang === 'en' ? 'Theme: Winter' : 'Тема: Зима') : theme === 'midnight' ? (lang === 'en' ? 'Theme: Midnight' : 'Тема: Ночь') : (lang === 'en' ? 'Theme: Cozy' : 'Тема: Уют');
    }
  }
  function cycleTheme() { const i = THEMES.indexOf(theme); applyTheme(THEMES[(i + 1) % THEMES.length]); }

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
    updateOfflineUI();
    renderDashboard();
    renderQuickResult();
  }

  function uid(prefix = 'id') { return prefix + '_' + Math.random().toString(36).slice(2, 10); }
  function makeCode() { const part = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(2, 6) || 'AB12'; return 'SANTA-' + part; }
  function escapeHtml(str = '') { return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function b64urlEncode(str) {
    try { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    catch { return ''; }
  }
  function b64urlDecode(str) {
    try { const s = String(str).replace(/-/g, '+').replace(/_/g, '/'); return decodeURIComponent(escape(atob(s))); }
    catch { return ''; }
  }
  function quickPersonalUrl(santa, recipient) {
    const url = new URL(location.href);
    url.hash = 'quick?gift=' + encodeURIComponent(b64urlEncode(JSON.stringify({ s: santa, r: recipient })));
    return url.toString();
  }
  function parseHashParams() {
    const raw = location.hash.replace('#', '');
    return new URLSearchParams(raw.split('?')[1] || '');
  }

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

  const OFFLINE_QUEUE_KEY = 'secret-santa-offline-queue';
  const CHAT_CACHE_KEY = 'secret-santa-chat-cache';
  function getChatStore() {
    try { const s = JSON.parse(localStorage.getItem(CHAT_CACHE_KEY) || '{}'); return s && typeof s === 'object' ? s : {}; }
    catch { return {}; }
  }
  function saveChatStore(store) { localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(store)); }
  function clearChatCacheForCode(code) {
    const store = getChatStore();
    Object.keys(store).forEach(k => { if (k.startsWith(code + ':')) delete store[k]; });
    saveChatStore(store);
  }
  function getOfflineQueue() {
    try { const q = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); return Array.isArray(q) ? q : []; }
    catch { return []; }
  }
  function setOfflineQueue(items) { localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items)); }
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
          chatLoadedKey = '';
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

  let confirmCb = null;
  let lastFocusBeforeModal = null;
  let quickPairs = [];
  let chatChannel = 'to_recipient';
  let chatCache = { to_recipient: [], to_santa: [] };
  let chatLoadedKey = '';
  let chatLoading = false;
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
    if (!drawn) {
      if (notice) notice.textContent = t('dash.chatNoDraw');
      list.innerHTML = `<div class="chat-empty muted small">${escapeHtml(t('dash.chatNoDraw'))}</div>`;
      if (form) { if (input) input.disabled = true; const b = form.querySelector('button[type="submit"]'); if (b) b.disabled = true; }
      return;
    }
    if (!canChat) {
      const msg = t('dash.backendOffline');
      if (notice) notice.textContent = msg;
      list.innerHTML = `<div class="chat-empty muted small">${escapeHtml(msg)}</div>`;
      if (form) { if (input) input.disabled = true; const b = form.querySelector('button[type="submit"]'); if (b) b.disabled = true; }
      return;
    }

    if (form) { if (input) input.disabled = false; const b = form.querySelector('button[type="submit"]'); if (b) b.disabled = false; }
    if (notice) notice.textContent = '';
    const msgs = chatCache[chatChannel] || [];
    if (!msgs.length) {
      list.innerHTML = `<div class="chat-empty muted small">${escapeHtml(t('dash.chatEmpty'))}</div>`;
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
      checklist.innerHTML = items.map(i => `<li class="${i.done ? 'is-done' : ''}"><span class="checklist__mark" aria-hidden="true">${i.done ? '✓' : '○'}</span><span>${escapeHtml(i.label)}</span></li>`).join('');
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
      $('#myAssignment').classList.remove('muted');
      $('#myAssignment').innerHTML = t('dash.recipientYou', { name: escapeHtml(recv ? recv.name : '—') });
      $('#recipientWishlist').classList.remove('hidden');
      $('#recipientWishlistList').innerHTML = (recv && recv.wishlist.length)
        ? recv.wishlist.map(w => `<li><span>${escapeHtml(w.text)}</span></li>`).join('')
        : `<li><span class="muted">${escapeHtml(t('dash.recipientWishlistEmpty'))}</span></li>`;
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
      $('#myAssignment').classList.remove('muted');
      $('#myAssignment').textContent = t('dash.recipientReady');
      $('#recipientWishlist').classList.add('hidden');
      if (recipientProfile) recipientProfile.classList.add('hidden');
    } else {
      $('#myAssignment').classList.add('muted');
      $('#myAssignment').textContent = t('dash.recipientNone');
      $('#recipientWishlist').classList.add('hidden');
      if (recipientProfile) recipientProfile.classList.add('hidden');
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
    if (chatLoadedKey && !chatLoadedKey.startsWith(game.code + ':')) resetChatState();
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
        chatLoadedKey = '';
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
      </li>`).join('') : `<li><span class="muted small">${escapeHtml(t('dash.activityEmpty'))}</span></li>`;
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

  function renderQuickResult() {
    const list = $('#quickResultList');
    const meta = $('#quickResultMeta');
    const copyBtn = $('#quickCopyBtn');
    const csvBtn = $('#quickCsvBtn');
    const printBtn = $('#quickPrintBtn');
    if (!list) return;
    if (!quickPairs.length) {
      list.innerHTML = `<li><span class="muted small">${escapeHtml(t('quick.resultEmpty'))}</span></li>`;
      if (meta) meta.textContent = '';
      if (copyBtn) copyBtn.disabled = true;
      if (csvBtn) csvBtn.disabled = true;
      if (printBtn) printBtn.disabled = true;
      return;
    }
    list.innerHTML = quickPairs.map((p, i) => `<li><span><strong>${escapeHtml(p.santa)}</strong> → ${escapeHtml(p.recipient)}</span><button class="link-btn" data-quick-link="${i}" type="button" title="${escapeHtml(t('quick.link'))}">🔗 ${escapeHtml(t('quick.link'))}</button></li>`).join('');
    if (meta) meta.textContent = `${quickPairs.length}`;
    if (copyBtn) copyBtn.disabled = false;
    if (csvBtn) csvBtn.disabled = false;
    if (printBtn) printBtn.disabled = false;
    $$('[data-quick-link]').forEach(btn => btn.onclick = async () => {
      const p = quickPairs[Number(btn.dataset.quickLink)]; if (!p) return;
      const url = quickPersonalUrl(p.santa, p.recipient);
      try { await navigator.clipboard.writeText(url); toast(t('quick.linkCopied')); }
      catch { toast(url); }
    });
  }

  function hideQuickPersonal() {
    const card = $('#quickPersonalCard'); if (!card) return;
    card.classList.add('hidden');
    card.closest('.snow-card')?.classList.remove('quick-personal-mode');
  }
  function showQuickPersonal(giftParam) {
    const card = $('#quickPersonalCard'); if (!card) return;
    let data = null;
    try { data = JSON.parse(b64urlDecode(giftParam)); } catch { /* ignore */ }
    if (!data || !data.s || !data.r) return;
    $('#quickPersonalHello').textContent = t('quick.personalHello', { name: data.s });
    $('#quickPersonalRecipient').textContent = data.r;
    card.classList.remove('hidden');
    $('#quickResultList').closest('.snow-card').classList.add('quick-personal-mode');
    const copyBtn = $('#quickPersonalCopyBtn');
    if (copyBtn) copyBtn.onclick = async () => {
      const url = new URL(location.href); url.hash = 'quick?gift=' + encodeURIComponent(giftParam);
      try { await navigator.clipboard.writeText(url.toString()); toast(t('quick.linkCopied')); }
      catch { toast(url.toString()); }
    };
  }

  function createDemoGame() {
    const code = 'DEMO-SANTA';
    const meId = 'p_demo_me';
    const p2 = 'p_demo_anna';
    const p3 = 'p_demo_ilya';
    const p4 = 'p_demo_maria';
    const game = {
      code,
      name: lang === 'en' ? 'New Year Demo Game' : 'Демо-игра: Новый год',
      budgetMin: 1000,
      budgetMax: 2500,
      eventDate: '2026-12-28',
      theme: lang === 'en' ? 'Cozy winter' : 'Уютная зима',
      mode: 'classic',
      participants: [
        { id: meId, name: lang === 'en' ? 'You' : 'Вы', isOrganizer: true, wishlist: [{ id: 'w1', text: lang === 'en' ? 'Warm scarf' : 'Тёплый шарф' }, { id: 'w2', text: lang === 'en' ? 'Board game' : 'Настольная игра' }], giftStatus: 'idea', address: lang === 'en' ? 'Moscow, pickup at office' : 'Москва, заберу в офисе', profileNote: lang === 'en' ? 'I love tea, books, and hiking' : 'Люблю чай, книги и походы', antiWishlist: lang === 'en' ? 'No perfume' : 'Без парфюмерии', size: lang === 'en' ? 'M / shoe 39' : 'M / обувь 39', links: lang === 'en' ? 'https://example.com/wishlist' : 'https://example.com/wishlist', allergies: lang === 'en' ? 'No nuts' : 'Аллергия на орехи' },
        { id: p2, name: lang === 'en' ? 'Anna' : 'Анна', isOrganizer: false, wishlist: [{ id: 'w3', text: lang === 'en' ? 'Ceramic mug' : 'Керамическая кружка' }], giftStatus: 'bought', address: '', profileNote: lang === 'en' ? 'Coffee and plants' : 'Кофе и растения', antiWishlist: lang === 'en' ? 'No sweets' : 'Без сладкого' },
        { id: p3, name: lang === 'en' ? 'Ilya' : 'Илья', isOrganizer: false, wishlist: [{ id: 'w4', text: lang === 'en' ? 'Headlamp' : 'Налобный фонарь' }], giftStatus: 'none', address: lang === 'en' ? 'Saint Petersburg, delivery by courier' : 'Санкт-Петербург, доставка курьером', profileNote: lang === 'en' ? 'Camping, tech gadgets' : 'Походы и гаджеты', antiWishlist: '' },
        { id: p4, name: lang === 'en' ? 'Maria' : 'Мария', isOrganizer: false, wishlist: [], giftStatus: 'done', address: '', profileNote: '', antiWishlist: lang === 'en' ? 'No candles' : 'Без свечей' },
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
    toast(lang === 'en' ? 'Demo game loaded' : 'Демо-игра загружена');
    navigate('dashboard');
    renderDashboard();
  }

  function wire() {
    const demoBtn = $('#demoBtn');
    if (demoBtn) demoBtn.addEventListener('click', createDemoGame);
    const demoBtnModes = $('#demoBtnModes');
    if (demoBtnModes) demoBtnModes.addEventListener('click', createDemoGame);
    const resetDemoBtn = $('#resetDemoBtn');
    if (resetDemoBtn) resetDemoBtn.addEventListener('click', () => { createDemoGame(); });
    $$('[data-nav]').forEach(el => el.addEventListener('click', (e) => {
      e.preventDefault();
      const nav = el.dataset.nav || el.getAttribute('href').replace('#', '');
      if (nav === 'quick') { hideQuickPersonal(); if (location.hash.includes('?')) location.hash = 'quick'; }
      navigate(nav);
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
        toast(lang === 'ru' ? 'В онлайн-режиме поделитесь кодом/ссылкой, чтобы участник присоединился сам.' : 'In online mode, share the code/link so the participant can join.');
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
      pushLocalActivity(game, 'room.wishlist_updated', { memberId: me.id, name: me.name });
      saveState(); input.value = ''; renderDashboard(); loadActivity(); toast(t('toast.wishAdded'));
    });

    const chatTabRecipient = $('#chatTabRecipient');
    const chatTabSanta = $('#chatTabSanta');
    if (chatTabRecipient) chatTabRecipient.addEventListener('click', () => {
      chatChannel = 'to_recipient';
      const game = currentGame(); const me = currentMe(game);
      renderChat(game, me, !!(game && game.assignments && Object.keys(game.assignments).length > 0));
      loadChatMessages({ silent: true, force: true });
    });
    if (chatTabSanta) chatTabSanta.addEventListener('click', () => {
      chatChannel = 'to_santa';
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
    if (inviteBtn) inviteBtn.addEventListener('click', () => { const b = $('#copyInviteBtn'); if (b) b.click(); else { const game = currentGame(); if (game) { navigator.clipboard?.writeText(location.origin + location.pathname + '#join?code=' + encodeURIComponent(game.code)); toast(t('toast.copiedLink')); } } });
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
      quickPairs = participants.map(p => ({ santa: p.name, recipient: participants.find(r => r.id === map[p.id])?.name || '' }));
      renderQuickResult();
    });
    if (quickResetBtn) quickResetBtn.addEventListener('click', () => {
      hideQuickPersonal();
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
    const quickCsvBtn = $('#quickCsvBtn');
    if (quickCsvBtn) quickCsvBtn.addEventListener('click', () => {
      if (!quickPairs.length) return;
      const csv = '\uFEFFСанта,Получатель\n' + quickPairs.map(p => `"${p.santa.replace(/"/g, '""')}","${p.recipient.replace(/"/g, '""')}"`).join('\n');
      downloadText('secret-santa-pairs.csv', csv, 'text/csv;charset=utf-8');
      toast(t('quick.csvDone'));
    });
    const quickPrintBtn = $('#quickPrintBtn');
    if (quickPrintBtn) quickPrintBtn.addEventListener('click', () => window.print());
  }

  function downloadText(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // init
  wire();
  const langBtn = $('#langToggle');
  if (langBtn) langBtn.addEventListener('click', () => applyLang(lang === 'ru' ? 'en' : 'ru'));
  const themeToggle = $('#themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', cycleTheme);
  let installPrompt = null;
  const installBtn = $('#installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); installPrompt = e;
    if (installBtn) installBtn.classList.remove('hidden');
  });
  if (installBtn) installBtn.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    installPrompt = null; installBtn.classList.add('hidden');
    if (outcome === 'accepted') toast(lang === 'en' ? 'App installed' : 'Приложение установлено');
  });

  window.addEventListener('offline', () => { updateOfflineUI(); });
  window.addEventListener('online', async () => {
    const banner = $('#offlineBanner'); const text = $('#offlineBannerText');
    if (banner && text) { text.textContent = t('nav.online'); banner.classList.remove('hidden'); }
    await flushOfflineQueue();
    setTimeout(updateOfflineUI, 2000);
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'flush-offline-queue') flushOfflineQueue();
    });
  }

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

  applyLang(lang);
  applyTheme();
  const start = rawHash.split('?')[0];
  navigate(views.includes(start) ? start : 'home');
  if (start === 'quick' && giftParam) showQuickPersonal(giftParam);
  detectBackend().then(() => { if (currentGame()) refreshDashboard(); });
  if (navigator.onLine !== false) flushOfflineQueue();
  if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {})); }
})();
