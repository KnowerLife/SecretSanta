# Промты и план иллюстраций SecretSanta (v48)

Это не просто список идей, а карта внедрения: у каждой картинки есть **имя файла**, **путь в проекте**, **место в интерфейсе**, **размер**, **alt-текст** и готовый сниппет вставки.

## Общие правила для всех изображений

- **Формат:** JPEG (`.jpg`), sRGB, quality 82–90. Без alpha-канала и прозрачности.
- **Вид:** полностью непрозрачная, самодостаточная сцена. Изображения не рассчитаны на наложение слоёв друг на друга.
- **Стиль:** современный уютный праздник, мягкий свет, чистые формы, дружелюбное настроение, без визуального шума.
- **Палитра:** зимнее небо `#A3CEFD` / `#DCEEFF`, снежный белый, тёмно-синий `#183B70`, кораллово-красный `#FF6960`, хвойный зелёный `#2F7A5B`, тёплое золото.
- **Запрещено:** текст, буквы, имена, логотипы, водяные знаки, UI-элементы, скриншоты, читаемые наклейки, крупные лица, агрессивные или страшные образы.
- **Композиция:** оставлять воздух вокруг главного объекта; главное — настроение, а не детализация ради детализации.
- **Для `<img>` всегда добавлять** `loading="lazy" decoding="async" onerror="this.hidden=true"`, чтобы при отсутствии файла оставался аккуратный градиентный фон.
- **Для CSS-фонов** сначала указывать градиент-fallback, затем `url(...)`.
- После добавления новых файлов нужно добавить их пути в `sw.js` → `ASSETS` и поднять версию кэша.

## Карта файлов

| # | Имя файла | Путь | Куда вставляем | Размер | Статус |
|---|-----------|------|----------------|--------|--------|
| 1 | `hero-winter-scene.jpg` | `assets/images/hero-winter-scene.jpg` | Фон под кнопкой-макетом героя: `.hero-preview::before` | 1600×900 | ✅ подключён |
| 2 | `step-create-game.jpg` | `assets/images/step-create-game.jpg` | Карточка «Создайте игру» | 1200×800 | ✅ подключён |
| 3 | `step-invite-friends.jpg` | `assets/images/step-invite-friends.jpg` | Карточка «Соберите участников» | 1200×800 | ✅ подключён |
| 4 | `step-draw-gifts.jpg` | `assets/images/step-draw-gifts.jpg` | Карточка «Проведите жеребьёвку» | 1200×800 | ✅ подключён |
| 5 | `dashboard-empty.jpg` | `assets/images/dashboard-empty.jpg` | Пустое состояние «Моя игра» | 1200×800 | ✅ подключён |
| 6 | `audience-remote.jpg` | `assets/images/audience-remote.jpg` | Иллюстрация в шапке секции «Для любой компании» (`.art-audience`) | 1200×900 | ✅ подключён |
| 7 | `feature-anonymous-chat.jpg` | `assets/images/feature-anonymous-chat.jpg` | Иллюстрация в шапке секции «Почему это удобно» (`.art-chat`) | 1200×900 | ✅ подключён |
| 8 | `privacy-who-sees.jpg` | `assets/images/privacy-who-sees.jpg` | Иллюстрация в шапке секции «Кто что видит» (`.art-privacy`) | 1600×900 | ✅ подключён |
| 9 | `gift-ideas.jpg` | `assets/images/gift-ideas.jpg` | Иллюстрация в шапке секции «Идеи для вдохновения» (`.art-ideas`) | 1600×900 | ✅ подключён |
| 10 | `cta-celebration.jpg` | `assets/images/cta-celebration.jpg` | Фон финального CTA-блока (`.cta-card--art`) | 1600×900 | ✅ подключён |
| 11 | `chat-empty.jpg` | `assets/images/chat-empty.jpg` | Пустое состояние чата (`.card-media--chat`) | 1200×900 | ✅ подключён |
| 12 | `quick-draw-success.jpg` | `assets/images/quick-draw-success.jpg` | Верх блока результата быстрой жеребьёвки (`.card-media--quick`) | 1200×675 | ✅ подключён |
| 13 | `social-cover.jpg` | `assets/images/social-cover.jpg` | `og:image` / `twitter:image` в `<head>` | 1200×630 | ✅ подключён |

---

## 1. Главная зимняя сцена — `hero-winter-scene.jpg`

- **Путь:** `assets/images/hero-winter-scene.jpg`
- **Где используется:** уже подключён как мягкий тематический фон за макетом комнаты в герое: `styles.css` → `.hero-preview::before`. Сверху идёт полупрозрачная вуаль `--hero-veil-1 / --hero-veil-2`, поэтому картинка не спорит с текстом и работает во всех трёх темах.
- **Размер:** 1600×900, 16:9.
- **Alt:** декоративное, `aria-hidden` не требуется, так как фон CSS.

**Промт (RU):**

> Уютная новогодняя зимняя иллюстрация-пейзаж, полностью непрозрачное изображение, без прозрачности и альфа-канала, цельная готовая сцена. Тихий снежный вечер, мягкое голубое зимнее небо, лёгкий снегопад, заснеженные ёлки, несколько небольших домиков с тёплым светом в окнах вдали, аккуратно упакованные подарочные коробки на снегу на переднем плане. Палитра: светло-голубой, снежно-белый, тёмно-синий, акценты кораллово-красного, хвойный зелёный, тёплый золотой свет. Современный чистый праздничный стиль, мягкий свет, дружелюбное спокойное настроение, детализированно, но без перегруза. Композиция оставляет воздух в верхней средней части. Без текста, логотипов, водяных знаков, людей крупным планом, UI, прозрачного фона и вырезанных объектов.

**Prompt (EN):**

> Cozy winter holiday landscape illustration, fully opaque single complete scene, no transparency, no alpha channel. Peaceful snowy evening, soft blue winter sky, gentle snowfall, snow-covered pine trees, a few small houses with warm glowing windows in the distance, neatly wrapped gifts in the foreground snow. Palette: light sky blue, snowy white, deep navy, coral red accents, pine green, warm gold. Modern clean festive style, soft light, friendly calm mood, detailed but not cluttered, breathing space in the upper middle. No text, logos, watermark, close-up faces, UI, transparent background or cutout objects.

---

## 2. Шаг 1 — создание игры — `step-create-game.jpg`

- **Путь:** `assets/images/step-create-game.jpg`
- **Где используется:** `<div class="media-frame media-frame--step">` в первой карточке `.steps-grid`.
- **Размер:** 1200×800, 3:2.
- **Alt:** декоративное (`alt=""`), подпись есть в тексте карточки.

**Промт (RU):**

> Уютная праздничная иллюстрация, полностью непрозрачное изображение, цельная сцена. Тёплая новогодняя сцена на столе: простая карточка-приглашение на обмен подарками, красная подарочная коробка с лентой, небольшой блокнот и веточка ели. Мягкий зимний дневной свет, светло-голубые и кремовые тона, спокойное праздничное настроение. Палитра: снежно-белый, кремовый, тёмно-синий, кораллово-красный, хвойный зелёный, мягкое золото. Современный чистый стиль с лёгкой глубиной. Без текста, букв, логотипов, водяных знаков, UI, прозрачного фона и вырезанных объектов.

**Prompt (EN):**

> Cozy festive illustration, fully opaque complete scene, no transparency. Warm holiday desk with a simple invitation card for a gift exchange, a red gift box with ribbon, a small notepad and a pine branch. Soft winter daylight, light blue and cream tones, calm festive mood. Snowy white, cream, deep navy, coral red, pine green, soft gold. Modern clean style with gentle depth. No readable text, letters, logos, watermark, UI, transparent background or cutout elements.

---

## 3. Шаг 2 — приглашение участников — `step-invite-friends.jpg`

- **Путь:** `assets/images/step-invite-friends.jpg`
- **Где используется:** `<div class="media-frame media-frame--step">` во второй карточке `.steps-grid`.
- **Размер:** 1200×800, 3:2.
- **Alt:** декоративное (`alt=""`).

**Промт (RU):**

> Уютная зимняя праздничная иллюстрация, полностью непрозрачное изображение, цельная сцена. Несколько праздничных конвертов и подарочных бирок вокруг центральной карточки-приглашения, небольшие снежинки-декор, еловые веточки и тёплая кружка какао рядом. Сцена передаёт ощущение, что друзья собираются в игру Тайный Санта. Мягкий зимний свет, чистая композиция, тёплое дружелюбное настроение. Палитра: светло-голубой, белый, кремовый, кораллово-красный, хвойный зелёный, тёмно-синий, мягкое золото. Без читаемого текста, логотипов, водяных знаков, UI, людей, прозрачного фона и вырезанных объектов.

**Prompt (EN):**

> Cozy winter holiday illustration, fully opaque complete scene, no transparency. Festive envelopes and gift tags arranged around a central invitation card, small snowflake decorations, pine twigs and a warm cup of cocoa nearby. The scene suggests friends joining a Secret Santa game. Soft natural winter light, clean composition, warm friendly mood. Light sky blue, white, cream, coral red, pine green, deep navy, soft gold. No readable text, logos, watermark, UI, people, transparent background or cutout objects.

---

## 4. Шаг 3 — жеребьёвка — `step-draw-gifts.jpg`

- **Путь:** `assets/images/step-draw-gifts.jpg`
- **Где используется:** `<div class="media-frame media-frame--step">` в третьей карточке `.steps-grid`.
- **Размер:** 1200×800, 3:2.
- **Alt:** декоративное (`alt=""`).

**Промт (RU):**

> Праздничная зимняя иллюстрация, полностью непрозрачное изображение, цельная сцена. Волшебный, но простой момент жеребьёвки Тайного Санты: декоративная праздничная коробка, рядом сложенные карточки с именами, вокруг упакованные подарки, ленты и мягкие золотые огоньки. Уютная зимняя атмосфера, чистый фон в светло-голубых и снежно-белых тонах. Палитра: светло-голубой, снежно-белый, кораллово-красный, тёмно-синий, хвойный зелёный, тёплое золото. Современный дружелюбный стиль, аккуратно и спокойно. Без читаемых имён, логотипов, водяных знаков, UI, прозрачного фона и вырезанных объектов.

**Prompt (EN):**

> Festive winter illustration, fully opaque complete scene, no transparency. A magical but simple Secret Santa draw moment: decorative holiday box with folded name cards beside it, wrapped gifts, ribbons and soft golden fairy lights around it. Cozy winter atmosphere, clean light blue and snow-white background. Light sky blue, snow white, coral red, deep navy, pine green, warm gold. Modern friendly polished style, calm and uncluttered. No readable names, logos, watermark, UI, transparent background or cutout elements.

---

## 5. Пустое состояние дашборда — `dashboard-empty.jpg`

- **Путь:** `assets/images/dashboard-empty.jpg`
- **Где используется:** `<div class="media-frame media-frame--empty">` в `#noGame`.
- **Размер:** 1200×800, 3:2.
- **Alt:** декоративное (`alt=""`).

**Промт (RU):**

> Тёплая минималистичная новогодняя иллюстрация, полностью непрозрачное изображение, цельная сцена. Пустой, но приглашающий праздничный стол: открытая подарочная коробка, обёрточная бумага, лента, маленькая еловая веточка и мягкие тёплые огоньки гирлянды на фоне. Настроение — «пора начать игру Тайный Санта». Чистая композиция с воздухом, светлый кремово-голубой фон. Палитра: кремовый, снежно-белый, светло-голубой, кораллово-красный, хвойный зелёный, мягкое золото. Без текста, логотипов, водяных знаков, UI, людей, прозрачного фона и вырезанных объектов.

**Prompt (EN):**

> Warm minimalist winter holiday illustration, fully opaque complete scene, no transparency. Empty but inviting festive table with an open gift box, wrapping paper, ribbon, a small pine branch and soft warm fairy lights in the background. Mood: ready to start a Secret Santa game. Clean composition with breathing space, light cream and sky-blue background. Cream, snowy white, light sky blue, coral red, pine green, soft gold. No text, logos, watermark, UI, people, transparent background or cutout objects.

---

## 6. Удалённая команда — `audience-remote.jpg`

- **Путь:** `assets/images/audience-remote.jpg`
- **Где стоит:** в шапке секции «Для любой компании» — `.section-head--art.art-audience` в `index.html`. Изображение выведено правым фоном через `::before`, текст остаётся слева на `var(--surface-soft)`.
- **Размер:** 1200×900, 4:3.
- **Alt:** декоративный CSS-фон, отдельный `alt` не нужен.

**CSS:**

```css
.art-audience::before {
  background-image: linear-gradient(90deg, var(--surface-soft) 0%, transparent 32%),
                    url('assets/images/audience-remote.jpg');
}
```

**Промт (RU):**

> Уютная редакционная иллюстрация, полностью непрозрачное изображение, цельная сцена. Весёлый человек упаковывает подарок для Тайного Санты за домашним столом, на ноутбуке мягкие силуэты видеозвонка, рядом наклейка для отправки, зимний декор и кружка. Тёплая дружелюбная палитра, чистый современный стиль, без читаемого текста на наклейке. Снежно-белый, небесно-голубой, кораллово-красный, хвойный зелёный, мягкое золото. Без логотипов, водяных знаков, UI, прозрачного фона и вырезанных объектов.

**Prompt (EN):**

> Cozy editorial illustration, fully opaque complete scene, no transparency. Cheerful person packing a Secret Santa gift at a home desk, laptop showing soft silhouettes of a video call, a shipping label, winter decorations and a mug nearby. Warm friendly palette, clean modern illustration, no readable text on the label. Snowy white, sky blue, coral red, pine green, soft gold. No logos, watermark, UI, transparent background or cutout objects.

---

## 7. Анонимный чат — `feature-anonymous-chat.jpg`

- **Путь:** `assets/images/feature-anonymous-chat.jpg`
- **Где стоит:** в шапке секции «Почему это удобно» — `.section-head--art.art-chat` в `index.html`.
- **Размер:** 1200×900, 4:3.
- **Alt:** декоративный CSS-фон.

**CSS:** тот же приём, что и для `.art-audience`, с `url('assets/images/feature-anonymous-chat.jpg')`.

**Промт (RU):**

> Минималистичная современная векторная иллюстрация, полностью непрозрачное изображение, цельная сцена. Два смартфона напротив друг друга, между ними мягкие «пузыри» анонимного чата и маленькие иконки подарков, на фоне аккуратный щит и снежинка. Зимняя пастельная палитра: голубой, белый, кораллово-красный, дружелюбно и спокойно. В пузырях только абстрактные формы и иконки, без читаемого текста. Без логотипов, водяных знаков, скриншотов UI, прозрачного фона и вырезанных объектов.

**Prompt (EN):**

> Minimal modern vector illustration, fully opaque complete scene, no transparency. Two smartphones facing each other with soft anonymous chat bubbles and small gift icons between them, a gentle shield and snowflake motif in the background. Winter pastel blue, white and coral red palette, friendly and calm. Bubbles contain only abstract shapes and icons, no readable text. No logos, watermark, UI screenshots, transparent background or cutout objects.

---

## 8. Кто что видит — `privacy-who-sees.jpg`

- **Путь:** `assets/images/privacy-who-sees.jpg`
- **Где стоит:** в шапке секции «Кто что видит» — `.section-head--art.art-privacy` в `index.html`.
- **Размер:** 1600×900, 16:9.
- **Alt:** декоративный CSS-фон.

**CSS:** тот же приём, что и для `.art-audience`, с `url('assets/images/privacy-who-sees.jpg')`.

**Промт (RU):**

> Чистая концептуальная SaaS-иллюстрация, полностью непрозрачное изображение, цельная сцена. Три дружелюбные абстрактные фигуры: организатор со списком, Санта с упакованным подарком и участник с коробкой-сюрпризом; между ними мягкие полупрозрачные панели, показывающие, что каждый видит только свою часть информации. Спокойная зимняя палитра: небесно-голубой, белый, тёмно-синий, кораллово-красный, мягкое золото. Без текста, подписей, логотипов, водяных знаков, UI, прозрачного фона и вырезанных объектов.

**Prompt (EN):**

> Clean conceptual SaaS illustration, fully opaque complete scene, no transparency. Three friendly abstract silhouettes — an organizer with a checklist, a Santa with a wrapped gift, and a participant with a mystery box — separated by soft translucent panels, suggesting each role sees only its own information. Calm winter palette of sky blue, white, navy, coral red and soft gold. No text, labels, logos, watermark, UI, transparent background or cutout objects.

---

## 9. Идеи подарков — `gift-ideas.jpg`

- **Путь:** `assets/images/gift-ideas.jpg`
- **Где стоит:** в шапке секции «Идеи для вдохновения» — `.section-head--art.art-ideas` в `index.html`.
- **Размер:** 1600×900, 16:9.
- **Alt:** декоративный CSS-фон.

**CSS:** тот же приём, что и для `.art-audience`, с `url('assets/images/gift-ideas.jpg')`.

**Промт (RU):**

> Весёлая иллюстрация в стиле flat-lay, полностью непрозрачное изображение, цельная сцена. Аккуратная раскладка идей для подарков на светлом зимнем столе: керамическая кружка, сложенный плед, книга, небольшой набор для творчества, конфеты, веточка ели и лента; мягкие тени, чистые тёплые тона. Палитра: кремовый, снежно-белый, небесно-голубой, кораллово-красный, хвойный зелёный, мягкое золото. Современный чистый праздничный стиль, вдохновляюще и без перегруза. Без текста, логотипов, водяных знаков, UI, прозрачного фона и вырезанных объектов.

**Prompt (EN):**

> Cheerful flat-lay illustration, fully opaque complete scene, no transparency. Tidy arrangement of gift ideas on a light winter table: ceramic mug, folded blanket, book, small craft kit, chocolates, pine branch and ribbon, soft shadows. Cream, snowy white, sky blue, coral red, pine green, soft gold. Modern clean festive style, warm and inspiring, uncluttered. No text, logos, watermark, UI, transparent background or cutout objects.

---

## 10. Праздничный финал — `cta-celebration.jpg`

- **Путь:** `assets/images/cta-celebration.jpg`
- **Где стоит:** на финальном CTA-блоке как `.cta-card.cta-card--art`. Текст остаётся в `.cta-card__body`, фон не мешает читаемости благодаря темевой вуали.
- **Размер:** 1600×900, 16:9.
- **Alt:** декоративный CSS-фон.

**CSS:**

```css
.cta-card--art {
  background:
    linear-gradient(135deg, var(--hero-veil-1), var(--hero-veil-2)),
    url('assets/images/cta-celebration.jpg') center / cover no-repeat;
}
```

**Промт (RU):**

> Тёплая праздничная иллюстрация, полностью непрозрачное изображение, цельная сцена. Небольшой уютный стол с двумя упакованными подарками, гирляндой, ветками ели и горящим свечами, мягкий зимний свет по бокам. Ощущение радостного финала и приглашения начать игру. Много воздуха в центре для будущего текста. Палитра: кремовый, снежно-белый, голубой, кораллово-красный, хвойный зелёный, золото. Без людей крупным планом, текста, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):**

> Warm festive illustration, fully opaque complete scene, no transparency. A cozy table with two wrapped gifts, fairy lights, pine branches and small candles, soft winter glow at the edges. Feeling of a joyful finale and an invitation to start the game. Plenty of breathing space in the center for text. Cream, snowy white, sky blue, coral red, pine green, soft gold. No close-up people, text, logos, watermark, UI, transparent background or cutout objects.

---

## 11. Пустой чат — `chat-empty.jpg`

- **Путь:** `assets/images/chat-empty.jpg`
- **Где стоит:** в пустом состоянии чата — `.chat-empty > .card-media--chat`, добавляется в `app.js` при рендере `#chatMessages`.
- **Размер:** 1200×900, 4:3.
- **Alt:** пустое (`alt=""`), рядом есть текстовая подсказка.

**HTML, который создаёт `app.js`:**

```html
<div class="chat-empty">
  <div class="card-media card-media--chat">
    <img src="assets/images/chat-empty.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" />
  </div>
  <span class="muted small">Пока нет сообщений.</span>
</div>
```

**Промт (RU):**

> Минималистичная уютная иллюстрация, полностью непрозрачное изображение, цельная сцена. Два пустых мягких «пузыря» чата на зимнем фоне, между ними маленькая подарочная коробка и мягкая снежинка. Настроение ожидания тайного сообщения. Светло-голубой, белый, кремовый, кораллово-красный, мягкое золото. Без текста, букв, аватаров, логотипов, водяных знаков, UI-скриншотов, прозрачности и вырезанных объектов.

**Prompt (EN):**

> Minimal cozy illustration, fully opaque complete scene, no transparency. Two empty soft chat bubbles on a winter background, a small gift box and a gentle snowflake between them. Mood of waiting for a secret message. Light sky blue, white, cream, coral red, soft gold. No text, letters, avatars, logos, watermark, UI screenshots, transparent background or cutout objects.

---

## 12. Успешная быстрая жеребьёвка — `quick-draw-success.jpg`

- **Путь:** `assets/images/quick-draw-success.jpg`
- **Где стоит:** в начале `.quick-result-card`, над `.panel-head`, как `.card-media.card-media--quick`.
- **Размер:** 1200×675, 16:9.
- **Alt:** пустое (`alt=""`), результат продублирован текстом.

**HTML-вставка:**

```html
<div class="card-media card-media--quick">
  <img src="assets/images/quick-draw-success.jpg" alt="" width="1200" height="675" loading="lazy" decoding="async" onerror="this.hidden=true" />
</div>
```

**Промт (RU):**

> Радостная праздничная иллюстрация, полностью непрозрачное изображение, цельная сцена. Несколько аккуратно свёрнутых карточек с именами разлетаются над коробкой для жеребьёвки, вокруг маленькие подарки, ленты и мягкие золотые искры. Ощущение удачного и честного результата. Светло-голубой, белый, кораллово-красный, хвойный зелёный, золото. Без читаемых имён, текста, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):**

> Joyful festive illustration, fully opaque complete scene, no transparency. Several neatly folded name cards floating above a draw box, small gifts, ribbons and soft golden sparks around them. Feeling of a successful fair result. Light sky blue, white, coral red, pine green, soft gold. No readable names, text, logos, watermark, UI, transparent background or cutout objects.

---

## 13. Обложка для соцсетей — `social-cover.jpg`

- **Путь:** `assets/images/social-cover.jpg`
- **Где стоит:** в `<head>` `index.html`.
- **Размер:** 1200×630, 1.91:1.
- **Alt:** не нужен, это мета-изображение.

**HTML-вставка:**

```html
<meta property="og:image" content="assets/images/social-cover.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="assets/images/social-cover.jpg" />
```

**Промт (RU):**

> Широкая праздничная обложка для публикации в соцсети, полностью непрозрачное изображение, цельная сцена. Зимний вечер, ёлки, мягкие огни, несколько красиво упакованных подарков и пустое светлое место слева для будущего заголовка. Современный уютный стиль, спокойная радость, чистые цвета: небесно-голубой, белый, тёмно-синий, кораллово-красный, золото. Без текста, логотипов, водяных знаков, людей крупным планом, UI, прозрачности и вырезанных объектов.

**Prompt (EN):**

> Wide festive social preview cover, fully opaque complete scene, no transparency. Winter evening, pine trees, soft lights, several nicely wrapped gifts and empty light space on the left for a future headline. Modern cozy style, calm joy, clean palette: sky blue, white, deep navy, coral red, soft gold. No text, logos, watermark, close-up people, UI, transparent background or cutout objects.

---

## Дополнительный план: оставшиеся разделы и блоки

Все 13 изображений выше уже внедрены. Ниже — **дополнительные сцены** #14–#29: промты для оставшихся разделов и пустых состояний. Все файлы созданы и подключены.

### Политика по фонам и изображениям

- **Не добавлять** фото-фон на весь сайт, формы, дашборд и таблицы: это мешает чтению и ломает темы. Глобальный фон уже решён CSS-снегопадом `.page-bg__snow`.
- **Использовать** локальные фоны только в `.section-head--art` / `.page-head.section-head--art` — там текст защищён градиентом `var(--surface-soft)`.
- **Использовать** `.card-media` для карточек и пустых состояний. Для компактных мест нужны варианты:
  ```css
  .card-media--state { max-width: 190px; margin: 0 auto 0.75rem; aspect-ratio: 4 / 3; }
  .card-media--invite { margin: 0 0 1rem; aspect-ratio: 21 / 9; max-height: 140px; }
  ```
- **Не изображать** иконки в шапке, футере, служебных модалках подтверждения, тостах, статус-строках и списках с данными — там достаточно SVG-иконок и типографики.
- После генерации файлы кладутся в `assets/images/`, добавляются в `sw.js → ASSETS`, поднимается `CACHE_NAME` и версии `styles.css?v=…` / `app.js?v=…`.

### Таблица запланированных изображений

| # | Имя файла | Путь | Блок | Размер | Alt | Статус |
|---|-----------|------|------|--------|-----|--------|
| 14 | `mode-online.jpg` | `assets/images/mode-online.jpg` | Карточка «Полная игра» на главной | 1200×800 | `""` | ✅ подключён |
| 15 | `mode-quick.jpg` | `assets/images/mode-quick.jpg` | Карточка «Быстрая жеребьёвка» | 1200×800 | `""` | ✅ подключён |
| 16 | `mode-demo.jpg` | `assets/images/mode-demo.jpg` | Карточка «Посмотреть демо» | 1200×800 | `""` | ✅ подключён |
| 17 | `rules-fair-draw.jpg` | `assets/images/rules-fair-draw.jpg` | Шапка секции «Правила жеребьёвки» | 1600×900 | декоративный фон | ✅ подключён |
| 18 | `testimonials-friends.jpg` | `assets/images/testimonials-friends.jpg` | Шапка секции «Опыт игроков» | 1600×900 | декоративный фон | ✅ подключён |
| 19 | `faq-help.jpg` | `assets/images/faq-help.jpg` | Шапка секции «Вопросы и ответы» | 1600×900 | декоративный фон | ✅ подключён |
| 20 | `create-game-head.jpg` | `assets/images/create-game-head.jpg` | `.page-head` view «Создать игру» | 1600×900 | декоративный фон | ✅ подключён |
| 21 | `join-game-head.jpg` | `assets/images/join-game-head.jpg` | `.page-head` view «Войти в игру» | 1600×900 | декоративный фон | ✅ подключён |
| 22 | `quick-draw-head.jpg` | `assets/images/quick-draw-head.jpg` | `.section-head` view «Быстрая жеребьёвка» | 1600×900 | декоративный фон | ✅ подключён |
| 23 | `recipient-waiting.jpg` | `assets/images/recipient-waiting.jpg` | Пустое состояние «Ваш получатель» в дашборде | 1200×900 | `""` | ✅ подключён |
| 24 | `chat-waiting.jpg` | `assets/images/chat-waiting.jpg` | Чат до жеребьёвки / без доступа | 1200×900 | `""` | ✅ подключён |
| 25 | `profile-empty.jpg` | `assets/images/profile-empty.jpg` | «Получатель пока не заполнил профиль» | 1200×900 | `""` | ✅ подключён |
| 26 | `wishlist-empty.jpg` | `assets/images/wishlist-empty.jpg` | Пустой вишлист в дашборде | 1200×900 | `""` | ✅ подключён |
| 27 | `invite-share.jpg` | `assets/images/invite-share.jpg` | Панель «Приглашение» в дашборде | 1200×900 | `""` | ✅ подключён |
| 28 | `access-empty.jpg` | `assets/images/access-empty.jpg` | Пустой список серий доступа | 1200×900 | `""` | ✅ подключён |
| 29 | `activity-empty.jpg` | `assets/images/activity-empty.jpg` | Пустой лог событий | 1200×900 | `""` | ✅ подключён |

---

## 14. Полная игра — `mode-online.jpg`

- **Путь:** `assets/images/mode-online.jpg`
- **Куда:** первый `.mode-card`, сразу после `.mode-card__icon`, перед `<h3>`.
- **Размер:** 1200×800, 3:2. **Alt:** `""`.
- **Статус:** ✅ подключён.

**HTML:**

```html
<div class="card-media">
  <img src="assets/images/mode-online.jpg" alt="" width="1200" height="800" loading="lazy" decoding="async" onerror="this.hidden=true" />
</div>
```

**Промт (RU):** Уютная праздничная иллюстрация, полностью непрозрачная цельная сцена, без альфа-канала. Аккуратно организованный стол с ноутбуком, списком участников, маленькими подарками и гирляндой, мягкий зимний свет. Настроение «полноценная игра с друзьями». Палитра: небесно-голубой, белый, кремовый, кораллово-красный, хвойный зелёный, золото. Чистый современный стиль. Без текста, логотипов, водяных знаков, UI, людей крупным планом, прозрачности и вырезанных объектов.

**Prompt (EN):** Cozy festive illustration, fully opaque complete scene, no alpha. A tidy holiday desk with a laptop, participant checklist, small wrapped gifts and fairy lights, soft winter light. Mood of a full game with friends. Sky blue, white, cream, coral red, pine green, soft gold. Clean modern style. No text, logos, watermark, UI, close-up faces, transparent background or cutouts.

---

## 15. Быстрая жеребьёвка — `mode-quick.jpg`

- **Путь:** `assets/images/mode-quick.jpg`
- **Куда:** второй `.mode-card`, после иконки.
- **Размер:** 1200×800, 3:2. **Alt:** `""`. **Статус:** ✅ подключён.

**HTML:** тот же сниппет `.card-media` с `src="assets/images/mode-quick.jpg"`.

**Промт (RU):** Живая зимняя иллюстрация, полностью непрозрачная цельная сцена. Коробка для жеребьёвки, несколько сложенных карточек с именами и маленькие подарки, лёгкие золотые искры и снежинки. Ощущение мгновенного честного результата. Светло-голубой, белый, кораллово-красный, хвойный зелёный, золото. Без читаемых имён, текста, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Lively winter illustration, fully opaque complete scene. A draw box with folded name cards and small gifts, soft golden sparks and snowflakes. Feeling of an instant fair result. Light sky blue, white, coral red, pine green, soft gold. No readable names, text, logos, watermark, UI, transparent background or cutouts.

---

## 16. Демо-игра — `mode-demo.jpg`

- **Путь:** `assets/images/mode-demo.jpg`
- **Куда:** третий `.mode-card`, после иконки.
- **Размер:** 1200×800, 3:2. **Alt:** `""`. **Статус:** ✅ подключён.

**HTML:** тот же сниппет `.card-media` с `src="assets/images/mode-demo.jpg"`.

**Промт (RU):** Дружелюбная иллюстрация, полностью непрозрачная цельная сцена. Миниатюрный макет праздничной комнаты: игрушечная ёлка, коробки подарков, уютное кресло и мягкий свет — как «пример игры». Тёплые зимние тона, чистая композиция, приглашающее настроение. Без текста, логотипов, водяных знаков, UI, людей крупным планом, прозрачности и вырезанных объектов.

**Prompt (EN):** Friendly illustration, fully opaque complete scene. A miniature cozy holiday room: toy pine tree, gift boxes, a warm armchair and soft light, like a preview of a game. Warm winter palette, clean composition, inviting mood. No text, logos, watermark, UI, close-up people, transparent background or cutouts.

> После добавления трёх изображений в `.mode-card` задать одинаковую высоту: `.mode-card { min-height: 420px; }` — карточки останутся в одном ритме.

---

## 17. Честная жеребьёвка — `rules-fair-draw.jpg`

- **Путь:** `assets/images/rules-fair-draw.jpg`
- **Куда:** шапка секции «Как мы обеспечиваем честность» → добавить класс `section-head--art art-rules`.
- **Размер:** 1600×900, 16:9. **Alt:** декоративный CSS-фон. **Статус:** ✅ подключён.

**CSS:**

```css
.art-rules::before {
  background-image: linear-gradient(90deg, var(--surface-soft) 0%, transparent 32%),
                    url('assets/images/rules-fair-draw.jpg');
}
```

**Промт (RU):** Чистая концептуальная иллюстрация, полностью непрозрачная цельная сцена. Прозрачная праздничная коробка, аккуратно сложенные карточки, ленты и мягкий золотой свет; рядом_small весы и значок галочки как символ честности. Спокойная зимняя палитра, без текста и подписей. Без логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Clean conceptual illustration, fully opaque complete scene. A transparent holiday box, neatly folded cards, ribbons and soft golden light, with tiny scales and a checkmark symbolizing fairness. Calm winter palette, no text or labels. No logos, watermark, UI, transparent background or cutouts.

---

## 18. Опыт игроков — `testimonials-friends.jpg`

- **Путь:** `assets/images/testimonials-friends.jpg`
- **Куда:** шапка секции «Игры, которые запоминаются» → `section-head--art art-testimonials`.
- **Размер:** 1600×900, 16:9. **Alt:** декоративный CSS-фон. **Статус:** ✅ подключён.

**CSS:** как для `.art-rules`, с `url('assets/images/testimonials-friends.jpg')`.

**Промт (RU):** Тёплая редакционная иллюстрация, полностью непрозрачная цельная сцена. Три абстрактные дружелюбные фигуры у праздничного стола с подарками и чашками какао, мягкие огни и снежинки. Ощущение радостных отзывов и общей традиции. Без читаемого текста, крупных лиц, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Warm editorial illustration, fully opaque complete scene. Three friendly abstract silhouettes around a festive table with gifts and cocoa cups, soft lights and snowflakes. Mood of happy reviews and a shared tradition. No readable text, close-up faces, logos, watermark, UI, transparent background or cutouts.

---

## 19. Вопросы и ответы — `faq-help.jpg`

- **Путь:** `assets/images/faq-help.jpg`
- **Куда:** шапка FAQ → `section-head--art art-faq`.
- **Размер:** 1600×900, 16:9. **Alt:** декоративный CSS-фон. **Статус:** ✅ подключён.

**CSS:** как для `.art-rules`, с `url('assets/images/faq-help.jpg')`.

**Промт (RU):** Спокойная иллюстрация, полностью непрозрачная цельная сцена. Аккуратная стопка карточек-вопросов, маленький зимний колпачок, еловая веточка и мягкий золотой свет; ощущение «всё понятно и подскажем». Чистые светло-голубые и кремовые тона. Без текста, букв, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Calm illustration, fully opaque complete scene. A neat stack of question cards, a small winter hat, pine branch and soft golden light, suggesting “clear answers and help”. Clean sky-blue and cream palette. No text, letters, logos, watermark, UI, transparent background or cutouts.

---

## 20. Создание игры — `create-game-head.jpg`

- **Путь:** `assets/images/create-game-head.jpg`
- **Куда:** `.page-head` в `#view-create` → добавить `section-head--art art-create`.
- **Размер:** 1600×900, 16:9. **Alt:** декоративный CSS-фон. **Статус:** ✅ подключён.

**CSS:** как для `.art-rules`, с `url('assets/images/create-game-head.jpg')`.

**Промт (RU):** Уютная иллюстрация начала праздника, полностью непрозрачная цельная сцена. Пустой красивый блокнот, карандаш, calendars с обведённой датой, лента и маленькая ёлка на светлом столе. Настроение «только создаём игру». Светло-голубой, белый, кремовый, кораллово-красный, золото. Без текста, логотипов, водяных знаков, UI, людей, прозрачности и вырезанных объектов.

**Prompt (EN):** Cozy illustration of a holiday beginning, fully opaque complete scene. A beautiful blank notebook, pencil, calendar with a circled date, ribbon and a tiny pine tree on a light desk. Mood of just starting a game. Sky blue, white, cream, coral red, soft gold. No text, logos, watermark, UI, people, transparent background or cutouts.

---

## 21. Вход по коду — `join-game-head.jpg`

- **Путь:** `assets/images/join-game-head.jpg`
- **Куда:** `.page-head` в `#view-join` → `section-head--art art-join`.
- **Размер:** 1600×900, 16:9. **Alt:** декоративный CSS-фон. **Статус:** ✅ подключён.

**CSS:** как для `.art-rules`, с `url('assets/images/join-game-head.jpg')`.

**Промт (RU):** Дружелюбная зимняя иллюстрация, полностью непрозрачная цельная сцена. Приглашение в конверте, аккуратная карточка с абстрактными значками вместо читаемого кода, дверь с тёплым светом и еловая веточка. Настроение «вас ждут в игре». Без текста, цифр, букв, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Friendly winter illustration, fully opaque complete scene. An invitation envelope, a neat card with abstract code-like shapes instead of readable characters, a door with warm light and a pine branch. Mood of being welcomed into a game. No text, digits, letters, logos, watermark, UI, transparent background or cutouts.

---

## 22. Быстрая жеребьёвка — `quick-draw-head.jpg`

- **Путь:** `assets/images/quick-draw-head.jpg`
- **Куда:** `.section-head` в `#view-quick` → `section-head--art art-quick`.
- **Размер:** 1600×900, 16:9. **Alt:** декоративный CSS-фон. **Статус:** ✅ подключён.

**CSS:** как для `.art-rules`, с `url('assets/images/quick-draw-head.jpg')`.

**Промт (RU):** Лёгкая праздничная иллюстрация, полностью непрозрачная цельная сцена. Ряд пустых карточек, коробка для жеребьёвки, лента и мягкие снежинки; ощущение «быстро и без лишних шагов». Светло-голубой, белый, кораллово-красный, золото. Без текста, имён, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Light festive illustration, fully opaque complete scene. A row of blank cards, a draw box, ribbon and gentle snowflakes, feeling quick and simple. Sky blue, white, coral red, soft gold. No text, names, logos, watermark, UI, transparent background or cutouts.

---

## 23. Ожидание получателя — `recipient-waiting.jpg`

- **Путь:** `assets/images/recipient-waiting.jpg`
- **Куда:** пустое состояние `#myAssignment` в дашборде, перед текстом «Жеребьёвка ещё не проведена».
- **Размер:** 1200×900, 4:3. **Alt:** `""`. **Статус:** ✅ подключён.

**HTML:**

```html
<div class="card-media card-media--state">
  <img src="assets/images/recipient-waiting.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" />
</div>
```

**Промт (RU):** Минималистичная уютная иллюстрация, полностью непрозрачная цельная сцена. Закрытая подарочная коробка с лентой и маленький конвертик рядом, мягкий зимний свет и снежинки. Настроение интриги до жеребьёвки. Светло-голубой, белый, кремовый, кораллово-красный, золото. Без текста, имён, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Minimal cozy illustration, fully opaque complete scene. A closed gift box with ribbon and a small envelope beside it, soft winter light and snowflakes. Mood of anticipation before the draw. Sky blue, white, cream, coral red, soft gold. No text, names, logos, watermark, UI, transparent background or cutouts.

---

## 24. Чат ожидает — `chat-waiting.jpg`

- **Путь:** `assets/images/chat-waiting.jpg`
- **Куда:** вместо текстовых `.chat-empty` в `app.js` для состояний «до жеребьёвки» и «чат недоступен».
- **Размер:** 1200×900, 4:3. **Alt:** `""`. **Статус:** ✅ подключён.

**HTML:** `.card-media.card-media--chat` с этим `src`, рядом сохраняется текст подсказки.

**Промт (RU):** Тихая уютная иллюстрация, полностью непрозрачная цельная сцена. Два пустых мягких пузыря чата, между ними маленький замочек из льда и снежинка, быть может лёгкая лента. Настроение «сообщения появятся позже». Без текста, аватаров, логотипов, водяных знаков, UI-скриншотов, прозрачности и вырезанных объектов.

**Prompt (EN):** Quiet cozy illustration, fully opaque complete scene. Two empty soft chat bubbles, a tiny ice lock and a snowflake between them, with a gentle ribbon. Mood of messages coming later. No text, avatars, logos, watermark, UI screenshots, transparent background or cutouts.

---

## 25. Профиль получателя пуст — `profile-empty.jpg`

- **Путь:** `assets/images/profile-empty.jpg`
- **Куда:** рядом с `#recipientProfileEmpty`, перед текстом «Получатель пока не заполнил профиль».
- **Размер:** 1200×900, 4:3. **Alt:** `""`. **Статус:** ✅ подключён.

**HTML:** `.card-media.card-media--state` с этим `src`.

**Промт (RU):** Аккуратная иллюстрация, полностью непрозрачная цельная сцена. Пустой блокнот с закладкой, карандаш и маленькая коробка на зимнем столе, лёгкий снег за окном. Настроение «профиль ещё заполняется». Светло-голубой, белый, кремовый, золото. Без текста, логотипов, водяных знаков, UI, людей, прозрачности и вырезанных объектов.

**Prompt (EN):** Tidy illustration, fully opaque complete scene. An empty notebook with a bookmark, pencil and a small box on a winter desk, gentle snow outside. Mood of a profile still being filled. Sky blue, white, cream, soft gold. No text, logos, watermark, UI, people, transparent background or cutouts.

---

## 26. Пустой вишлист — `wishlist-empty.jpg`

- **Путь:** `assets/images/wishlist-empty.jpg`
- **Куда:** пустое состояние `#myWishlist` в дашборде.
- **Размер:** 1200×900, 4:3. **Alt:** `""`. **Статус:** ✅ подключён.

**HTML:** `.card-media.card-media--state` с этим `src`, рядом сохраняется текст подсказки.

**Промт (RU):** Минималистичная иллюстрация, полностью непрозрачная цельная сцена. Чистый блокнот со списком пустых строк, карандаш, маленькая иконка подарка и еловая веточка. Ощущение «пора добавить идеи». Светло-голубой, белый, кремовый, кораллово-красный. Без текста, букв, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Minimal illustration, fully opaque complete scene. A clean notepad with blank lines, pencil, a small gift icon and a pine branch. Feeling of “time to add ideas”. Sky blue, white, cream, coral red. No text, letters, logos, watermark, UI, transparent background or cutouts.

---

## 27. Приглашение — `invite-share.jpg`

- **Путь:** `assets/images/invite-share.jpg`
- **Куда:** в панели приглашения в дашборде, перед `#inviteText`.
- **Размер:** 1200×900, 4:3. **Alt:** `""`. **Статус:** ✅ подключён.

**HTML:**

```html
<div class="card-media card-media--invite">
  <img src="assets/images/invite-share.jpg" alt="" width="1200" height="900" loading="lazy" decoding="async" onerror="this.hidden=true" />
</div>
```

**Промт (RU):** Радостная иллюстрация, полностью непрозрачная цельная сцена. Конверт с красной лентой, маленькие иконки мессенджеров в виде абстрактных пузырей, подарок и снежинки. Ощущение «пригласи друзей по ссылке». Без читаемого текста, логотипов брендов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Joyful illustration, fully opaque complete scene. An envelope with a red ribbon, small abstract message bubbles, a gift and snowflakes. Feeling of inviting friends by link. No readable text, brand logos, watermark, UI, transparent background or cutouts.

---

## 28. Нет серий доступа — `access-empty.jpg`

- **Путь:** `assets/images/access-empty.jpg`
- **Куда:** пустой список `#sessionsList` / статус «нет access-серий» в дашборде.
- **Размер:** 1200×900, 4:3. **Alt:** `""`. **Статус:** ✅ подключён.

**HTML:** `.card-media.card-media--state` с этим `src`.

**Промт (RU):** Аккуратная иллюстрация, полностью непрозрачная цельная сцена. Небольшая стопка пустых карточек доступа, мягкий символ ключа в виде ленты и зимний декор. Настроение «пока нет активных доступов». Светло-голубой, белый, кремовый, золото. Без текста, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Tidy illustration, fully opaque complete scene. A small stack of blank access cards, a soft ribbon key symbol and winter decor. Mood of no active sessions yet. Sky blue, white, cream, soft gold. No text, logos, watermark, UI, transparent background or cutouts.

---

## 29. Пустой лог событий — `activity-empty.jpg`

- **Путь:** `assets/images/activity-empty.jpg`
- **Куда:** пустое состояние `#activityList`.
- **Размер:** 1200×900, 4:3. **Alt:** `""`. **Статус:** ✅ подключён.

**HTML:** `.card-media.card-media--state` с этим `src`.

**Промт (RU):** Спокойная иллюстрация, полностью непрозрачная цельная сцена. Пустой свиток-журнал, маленькие часы, карандаш и еловая веточка на светлом зимнем столе. Настроение «история событий скоро появится». Без текста, логотипов, водяных знаков, UI, прозрачности и вырезанных объектов.

**Prompt (EN):** Calm illustration, fully opaque complete scene. An empty journal scroll, small clock, pencil and pine branch on a light winter desk. Mood of activity history coming soon. No text, logos, watermark, UI, transparent background or cutouts.

---

### Блоки, где изображения сознательно не добавляются

| Блок | Почему без изображения |
|------|------------------------|
| Глобальный фон страниц | Уже есть анимированный CSS-снег и мягкие градиенты; фото утяжелит и испортит контраст |
| Шапка и навигация | Достаточно логотипа-значка и типографики; изображение мешает быстрому поиску |
| Формы создания/входа/вишлиста | Изображения вокруг полей отвлекают; оформление сделано карточками и отступами |
| Статус-панели, прогресс, чек-листы, списки участников | Это данные; фото снижает читаемость |
| Модальное подтверждение и тосты | Короткие служебные состояния, важна скорость и ясность |
| Футер | Уже есть фирменный знак; достаточно текста и ссылок |

---

## Итоговая последовательность внедрения

1. Первые 13 изображений уже лежат в `assets/images/` и вставлены: hero, шаги, пустой дашборд, шапки секций, CTA, чат, быстрая жеребьёвка, соцобложка. Их промты нужны только для перегенерации/замены.
2. Изображения #14–#29 тоже лежат в `assets/images/` и вставлены: карточки форматов, шапки оставшихся секций и views, пустые состояния дашборда, чат и панель приглашения.
3. Все 29 путей добавлены в `sw.js → ASSETS`; `CACHE_NAME` и версии `styles.css?v=…` / `app.js?v=…` подняты до v58.
4. Проверка: `node --check app.js`, `node --check sw.js`, `git diff --check`, аудиты контраста, адаптивности и состояний.
5. Скриншоты в `docs/screenshots/` переснимаются после внедрения всех 29 изображений.
