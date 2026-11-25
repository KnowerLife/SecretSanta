# Промты и план иллюстраций SecretSanta (v66)

Этот файл — **единственный актуальный источник** по визуалу проекта. Он заменяет разрозненные заметки v62–v65. Здесь есть стиль, все 36 зон, готовые промты на RU/EN и технические ограничения.

## Что изменилось в v65–v66

- В v66 заменены все 36 JPG. Новые файлы уже в sRGB, quality 74 и нужных размерах, поэтому повторно их не пересжимаем. Общий вес `assets/images/` уменьшился с **3.8 МБ до 1.2 МБ**.
- Декоративные 1600×900 сцены уменьшены до **1200×675**: они показываются в панелях не шире 560 CSS-пикселей, 1200 px достаточно и для retina.
- Фоны секций (`art-*`, `cta-card--art`) больше не загружаются сразу: `IntersectionObserver` в `app.js` ставит `--art-image` только при приближении блока к экрану.
- В service worker `install` попадают только shell и **5 сцен первого экрана** (`hero`, `guide-format`, `mode-online`, `mode-quick`, `mode-demo`); остальные 31 кешируются при первом использовании. Стартовый набор картинок главной — около **163 КБ** вместо ~936 КБ.
- Визуальный курс скорректирован: уходим от глянцевых «пластиковых» наборов и перегруженных сцен к **матовой бумажной пластике**, одному четкому объекту и большему количеству воздуха.

---

## 1. Единый стиль-анкер

Добавьте этот блок в начало **каждого** промта. Он важнее частных деталей: он делает все картинки похожими на одну серию.

**RU:**

> Современный уютный праздник, зимняя редакционная иллюстрация в технике матовых бумажных вырезок и мягкой ручной печати. Никакого глянца, пластика, 3D-рендера, фотореализма и «детских наклеек». Ограниченная палитра: зимнее небо `#A3CEFD`/`#DCEEFF`, снежно-белый, тёмно-синий `#183B70`, коралловый `#FF6960`, хвойный `#2F7A5B`, тёплое золото. Мягкий рассеянный свет, тонкая бумажная фактура, лёгкое зерно, короткие мягкие тени под объектами. Композиция сдвинута вправо, слева много чистого воздуха под будущий заголовок. Один главный объект, максимум два второстепенных. Спокойное, доверительное настроение, без суеты.

**EN:**

> Cozy modern holiday, winter editorial illustration made of matte paper cut-outs and soft hand-print texture. No gloss, plastic, 3D render, photorealism or sticker-clipart look. Limited palette: winter sky `#A3CEFD`/`#DCEEFF`, snow white, deep blue `#183B70`, coral `#FF6960`, pine `#2F7A5B`, warm gold. Diffused light, subtle paper grain, gentle short shadows. Right-weighted composition with generous clean space on the left for a future heading. One clear hero object, at most two supporting props. Calm, trustworthy mood, never busy.

**Общий negative prompt:**

> text, letters, digits, words, logos, brands, watermarks, UI screenshots, readable labels, realistic faces, large eyes, glossy plastic, 3D clay render, neon, horror, aggression, clutter, many small details, busy pattern, photographic background

**Композиционные правила:**

- Шапки секций и страниц: главное справа, левые **50–55% почти пустые**, потому что сверху лежит текст интерфейса.
- Пустые состояния: один объект, до 40% кадра — воздух, никакого «намека на интерфейс».
- Миниатюры гидов: только предметы-символы, **без людей и без надписей**; шаг должен читаться за 1 секунду.
- Иконки-символы (стрелка, галочка, знак вопроса) допустимы как **вырезанные из бумаги формы**, но не как текст и не как UI-кнопки.
- Все `<img>` декоративные: `alt=""`, `loading="lazy"`, `decoding="async"`, `onerror="this.hidden=true"`. Фоны имеют градиент-fallback.

**Техника экспорта:**

- Источник рисовать в 2× от целевого размера; экспорт JPG, sRGB, progressive, quality 74, без alpha и метаданных.
- Не пересохранять уже сжатый JPG повторно: всегда брать исходник/PNG и делать свежий экспорт.
- Текущие размеры: шапки и CTA 1200×675; карточки 1200×800; состояния 1200×900; миниатюры гидов 800×600; соцобложка 1200×630.

---

## 2. Карта всех зон

| # | Файл | Зона | Размер | Статус |
|---|------|------|--------|--------|
| 1 | `hero-winter-scene.jpg` | Фон макета на первом экране | 1200×675 | ✅ |
| 2 | `step-create-game.jpg` | Шаг «Создайте игру» | 1200×800 | ✅ |
| 3 | `step-invite-friends.jpg` | Шаг «Соберите участников» | 1200×800 | ✅ |
| 4 | `step-draw-gifts.jpg` | Шаг «Проведите жеребьёвку» | 1200×800 | ✅ |
| 5 | `dashboard-empty.jpg` | Пустая комната | 1200×800 | ✅ |
| 6 | `audience-remote.jpg` | Шапка «Для любой компании» | 1200×900 | ✅ |
| 7 | `feature-anonymous-chat.jpg` | Шапка «Почему это удобно» | 1200×900 | ✅ |
| 8 | `privacy-who-sees.jpg` | Шапка «Кто что видит» | 1200×675 | ✅ |
| 9 | `gift-ideas.jpg` | Шапка «Идеи для вдохновения» | 1200×675 | ✅ |
| 10 | `cta-celebration.jpg` | Финальный CTA | 1200×675 | ✅ |
| 11 | `chat-empty.jpg` | Пустой чат | 1200×900 | ✅ |
| 12 | `quick-draw-success.jpg` | Результат быстрой жеребьёвки | 1200×675 | ✅ |
| 13 | `social-cover.jpg` | `og:image` / `twitter:image` | 1200×630 | ✅ |
| 14 | `mode-online.jpg` | Формат «Полная игра» | 1200×800 | ✅ |
| 15 | `mode-quick.jpg` | Формат «Быстрая жеребьёвка» | 1200×800 | ✅ |
| 16 | `mode-demo.jpg` | Формат «Посмотреть демо» | 1200×800 | ✅ |
| 17 | `rules-fair-draw.jpg` | Шапка «Правила» | 1200×675 | ✅ |
| 18 | `testimonials-friends.jpg` | Шапка «Отзывы» | 1200×675 | ✅ |
| 19 | `faq-help.jpg` | Шапка FAQ | 1200×675 | ✅ |
| 20 | `create-game-head.jpg` | Шапка view «Создать игру» | 1200×675 | ✅ |
| 21 | `join-game-head.jpg` | Шапка view «Войти в игру» | 1200×675 | ✅ |
| 22 | `quick-draw-head.jpg` | Шапка view «Быстрая жеребьёвка» | 1200×675 | ✅ |
| 23 | `recipient-waiting.jpg` | «Получатель пока не известен» | 1200×900 | ✅ |
| 24 | `chat-waiting.jpg` | Чат до жеребьёвки | 1200×900 | ✅ |
| 25 | `profile-empty.jpg` | Профиль получателя пуст | 1200×900 | ✅ |
| 26 | `wishlist-empty.jpg` | Пустой вишлист | 1200×900 | ✅ |
| 27 | `invite-share.jpg` | Панель приглашения | 1200×900 | ✅ |
| 28 | `access-empty.jpg` | Нет серий доступа | 1200×900 | ✅ |
| 29 | `activity-empty.jpg` | Пустой лог событий | 1200×900 | ✅ |
| 30 | `guide-format.jpg` | Сайт-гид, шаг 1 «Формат» | 800×600 | ✅ |
| 31 | `guide-prep.jpg` | Сайт-гид, шаг 4 «Подготовка» | 800×600 | ✅ |
| 32 | `guide-room-team.jpg` | Гид комнаты, шаг 1 «Команда» | 800×600 | ✅ |
| 33 | `guide-room-wishes.jpg` | Гид комнаты, шаг 2 «Желания» | 800×600 | ✅ |
| 34 | `guide-room-profile.jpg` | Гид комнаты, шаг 3 «Профиль» | 800×600 | ✅ |
| 35 | `guide-room-draw.jpg` | Гид комнаты, шаг 4 «Жеребьёвка» | 800×600 | ✅ |
| 36 | `guide-room-gift.jpg` | Гид комнаты, шаг 5 «Подарок» | 800×600 | ✅ |

---

## 3. Промты по зонам

### A. Первый экран и форматы

#### 1. `hero-winter-scene.jpg`
- **Где:** `.hero-preview::before`, единственная «тяжёлая» картинка первого экрана.
- **Промт:** Матовый бумажный зимний стол под углом: справа маленькая коробка с лентой, две сложенные открытки и чашка какао; за окном размытый снег. Свет холодный, но тёплый акцент на ленте. Оставляем почти всё пространство слева и сверху пустым — поверх будет макет комнаты.
- **EN:** Matte paper-cut winter desk seen at a slight angle: a small ribboned box, two folded cards and a mug of cocoa on the right, blurred snow outside a window. Cool light with one warm ribbon accent. Keep most of the left and top area empty for the product preview overlay.

#### 14. `mode-online.jpg`
- **Где:** карточка «Полная игра».
- **Промт:** Один общий стол, вокруг него четыре пустые бумажные карточки-таблички, соединённые пунктирной лентой с центральной коробкой. Никаких людей и экранов: «полная игра» читается через связь и общий ритуал, а не через скриншот интерфейса.
- **EN:** A single shared table with four blank paper name-cards around it, linked by a dashed ribbon to a central gift box. No people and no screens: the full game is suggested by connection and ritual, not by a UI screenshot.

#### 15. `mode-quick.jpg`
- **Где:** карточка «Быстрая жеребьёвка».
- **Промт:** Аккуратная стопка бумажных карточек сбоку, одна карточка вышла вперёд и соединена короткой стрелкой с маленьким жетоном. Один коралловый акцент, всё остальное спокойное. Скорость передаётся направлением, а не хаотичным движением.
- **EN:** A neat stack of paper cards on the side, one card stepping forward and joined by a short arrow to a small token. One coral accent, everything else calm. Convey speed through direction, not chaotic motion.

#### 16. `mode-demo.jpg`
- **Где:** карточка «Посмотреть демо».
- **Промт:** Маленькая витрина-коробка: приоткрытая крышка, внутри аккуратно сложенная бумажная карточка комнаты и миниатюрный бантик. Чувство «можно заглянуть», без рекламной помпезности и без крупных надписей.
- **EN:** A small display box: the lid is slightly open, inside is a neatly folded paper room card and a tiny bow. Inviting to peek, not loud or promotional, no large lettering.

#### 30. `guide-format.jpg`
- **Где:** превью 1-го шага сайт-гида.
- **Промт:** Три бумажные карточки разной высоты на столе: одна с символом часов, одна со списком-линейками, одна с коробкой. Вместо текста — чистые вырезанные знаки. Карточки читаются за секунду, фон почти пустой.
- **EN:** Three paper cards of different heights on a table: one with a clock cut-out, one with blank list lines, one with a gift box. Clean symbols instead of text. Readable in one second, nearly empty background.

### B. Онбординг и объяснения

#### 2. `step-create-game.jpg`
- **Где:** превью шага «Создайте игру» в сайт-гиде.
- **Промт:** Блокнот с пустыми строками, ручка и маленький календарь с обведённой датой. Настройки игры показаны как пустые галочки и короткие линии, без единой буквы. Тёплый свет, один зелёный акцент.
- **EN:** A notebook with blank lines, a pen and a small calendar with one circled date. Game settings appear as empty checkboxes and short lines, not a single letter. Warm light, one pine-green accent.

#### 3. `step-invite-friends.jpg`
- **Где:** превью шага «Соберите участников».
- **Промт:** Несколько чистых конвертов разлетаются мягкой дугой от одной открытки; между ними тонкая пунктирная линия. Без телефонов, без аватаров, без читаемых адресов — приглашение как движение, а не как интерфейс.
- **EN:** Several blank envelopes fanning out in a soft arc from one card, joined by a thin dashed line. No phones, no avatars, no readable addresses — invitation suggested by motion, not interface.

#### 4. `step-draw-gifts.jpg`
- **Где:** превью шага «Проведите жеребьёвку».
- **Промт:** Закрытые конверты полукругом, лента соединяет пары: снежинка → варежка, ёлка → коробка. Пары обозначены только формами, имён не видно. Один коралловый жетон в центре как момент жеребьёвки.
- **EN:** Closed envelopes in a shallow arc and a ribbon connecting pairs: snowflake → mitten, pine → box. Pairs are shown only as shapes, no names. One coral token in the centre as the moment of draw.

#### 31. `guide-prep.jpg`
- **Где:** превью 4-го шага сайт-гида «Подготовьтесь».
- **Промт:** Лист идей на столе: очищенный карандаш, три маленьких бумажных ярлычка с Symbolic подарками и чашка какао. Спокойно, уютно, без списка покупок с текстом.
- **EN:** An idea sheet on the table: a sharpened pencil, three small paper tags with symbolic gifts and a mug of cocoa. Calm and cosy, no readable shopping list.

#### 17. `rules-fair-draw.jpg`
- **Где:** шапка секции «Правила жеребьёвки».
- **Промт:** Ровный круг из одинаковых бумажных жетонов, один жетон выделен коралловым цветом; тонкая стрелка идёт по кругу и возвращается к началу. Никаких кубиков, рулеток и текста: честность как замкнутый цикл.
- **EN:** An even circle of identical paper tokens, one token marked coral; a thin arrow follows the circle and returns to the start. No dice, wheels or text: fairness shown as a closed loop.

#### 18. `testimonials-friends.jpg`
- **Где:** шапка секции «Опыт игроков».
- **Промт:** Два-три пустых бумажных речевых пузыря, внутри — маленькие вырезанные сердечки и лента вместо слов; рядом две коробки, которыми обменялись. Бурные эмоции заменены тёплым спокойствием.
- **EN:** Two or three blank paper speech bubbles holding small cut-out hearts and a ribbon instead of words; beside them two exchanged gift boxes. Warm calm instead of loud emotion.

#### 19. `faq-help.jpg`
- **Где:** шапка FAQ.
- **Промт:** Несколько сложенных конвертиков-вопросов и одна приоткрытая карточка-ответ рядом. Вместо знака вопроса — вырезанная бумажная форма; внутри ответа только короткие линии, не текст. Помощь без «службы поддержки» и без крупных иконок.
- **EN:** A few folded question-envelopes and one slightly opened answer card beside them. The question mark is a paper cut-out, the answer contains only short lines, not text. Supportive, no help-desk cliché or oversized icons.

### C. Возможности, приватность, доверие

#### 6. `audience-remote.jpg`
- **Где:** шапка «Для любой компании».
- **Промт:** Разные по цвету варежки и шарфы, развешанные на одной верёвке; рядом пустой общий стол. Никаких лиц: «любая компания» передаётся разнообразием предметов, а не толпой людей. Один тёплый акцент.
- **EN:** Different coloured mittens and scarves hanging from one string, with an empty shared table nearby. No faces: “any team” is expressed through varied objects, not a crowd. One warm accent.

#### 7. `feature-anonymous-chat.jpg`
- **Где:** шапка «Почему это удобно».
- **Промт:** Два чистых бумажных пузыря, один слегка повёрнут к другому; между ними небольшой вырезанный конверт со знаком вопроса вместо букв. Не шпионская маска и не замок: анонимность как нейтральная бумажная ширма.
- **EN:** Two clean paper bubbles, one slightly turned toward the other; between them a small cut-out envelope with a question shape instead of letters. No spy mask or padlock: anonymity shown as a neutral paper screen.

#### 8. `privacy-who-sees.jpg`
- **Где:** шапка «Кто что видит».
- **Промт:** Три полупрозрачные бумажные ширмы разной высоты; за первой видна только коробка, за второй — пустая карточка, третья полностью закрыта. Никаких глаз, ключей и замков: границы доступа показаны слоями, а не угрозой.
- **EN:** Three translucent paper screens of different heights; behind the first only a box is visible, behind the second a blank card, the third is fully closed. No eyes, keys or locks: access boundaries shown as layers, not threat.

#### 9. `gift-ideas.jpg`
- **Где:** шапка «Идеи для вдохновения».
- **Промт:** Спокойный moodboard: маленькие вырезанные символы — книга, шарф, банка, карандаш, варежка — разложены на листе и связаны тонкой нитью. Один символ крупнее, остальные мельче; текст и ценники запрещены.
- **EN:** A quiet paper moodboard: small cut-out symbols — a book, scarf, jar, pencil and mitten — arranged on a sheet and tied with a thin thread. One symbol is larger, the rest smaller; no text or price tags.

### D. Шапки страниц и форм

#### 20. `create-game-head.jpg`
- **Где:** `.page-head` view «Создать игру».
- **Промт:** Чистая бумажная форма с пустыми линиями, ручка, календарь и маленькая коробка с лентой в правой части кадра. Левая половина свободна под заголовок страницы. Без клавиатуры и без читаемых полей.
- **EN:** A clean paper form with blank lines, a pen, a calendar and a small ribboned box on the right side. The left half stays clear for the page heading. No keyboard and no readable fields.

#### 21. `join-game-head.jpg`
- **Где:** `.page-head` view «Войти в игру».
- **Промт:** Бумажный билет с пустыми ячейками для кода и приоткрытая дверь; свет изнутри тёплый, но без людей и табличек. Код не показан: только ритуал входа. Композиция снова справа.
- **EN:** A paper ticket with empty cells for a code and a slightly open door; warm light from inside, no people and no signage. The code itself is not shown — only the ritual of entering. Right-weighted composition.

#### 22. `quick-draw-head.jpg`
- **Где:** шапка view «Быстрая жеребьёвка».
- **Промт:** Две перекрывающиеся бумажные карточки, короткая стрелка между ними и одна лента-завязка; лёгкие линии движения, но не взрыв конфетти. Скорость и простота, без сложной механики.
- **EN:** Two overlapping paper cards, a short arrow between them and one ribbon tie; light motion lines but no confetti explosion. Speed and simplicity, no complex mechanics.

### E. Состояния комнаты

#### 5. `dashboard-empty.jpg`
- **Где:** пустое состояние «Моя игра».
- **Промт:** Пустой стол, одна закрытая коробка с лентой и свободное место слева под заголовок. Никакой клавиатуры, никаких меню,никаких «начните здесь» буквами. Ожидание, а не пустота-страх.
- **EN:** An empty table, one closed ribboned box and clear space on the left for a heading. No keyboard, no menus, no “start here” lettering. Anticipation, not frightening emptiness.

#### 23. `recipient-waiting.jpg`
- **Где:** блок «Ваш получатель» до жеребьёвки.
- **Промт:** Закрытый конверт, перевязанный лентой, и маленькие песочные часы рядом. Один спокойный объект, много воздуха. Без вопросительных знаков, глаз и тревожных символов.
- **EN:** A closed envelope tied with ribbon and small paper hourglass beside it. One quiet object, lots of air. No question marks, eyes or anxious symbols.

#### 11. `chat-empty.jpg`
- **Где:** пустой анонимный чат.
- **Промт:** Две чистые бумажные карточки-сообщения, одна чуть выше другой, обе без надписей; лёгкая тень и коралловый край у одной. Готовность к диалогу, без клавиатуры и без аватаров.
- **EN:** Two clean paper message-cards, one slightly higher than the other, both without writing; a soft shadow and one coral edge. Ready for conversation, no keyboard and no avatars.

#### 24. `chat-waiting.jpg`
- **Где:** чат до жеребьёвки.
- **Промт:** Конверт и чашка, оставленные на столе; лента ещё не развязана. Тише и теплее, чем пустой чат: диалог начнётся после жеребьёвки. Без текста и без иконки блокировки.
- **EN:** An envelope and a mug left on the table; the ribbon is still tied. Quieter and warmer than the empty chat: conversation starts after the draw. No text and no lock icon.

#### 25. `profile-empty.jpg`
- **Где:** профиль получателя не заполнен.
- **Промт:** Пустая бумажная рамка вместо портрета; рядом варежка и короткая линия-подсказка вместо имени. Конфиденциально и бережно: никакой силуэт лица и никаких «неизвестно» букв.
- **EN:** A blank paper frame in place of a portrait; beside it a mitten and one short line instead of a name. Private and gentle: no facial silhouette and no “unknown” lettering.

#### 26. `wishlist-empty.jpg`
- **Где:** пустой вишлист.
- **Промт:** Чистый лист с тремя пустыми галочками и карандашом, лежащим наискосок. Один зелёный акцент на первой галочке. Никаких покупок, цен и списков с текстом.
- **EN:** A clean sheet with three empty checkboxes and a pencil laid diagonally. One pine accent on the first checkbox. No shopping items, prices or written lists.

#### 27. `invite-share.jpg`
- **Где:** панель «Приглашение» в дашборде.
- **Промт:** Открытка с пустыми строчками; над ней три маленькие бумажные стрелки-символа: ссылка, чат, почта. Жест «поделиться» без логотипов мессенджеров и без подписей.
- **EN:** A card with blank lines; above it three small paper arrow-symbols: link, chat, mail. The sharing gesture without messenger logos or captions.

#### 28. `access-empty.jpg`
- **Где:** нет серий доступа.
- **Промт:** Пустая вешалка с одним свободным крючком; под ней аккуратная стопка чистых карточек. Ожидание участника, без ключей, замков и табличек.
- **EN:** An empty hook rail with one free hook; beneath it a neat stack of blank cards. Waiting for a participant, no keys, locks or labels.

#### 29. `activity-empty.jpg`
- **Где:** пустой лог событий.
- **Промт:** Чистая бумажная лента с тремя пустыми кружками-отметками; первый кружок чуть выделен кораллом. Лента событий без строчек-текста и без часов с циферблатом.
- **EN:** A clean paper timeline with three empty dot markers; the first dot slightly highlighted in coral. An event log without text lines and without a clock face.

#### 12. `quick-draw-success.jpg`
- **Где:** верх карточки результата быстрой жеребьёвки.
- **Промт:** Две карточки, соединённые лентой, одна маленькая коробка и очень редкие бумажные конфетти в правом верхнем углу. Праздник без перегруза: левая часть свободна под результат.
- **EN:** Two cards joined by a ribbon, one small gift box and very sparse paper confetti in the upper right. Celebration without clutter: the left side stays clear for the result.

### F. Финал и соцобложка

#### 10. `cta-celebration.jpg`
- **Где:** фон финального CTA `.cta-card--art`.
- **Промт:** Небольшие коробки и ленты мягко падают с правого верхнего края на светлый стол; тёплое свечение, но без фейерверка и толпы. Левые 60% почти пустые под заголовок и кнопку.
- **EN:** Small boxes and ribbons drifting down from the upper right onto a light table; warm glow, no fireworks and no crowd. The left 60% is nearly empty for the heading and button.

#### 13. `social-cover.jpg`
- **Где:** `og:image` и `twitter:image`.
- **Промт:** Та же зимняя бумажная сцена, что и в hero: коробка по центру-справа, две карточки, мягкий снег по краям. Много свободного поля сверху и слева — соцсети обрезают края и показывают заголовок рядом. Без текста на самой картинке.
- **EN:** The same winter paper scene as the hero: a box centre-right, two cards, soft snow at the edges. Generous empty space at the top and left — social platforms crop edges and place the title nearby. No text baked into the image.

### G. Гид комнаты

Все пять миниатюр — предметные, 800×600, `alt=""`. Не добавляйте лица, имена и читаемые карточки: рядом с каждым шагом уже есть текст интерфейса.

#### 32. `guide-room-team.jpg`
- **Промт:** Общий стол с четырьмя пустыми карточками-местами и одной открыткой-приглашением. Столько же предметов, сколько участников; никто не «нарисован», но команда читается.
- **EN:** A shared table with four blank place-cards and one invitation card. As many objects as participants; nobody is drawn, yet the team is legible.

#### 33. `guide-room-wishes.jpg`
- **Промт:** Лист с короткими пустыми строками, карандаш и три крошечных символа-идеи: книга, шарф, варежка. Желания без текста.
- **EN:** A sheet with short blank lines, a pencil and three tiny idea-symbols: a book, a scarf, a mitten. Wishes without text.

#### 34. `guide-room-profile.jpg`
- **Промт:** Пустая рамка профиля, рядом сложенная варежка и лента-завязка. Подчёркнутая приватность: вместо портрета — бережный предметный знак.
- **EN:** A blank profile frame, beside it a folded mitten and a ribbon tie. Explicit privacy: a gentle object stands in for a portrait.

#### 35. `guide-room-draw.jpg`
- **Промт:** Закрытые конверты по кругу и стрелка, замыкающая круг; один конверт уже соединён лентой с коробкой. Момент жеребьёвки без имён и без конфетти.
- **EN:** Closed envelopes in a circle and an arrow closing the loop; one envelope is already ribboned to a box. The draw moment without names or confetti.

#### 36. `guide-room-gift.jpg`
- **Промт:** Завёрнутая коробка с небольшой бумажной галочкой рядом и пустой речевой пузырь чуть выше. Статус подарка и анонимный чат одним взглядом, без надписей.
- **EN:** A wrapped box with a small paper checkmark beside it and an empty speech bubble slightly above. Gift status and anonymous chat at a glance, no lettering.

---

## 4. Что переделывать в первую очередь

Если текущие картинки всё ещё выглядят «не такими», заменяйте именно эти зоны — они дают наибольший визуальный выигрыш:

1. **#1 hero, #10 CTA, #17 правила, #20–#22 шапки страниц** — упростить до одного-двух объектов, убрать глянец и мелкие детали.
2. **#6, #7, #8 возможности и приватность** — убрать набор мелких иконок, оставить одну метафору (верёвка, ширма, пузырь).
3. **#11, #23–#29 пустые состояния** — сделать ещё больше воздуха: один предмет, 40% пустоты, никаких псевдо-UI.
4. **#30–#36 миниатюры гидов** — только предметы-символы; лица и «письмена» убрать полностью.

---

## 5. Внедрение и проверка

1. Новые файлы кладутся в `assets/images/` под теми же именами; при замене сохраняйте размеры из карты зон.
2. После экспорта проверьте вес: `find assets/images -name '*.jpg' -exec stat -f%z {} \; | awk '{s+=$1} END {print s}'` — ориентир ≈ 1.2 МБ.
3. Если добавляются новые пути, внесите их в `IMAGE_ASSETS` в `sw.js`; если меняется первый экран — также в `SHELL_ASSETS`.
4. Поднимите `CACHE_NAME` и query-строки `styles.css?v=…` / `app.js?v=…` в `index.html` и `sw.js` (сейчас v66; следующая замена → v67).
5. Проверьте `node --check app.js`, `node --check sw.js`, `git diff --check`, контраст, 390/768/1440, офлайн-навигацию и переснимите `docs/screenshots/`.
