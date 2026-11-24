# Промты для графики Secret Santa

Эти изображения заложены в дизайн сайта как опциональные иллюстрации. Дизайн работает и без них, но с ними интерфейс станет более живым и праздничным.

## Важные требования ко всем изображениям

- **Без прозрачности.** Никакого alpha-канала, прозрачного фона, вырезанных объектов или PNG-прозрачности. Каждый файл — полностью непрозрачное изображение.
- **Без расчёта на слои.** Изображения нельзя накладывать друг на друга. Каждая картинка должна быть самодостаточной готовой сценой/иллюстрацией.
- **Формат:** JPEG (`.jpg`), sRGB, качественное сжатие без артефактов.
- **Стиль:** тёплый новогодний, уютный, современный, чистый, дружелюбный; мягкий свет, аккуратные детали, без визуального шума.
- **Палитра:** зимнее небо (#A3CEFD / #DCEEFF), снежный белый, тёмно-синий (#183B70), кораллово-красный акцент (#FF6960), хвойный зелёный (#2F7A5B), тёплое золото.
- **Без текста, логотипов, водяных знаков и UI-элементов** внутри изображения.
- **Без страшных, агрессивных, кислотных или перегруженных элементов.**

---

## 1. Главная сцена героя

- **Путь в проекте:** `assets/images/hero-winter-scene.jpg`
- **Имя файла:** `hero-winter-scene.jpg`
- **Где используется:** главный экран (hero-секция) на главной странице.
- **Размер:** 1600×900 px (16:9), горизонтальное.
- **Как размещается:** изображение занимает отдельный блок/область, обрезается по краям контейнера (`object-fit: cover`). Никакого текста поверх картинки не накладывается.

**Prompt (EN):**

> Cozy winter holiday landscape illustration, full-bleed opaque image, no transparency, no alpha channel, solid complete scene. A peaceful snowy evening village scene with soft blue winter sky, gentle snowfall, snow-covered pine trees, a few small warm glowing houses in the distance, and neatly wrapped gift boxes in the foreground snow. Color palette: light sky blue, snowy white, deep navy blue, warm coral red accents, pine green, soft golden warm lights. Modern clean festive illustration style, soft lighting, friendly and calm mood, high detail but not cluttered. Composition leaves visual breathing space in the upper middle area, but the whole image remains a complete finished artwork. No text, no logos, no watermark, no characters faces close-up, no UI, no transparent background, no cutout objects, no layered elements.

**Промт (RU, альтернативный):**

> Уютная новогодняя зимняя иллюстрация-пейзаж, полностью непрозрачное изображение, без прозрачности, без альфа-канала, цельная готовая сцена. Тихий снежный вечер, мягкое голубое зимнее небо, лёгкий снегопад, заснеженные ёлки, несколько небольших домиков с тёплым светом в окнах вдали, аккуратно упакованные подарочные коробки на снегу на переднем плане. Палитра: светло-голубой, снежно-белый, тёмно-синий, акценты кораллово-красного, хвойный зелёный, тёплый золотой свет. Современный чистый праздничный стиль, мягкий свет, дружелюбное спокойное настроение, детализированно, но без перегруза. Без текста, без логотипов, без водяных знаков, без людей крупным планом, без UI, без прозрачного фона, без вырезанных объектов, без расчёта на слои.

---

## 2. Шаг 1 — Создание игры

- **Путь в проекте:** `assets/images/step-create-game.jpg`
- **Имя файла:** `step-create-game.jpg`
- **Где используется:** карточка шага «Создайте игру» на главной странице.
- **Размер:** 1200×800 px (3:2), горизонтальное.
- **Как размещается:** прямоугольное изображение внутри карточки, скруглённые углы у контейнера, без наложения текста поверх.

**Prompt (EN):**

> Cozy festive illustration, full-bleed opaque image, no transparency, no alpha channel, solid complete scene. A warm holiday desk scene showing a simple invitation card for a gift exchange, a red gift box with a ribbon, a small notepad, and a pine branch decoration on a clean light table. Soft winter daylight, light blue and cream background tones, subtle festive mood. Color palette: snowy white, cream, deep navy, coral red, pine green, soft gold. Modern clean flat-ish illustration with gentle depth, friendly and simple. No text, no letters, no logos, no watermark, no UI, no transparent background, no cutout elements, no layered composition.

**Промт (RU, альтернативный):**

> Уютная праздничная иллюстрация, полностью непрозрачное изображение, без прозрачности, без альфа-канала, цельная сцена. Тёплая новогодняя сцена на столе: простая карточка-приглашение на обмен подарками, красная подарочная коробка с лентой, небольшой блокнот и веточка ели. Мягкий зимний дневной свет, светло-голубые и кремовые тона, спокойное праздничное настроение. Палитра: снежно-белый, кремовый, тёмно-синий, кораллово-красный, хвойный зелёный, мягкое золото. Современный чистый стиль с лёгкой глубиной, дружелюбно и просто. Без текста, без букв, без логотипов, без водяных знаков, без UI, без прозрачного фона, без вырезанных объектов.

---

## 3. Шаг 2 — Приглашение участников

- **Путь в проекте:** `assets/images/step-invite-friends.jpg`
- **Имя файла:** `step-invite-friends.jpg`
- **Где используется:** карточка шага «Соберите участников» на главной странице.
- **Размер:** 1200×800 px (3:2), горизонтальное.
- **Как размещается:** прямоугольное изображение внутри карточки, без наложения текста поверх.

**Prompt (EN):**

> Cozy winter holiday illustration, full-bleed opaque image, no transparency, no alpha channel, solid complete scene. A group of festive envelopes and gift tags arranged around a central invitation card, with small snowflake decorations, pine twigs, and a warm cup of cocoa nearby. The scene suggests friends joining a Secret Santa game. Soft natural winter light, clean composition, warm and friendly mood. Color palette: light sky blue, white, cream, coral red, pine green, deep navy, soft gold. Modern clean illustration style, minimal clutter. No text, no readable letters, no logos, no watermark, no UI, no people, no transparent background, no cutout objects, no layered design.

**Промт (RU, альтернативный):**

> Уютная зимняя праздничная иллюстрация, полностью непрозрачное изображение, без прозрачности, без альфа-канала, цельная сцена. Несколько праздничных конвертов и подарочных бирок вокруг центральной карточки-приглашения, небольшие снежинки-декор, еловые веточки и тёплая кружка какао рядом. Сцена передаёт ощущение, что друзья собираются в игру Тайный Санта. Мягкий зимний свет, чистая композиция, тёплое дружелюбное настроение. Палитра: светло-голубой, белый, кремовый, кораллово-красный, хвойный зелёный, тёмно-синий, мягкое золото. Современный чистый стиль, без перегруза. Без текста, без читаемых букв, без логотипов, без водяных знаков, без UI, без людей, без прозрачного фона, без вырезанных объектов.

---

## 4. Шаг 3 — Жеребьёвка и подарок

- **Путь в проекте:** `assets/images/step-draw-gifts.jpg`
- **Имя файла:** `step-draw-gifts.jpg`
- **Где используется:** карточка шага «Проведите жеребьёвку» на главной странице.
- **Размер:** 1200×800 px (3:2), горизонтальное.
- **Как размещается:** прямоугольное изображение внутри карточки, без наложения текста поверх.

**Prompt (EN):**

> Festive winter illustration, full-bleed opaque image, no transparency, no alpha channel, solid complete scene. A magical but simple Secret Santa draw moment: a decorative holiday box with folded name cards beside it, surrounded by wrapped gifts, ribbons, and soft sparkling golden lights. Cozy winter atmosphere, clean background in light blue and snow white tones. Color palette: light sky blue, snow white, coral red, deep navy, pine green, warm gold. Modern friendly illustration style, polished and calm, no clutter. No text, no readable names, no logos, no watermark, no UI, no transparent background, no cutout elements, no layered composition.

**Промт (RU, альтернативный):**

> Праздничная зимняя иллюстрация, полностью непрозрачное изображение, без прозрачности, без альфа-канала, цельная сцена. Волшебный, но простой момент жеребьёвки Тайного Санты: декоративная праздничная коробка, рядом сложенные карточки с именами, вокруг упакованные подарки, ленты и мягкие золотые огоньки. Уютная зимняя атмосфера, чистый фон в светло-голубых и снежно-белых тонах. Палитра: светло-голубой, снежно-белый, кораллово-красный, тёмно-синий, хвойный зелёный, тёплое золото. Современный дружелюбный стиль, аккуратно и спокойно, без перегруза. Без текста, без читаемых имён, без логотипов, без водяных знаков, без UI, без прозрачного фона, без вырезанных объектов.

---

## 5. Пустое состояние дашборда

- **Путь в проекте:** `assets/images/dashboard-empty.jpg`
- **Имя файла:** `dashboard-empty.jpg`
- **Где используется:** экран «Моя игра», когда у пользователя ещё нет активной игры.
- **Размер:** 1200×800 px (3:2), горизонтальное.
- **Как размещается:** прямоугольная иллюстрация в пустом состоянии, без наложения текста поверх.

**Prompt (EN):**

> Warm minimalist winter holiday illustration, full-bleed opaque image, no transparency, no alpha channel, solid complete scene. An empty but inviting festive table with an open gift box, wrapping paper, ribbon, a small pine branch, and soft warm fairy lights in the background. The mood suggests "ready to start a Secret Santa game". Clean composition with plenty of breathing space, light cream and sky blue background. Color palette: cream, snowy white, light sky blue, coral red, pine green, soft gold. Modern clean illustration, cozy and welcoming, no clutter. No text, no logos, no watermark, no UI, no people, no transparent background, no cutout objects, no layered design.

**Промт (RU, альтернативный):**

> Тёплая минималистичная новогодняя иллюстрация, полностью непрозрачное изображение, без прозрачности, без альфа-канала, цельная сцена. Пустой, но приглашающий праздничный стол: открытая подарочная коробка, обёрточная бумага, лента, маленькая еловая веточка и мягкие тёплые огоньки гирлянды на фоне. Настроение — «пора начать игру Тайный Санта». Чистая композиция с воздухом, светлый кремово-голубой фон. Палитра: кремовый, снежно-белый, светло-голубой, кораллово-красный, хвойный зелёный, мягкое золото. Современный чистый стиль, уютно и приветливо, без перегруза. Без текста, без логотипов, без водяных знаков, без UI, без людей, без прозрачного фона, без вырезанных объектов.

---

## Рекомендация по использованию в коде

В HTML/CSS использовать пути вида `assets/images/<имя>.jpg`. Для `<img>` добавить `onerror="this.hidden=true"`, чтобы при отсутствии файла макет оставался аккуратным. Для CSS-фонов использовать fallback-цвет/градиент перед `url(...)`.
