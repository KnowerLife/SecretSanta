# Тайный Санта / Secret Santa

Веб-приложение для организации обмена подарками: создание комнаты, вход по коду, сбор пожеланий, честная жеребьёвка, приватный результат и анонимный чат. Интерфейс bilingual (**RU / EN**), темы `winter`, `midnight`, `cozy`, PWA с офлайн-очередью сообщений.

> Frontend полностью статический и может работать без backend — состояние хранится в `localStorage`. При доступном backend включается онлайн-режим: синхронизация комнаты, SSE-события, серверная жеребьёвка, чат и журнал действий.

---

## Скриншоты

Все изображения сгенерированы из реальных UI-сценариев через Playwright (`scripts/capture_screenshots.mjs`), а не являются макетами. Снимки сделаны после жеребьёвки, отправки сообщений и открытия служебных панелей.

### Основной поток — RU

| | |
|---|---|
| ![Главная: hero и режимы игры](docs/screenshots/home-hero-ru.jpg) **Главная** — компактный вход: интерактивный гид, три формата игры и свёрнутые подробности. Меньше прокрутки, та же праздничная графика. | ![Создание игры](docs/screenshots/create-game-ru.jpg) **Создание игры** — заполненная форма: название, организатор, дата, бюджет и тема. Поля проходят клиентскую проверку до отправки. |
| ![Вход по коду](docs/screenshots/join-game-ru.jpg) **Вход по коду** — участник вводит код комнаты и имя; аккаунт и email не нужны. | ![Дашборд демо-игры](docs/screenshots/dashboard-demo-ru.jpg) **Комната после жеребьёвки** — демо-комната `DEMO-SANTA`, компактная шапка, вкладки разделов, получатель, статус, вишлист и чат. |
| ![Интерактивная инструкция на сайте](docs/screenshots/guide-site-ru.jpg) **Инструкция на сайте** — пять шагов с подсказками и кнопками перехода к созданию, входу и демо. | ![План в комнате](docs/screenshots/guide-room-ru.jpg) **План в комнате** — выполненные шаги отмечены, текущий шаг ведёт к нужному блоку. |
| ![Панель приглашения](docs/screenshots/invite-share-ru.jpg) **Приглашения** — сгенерированный текст, invite-ссылка и кнопки Telegram / WhatsApp / Email. | ![Пожелания получателя](docs/screenshots/recipient-wishlist-ru.jpg) **Пожелания получателя** — wishlist и профиль видны только после раскрытия назначения. |
| ![Анонимный чат](docs/screenshots/chat-messages-ru.jpg) **Анонимный чат** — сообщение отправлено через backend, доступны быстрые шаблоны и две вкладки адресатов. | ![Журнал событий](docs/screenshots/activity-log-ru.jpg) **Журнал событий** — действия комнаты приходят через SSE и доступны организатору. |
| ![Быстрая жеребьёвка](docs/screenshots/quick-draw-ru.jpg) **Быстрая жеребьёвка** — результат по списку имён, кнопки копирования, CSV, печати и персональной ссылки. | ![Установка PWA](docs/screenshots/install-footer-ru.jpg) **Установка PWA** — карточка в футере с подсказкой и кнопкой 44×44; в шапке появляется иконка установки. |

### Основной поток — EN

| | |
|---|---|
| ![Home hero and game modes](docs/screenshots/home-hero-en.jpg) **Home** — compact entry: interactive guide, three game modes and collapsed deep-dive sections. Less scrolling, same festive art. | ![Create game form](docs/screenshots/create-game-en.jpg) **Create game** — filled form with name, organizer, date, budget and theme. |
| ![Join by code](docs/screenshots/join-game-en.jpg) **Join by code** — room code plus name, no account or email. | ![Demo dashboard after draw](docs/screenshots/dashboard-demo-en.jpg) **Room after draw** — `DEMO-SANTA`, compact header, section tabs, recipient, status, wishes and chat. |
| ![Interactive site guide](docs/screenshots/guide-site-en.jpg) **Site guide** — five steps with tips and buttons to create, join or open the demo. | ![Room game plan](docs/screenshots/guide-room-en.jpg) **Room game plan** — completed steps are marked and the current one points to the right block. |
| ![Invite panel](docs/screenshots/invite-share-en.jpg) **Invitations** — generated text, invite link and Telegram / WhatsApp / Email actions. | ![Recipient wishlist](docs/screenshots/recipient-wishlist-en.jpg) **Recipient wishes** — wishlist and profile become visible only after the reveal. |
| ![Anonymous chat](docs/screenshots/chat-messages-en.jpg) **Anonymous chat** — a message delivered through the backend, with templates and two recipient tabs. | ![Activity log](docs/screenshots/activity-log-en.jpg) **Activity log** — SSE-driven room events for the organizer. |
| ![Quick draw result](docs/screenshots/quick-draw-en.jpg) **Quick draw** — name-based draw with copy, CSV, print and personal-link actions. | ![PWA install card](docs/screenshots/install-footer-en.jpg) **PWA install** — footer card with a hint and a 44×44 button; the header icon appears when install is available. |

### Дополнительные состояния

| | |
|---|---|
| ![Тема midnight](docs/screenshots/theme-midnight-ru.jpg) **Midnight** — тёмная тема с сохранением выбора в `localStorage`. | ![Тема cozy](docs/screenshots/theme-cozy-ru.jpg) **Cozy** — тёплая тема; токены переключаются без смены компонентов. |
| ![Мобильная главная](docs/screenshots/mobile-home-ru.jpg) **390 px** — мобильная главная: безопасные отступы, горизонтальная навигация и stacking hero. | ![Мобильная быстрая жеребьёвка](docs/screenshots/mobile-quick-ru.jpg) **390 px** — результат быстрой жеребьёвки без горизонтального переполнения. |

---

## Возможности

- **Два режима работы** — локальный `localStorage` fallback и онлайн-режим с backend.
- **Комната без хаоса** — компактная шапка и три вкладки: «Обзор», «Участники», «Доступ».
- **Интерактивный гид** — пошаговый план на сайте и в комнате: подсказки, переходы к нужному блоку и отметка выполненных шагов.
- **Готовые подсказки** — чипы с идеями для вишлиста и списком «что не дарить» добавляются в один клик.
- **Создание комнаты** — название, организатор, дата обмена, бюджет и тема.
- **Вход по коду** — участники присоединяются по `SANTA-XXXX` или invite-ссылке, без регистрации.
- **Демо-игра** — готовые участники, пожелания и жеребьёвка; демо можно пересоздать или сбросить.
- **Честная жеребьёвка** — перестановка без самоназначений; поддерживает исключения и группы «сугроб».
- **Быстрая жеребьёвка** — roster из имён, персональные ссылки, CSV и печать; без комнаты и регистрации.
- **Приватность назначения** — получатель скрыт до явного нажатия «Показать, кому я дарю».
- **Профиль и wishlist** — адрес, интересы, анти-пожелания, размер, ссылки и аллергии.
- **Анонимный чат** — две вкладки (получатель / Санта), шаблоны сообщений, кеш и офлайн-очередь.
- **Приглашения** — текст, invite-ссылка и шеринг в Telegram / WhatsApp / Email.
- **Доступ и сессии** — список активных сессий, отзыв, member-tokens.
- **Журнал событий** — история ключевых действий комнаты для организатора.
- **Темы и языки** — `winter` / `midnight` / `cozy`, RU / EN, выбор сохраняется локально.
- **PWA** — manifest, service worker, 192/512/maskable/Apple icons, offline-навигация, install-карточка.
- **Доступность** — контраст текста ≥ 4.5:1, цели касания 44 px, видимый фокус, `prefers-reduced-motion`, без горизонтального скролла.

---

## Архитектура

```text
index.html ──┬─> styles.css            дизайн-токены, темы, компоненты, адаптив
             ├─> app.js                State, i18n, роутинг хеша, API/SSE, PWA UI
             │      ├─> localStorage   state, язык, тема, чат, offline-queue
             │      └─> fetch/SSE ───> backend/app/server.py ─> SQLite
             └─> sw.js                 cache shell + 5 критичных сцен + иконки, остальные 31 — по запросу

backend/app/
  server.py      HTTP API, SSE, CORS, rate limit, auth
  db.py          SQLite connections and migrations
  auth.py        token / session helpers
  draw.py        derangement draw
  realtime.py    pub/sub for SSE
  push.py        Web Push scaffold
```

Поток онлайн-игры:

1. Frontend проверяет `GET /api/health` (таймаут 1.8 с). При успехе `apiState.online = true`.
2. `POST /api/rooms` создаёт комнату; `POST /api/rooms/join` добавляет участников по invite-token.
3. `POST /api/rooms/{code}/draw` запускает серверную жеребьёвку; assignment запрашивается отдельно через `GET .../assignment`.
4. `GET .../events` держит SSE-соединение; события обновляютParticipants / chat / activity без polling.
5. При офлайне сообщения складываются в `secret-santa-offline-queue` и отправляются после события `online`.

---

## Быстрый запуск

### Вариант A — frontend + backend (рекомендуется)

```bash
git clone <repository-url>
cd SecretSanta

# Терминал 1: API
PYTHONPATH=backend python3 -m app.server --host 127.0.0.1 --port 8000

# Терминал 2: статический frontend
python3 -m http.server 8080
```

Откройте `http://127.0.0.1:8080/`. Frontend автоматически найдёт backend на `http://127.0.0.1:8000`.

### Вариант B — только frontend

```bash
python3 -m http.server 8080
```

Подходит для демо и офлайна: данные остаются в браузере, серверные функции (чат, SSE, журнал) недоступны.

### Вариант C — Docker Compose

```bash
docker compose up --build
```

- Frontend: `http://localhost:8766`
- Backend: `http://localhost:8000`
- SQLite volume: `secretsanta_data`

### Make-команды

```bash
make frontend      # static server on :8766
make backend       # foundation API on :8000
make test          # backend unittest + node --check
make smoke         # scripts/smoke_e2e.py
make screenshots   # regenerate docs/screenshots (needs playwright + servers)
make docker-up
make docker-down
```

---

## Конфигурация

### Backend

См. [`backend/.env.example`](backend/.env.example):

| Переменная | Назначение |
|---|---|
| `SECRET_SANTA_SECRET` | Секрет подписи токенов; в production обязательно заменить. |
| `SECRET_SANTA_DB_PATH` | Путь к SQLite-файлу. |
| `SECRET_SANTA_ALLOW_ORIGIN` | Разрешённый CORS origin. |
| `SECRET_SANTA_TOKEN_TTL` | TTL токена доступа. |
| `VAPID_*` | Опциональные ключи Web Push. |

### Frontend

API base можно переопределить до загрузки `app.js`:

```html
<script>window.SECRET_SANTA_API_BASE = 'http://127.0.0.1:8000';</script>
```

или через `localStorage.setItem('secret-santa-api-base', 'http://127.0.0.1:8000')`.

Локальные ключи:

| Key | Содержимое |
|---|---|
| `secret-santa-simple-v1` | Основное состояние: комнаты, участники, wishlist, assignment, демо. |
| `secret-santa-theme` | `winter` / `midnight` / `cozy`. |
| `secret-santa-lang` | `ru` / `en`. |
| `secret-santa-api-base` | Адрес backend. |
| `secret-santa-chat-cache` | Последние сообщения по комнатам. |
| `secret-santa-offline-queue` | Неотправленные сообщения. |

---

## HTTP API (foundation backend)

| Группа | Endpoints |
|---|---|
| Health / push config | `GET /api/health`, `GET /api/push/config`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe` |
| Rooms | `POST /api/rooms`, `POST /api/rooms/join`, `GET /api/rooms/{code}` |
| Draw | `POST /api/rooms/{code}/draw`, `POST /api/rooms/{code}/draw/reset`, `GET /api/rooms/{code}/assignment` |
| Members & access | `POST /api/rooms/{code}/member-tokens`, `GET /api/rooms/{code}/sessions`, `POST /api/rooms/{code}/sessions/revoke`, `POST /api/rooms/{code}/invites` |
| Gifts | `POST /api/rooms/{code}/wishlist`, `DELETE /api/rooms/{code}/wishlist/{id}`, `POST /api/rooms/{code}/gift-status`, `POST /api/rooms/{code}/profile` |
| Rules | `POST /api/rooms/{code}/exclusions`, `DELETE /api/rooms/{code}/exclusions/{a}/{b}` |
| Chat & events | `GET/POST /api/rooms/{code}/messages?channel=to_recipient\|to_santa`, `GET /api/rooms/{code}/events` (SSE) |
| Ops | `GET /api/rooms/{code}/activity`, `POST /api/rooms/{code}/notifications`, `POST /api/rooms/{code}/push/test` |

Все защищённые методы ожидают `Authorization: Bearer <token>`; SSE передаёт токен в query-параметре `token`, потому что `EventSource` не поддерживает заголовки.

---

## PWA и офлайн

- `manifest.webmanifest`: standalone display, `name`/`short_name`, `theme_color`, 192/512/maskable и Apple touch icon.
- `sw.js`: `CACHE_NAME = 'secret-santa-v66-art'`; в `install` попадают HTML, CSS, JS, manifest, иконки и 5 сцен первого экрана. Остальные 31 сцена кешируются при первом появлении на экране (см. `IMAGE_ASSETS`), поэтому стартовый запрос заметно легче.
- При изменении любого ассета поднимите версию в `CACHE_NAME` и в query-строках `styles.css?v=…` / `app.js?v=…` в `index.html` и `sw.js`.
- Офлайн-навигация отдаёт закешированный shell; недоступные API-запросы не ломают интерфейс.
- Установка: `beforeinstallprompt` → кнопка в шапке и карточка футера; `appinstalled` скрывает кнопки и показывает статус. На iOS показывается инструкция «Поделиться → На главный экран».

---

## Изображения

Промты, точные пути, размеры, alt-текст и точки вставки описаны в [`assets/images/PROMPTS.md`](assets/images/PROMPTS.md). Подключены все 36 сцен: hero, шаги, режимы, заголовки секций и страниц, пустые состояния, CTA, чат, приглашения, быстрая жеребьёвка и социальный превью. Все JPG прошли пакетную оптимизацию (`strip`, sRGB, progressive, quality 74): 3.8 МБ → 1.2 МБ. Фоновые сцены секций подключаются через `IntersectionObserver` по мере приближения к экрану, hero остаётся на первом экране: начальный набор изображений главной — около 163 КБ вместо ~936 КБ. Глобальный фотобой не используется: фон страницы — CSS-снег и градиенты, изображения живут в `article`/`section`-блоках и защищены токеном `--surface-soft`.

---

## Разработка и проверки

```bash
# Syntax
node --check app.js && node --check sw.js

# Backend tests
PYTHONPATH=backend python3 -m unittest discover -s backend/tests -p 'test_*.py'
python3 -m unittest discover -s backend/prod_stack/tests -p 'test*.py'

# End-to-end smoke
python3 scripts/smoke_e2e.py
```

Что проверяется в UI: контраст текста, размеры целей 44 px, фокус только при `:focus-visible`, reduced motion, отсутствие горизонтального overflow на 390 / 768 / 1440 px, одинаковая высота карточек в сетках, загрузка всех изображений и офлайн-навигация.

### Регенерация скриншотов

```bash
npm i --no-save playwright && npx playwright install chromium

# Терминалы 1 и 2: frontend :8080 и backend :8000 (см. Быстрый запуск)
node scripts/capture_screenshots.mjs
```

Скрипт очищает `docs/screenshots/*.jpg` и создаёт 28 новых снимков из сценариев. Для кастомных адресов используйте `SECRET_SANTA_BASE` и `SECRET_SANTA_API`.

---

## Структура проекта

```text
.
├── index.html                  Разметка экранов, иконки, i18n-атрибуты
├── styles.css                  Токены, темы, компоненты, responsive
├── app.js                      UI, state, i18n, API/SSE, localStorage, install flow
├── sw.js                       Service Worker и offline cache
├── manifest.webmanifest        PWA manifest
├── docker-compose.yml          Локальный frontend + backend
├── Makefile                    Короткие команды запуска и тестов
├── scripts/
│   ├── smoke_e2e.py            Backend smoke-тест
│   └── capture_screenshots.mjs Генерация скриншотов README
├── assets/images/              36 JPG-сцен + PROMPTS.md
├── icons/                      192/512/maskable/Apple icons
├── docs/screenshots/           28 актуальных скриншотов
├── backend/
│   ├── app/                    Foundation API: server/db/auth/draw/realtime/push
│   ├── migrations/             SQL миграции SQLite
│   ├── tests/                  unittest
│   ├── prod_stack/             FastAPI + Postgres + Redis scaffold
│   ├── scripts/                notification worker, scheduler
│   └── .env.example
├── PRODUCTION_PLAN.md          Что осталось до production cutover
└── .github/workflows/ci.yml    CI: backend tests + JS syntax check
```

## Технологии

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, PWA, Manrope 400/500/600/700/800, hash-роутинг, CSS custom properties.
- **Backend (foundation)**: Python stdlib `http.server`, SQLite, SSE, token-based sessions, server-side derangement draw.
- **Prod stack (scaffold)**: FastAPI, PostgreSQL, SQLAlchemy/Alembic, Redis, worker / notifications.
- **CI**: GitHub Actions — backend unittest + syntax check.

## Production status

Реализовано и проверено локально: локальный режим, foundation API, server-side draw, приватный assignment, wishlist/profile, exclusions/groups, чат, SSE, activity log, invites/sessions, PWA/offline, bilingual UI и три темы.

Остаётся для полноценного production: реальная инфраструктура Postgres/Redis, deploy worker/SMTP/Sentry, HTTPS/domain и secrets, бэкапы и алерты, e2e-тесты против prod stack и финальный cutover. Детали — в [`PRODUCTION_PLAN.md`](PRODUCTION_PLAN.md).

## Лицензия

MIT, см. [LICENSE](LICENSE).

---

# Secret Santa / Тайный Санта (English)

A web app for running a Secret Santa exchange: create a room, join by code, collect wishes, run a fair draw, reveal only your own recipient and chat anonymously. The UI is bilingual (**RU / EN**) with `winter`, `midnight` and `cozy` themes and a PWA with an offline message queue.

> The frontend is fully static and works without a backend via `localStorage`. With the backend available it switches to online mode: room sync, SSE events, server-side draw, chat and activity log.

## Screenshots

All screenshots are generated from real Playwright scenarios (`scripts/capture_screenshots.mjs`), not mockups. They capture post-draw, sent-message and opened-panel states.

### Main flow — EN

| | |
|---|---|
| ![Home hero and game modes](docs/screenshots/home-hero-en.jpg) **Home** — compact entry: interactive guide, three game modes and collapsed deep-dive sections. | ![Create game](docs/screenshots/create-game-en.jpg) **Create game** — filled form with name, organizer, date, budget and theme. |
| ![Join by code](docs/screenshots/join-game-en.jpg) **Join by code** — room code and name, no account or email. | ![Dashboard after draw](docs/screenshots/dashboard-demo-en.jpg) **Room after draw** — `DEMO-SANTA`, compact header, section tabs, recipient, status, wishes and chat. |
| ![Interactive site guide](docs/screenshots/guide-site-en.jpg) **Site guide** — five steps with tips and buttons to create, join or open the demo. | ![Room game plan](docs/screenshots/guide-room-en.jpg) **Room game plan** — completed steps are marked and the current one points to the right block. |
| ![Invite panel](docs/screenshots/invite-share-en.jpg) **Invitations** — generated text, invite link and Telegram / WhatsApp / Email share actions. | ![Recipient wishlist](docs/screenshots/recipient-wishlist-en.jpg) **Recipient wishes** — wishlist and profile appear only after the reveal. |
| ![Anonymous chat](docs/screenshots/chat-messages-en.jpg) **Anonymous chat** — delivered message, reply templates and two recipient tabs. | ![Activity log](docs/screenshots/activity-log-en.jpg) **Activity log** — SSE-driven organizer events. |
| ![Quick draw result](docs/screenshots/quick-draw-en.jpg) **Quick draw** — name-based result with copy, CSV, print and personal-link actions. | ![PWA install card](docs/screenshots/install-footer-en.jpg) **PWA install** — footer hint plus 44×44 button; the header icon appears when install is available. |

### Additional states

| | |
|---|---|
| ![Midnight theme](docs/screenshots/theme-midnight-ru.jpg) **Midnight** — dark theme persisted in `localStorage`. | ![Cozy theme](docs/screenshots/theme-cozy-ru.jpg) **Cozy** — warm theme, same components and tokens. |
| ![Mobile home](docs/screenshots/mobile-home-ru.jpg) **390 px** — safe areas, scrollable nav and stacked hero. | ![Mobile quick draw](docs/screenshots/mobile-quick-ru.jpg) **390 px** — quick draw result without horizontal overflow. |

## Features

- **Two runtime modes** — local `localStorage` fallback and online backend mode.
- **Calm room workspace** — compact header and three sections: Overview, People and Access.
- **Interactive guide** — a step-by-step plan on the site and in the room, with tips, jump-to controls and completed-step tracking.
- **Ready-made suggestions** — one-tap chips for wishlist ideas and a “better not gift” list.
- **Room setup** — name, organizer, exchange date, budget and theme.
- **Join by code** — `SANTA-XXXX` or invite link, no registration.
- **Demo game** — seeded participants, wishes and draw; resettable.
- **Fair draw** — derangement, exclusions and snowdrift groups.
- **Quick draw** — roster-only draw with personal links, CSV and print.
- **Private assignment** — hidden until the organizer/participant reveals it.
- **Profile & wishlist** — address, interests, anti-wishes, size, links and allergies.
- **Anonymous chat** — recipient/Santa tabs, templates, cache and offline queue.
- **Invitations** — generated text, invite link and Telegram / WhatsApp / Email.
- **Access & sessions** — active sessions, revocation and member tokens.
- **Activity log** — key room events for the organizer.
- **Themes & languages** — winter/midnight/cozy, RU/EN, saved locally.
- **PWA** — manifest, service worker, 192/512/maskable/Apple icons, offline navigation and install card.
- **Accessibility** — ≥ 4.5:1 text contrast, 44 px targets, focus-visible, reduced motion, no horizontal overflow.

## Architecture

```text
index.html ──┬─> styles.css        design tokens, themes, components, responsive
             ├─> app.js            state, i18n, hash routing, API/SSE, PWA UI
             │      ├─> localStorage
             │      └─> fetch/SSE ─> backend/app/server.py ─> SQLite
             └─> sw.js             shell cache + 5 critical images + icons, 31 on demand
```

Flow: `/api/health` detection → `POST /api/rooms` → `POST /api/rooms/join` → `POST /api/rooms/{code}/draw` → `GET .../assignment`; SSE `GET .../events` refreshes participants, chat and activity. Offline chat messages are queued in `secret-santa-offline-queue` and flushed on `online`.

## Quick start

```bash
# Frontend + backend
PYTHONPATH=backend python3 -m app.server --host 127.0.0.1 --port 8000
python3 -m http.server 8080
# open http://127.0.0.1:8080/

# Frontend only
python3 -m http.server 8080

# Docker
docker compose up --build
# frontend :8766, backend :8000
```

Useful targets: `make frontend`, `make backend`, `make test`, `make smoke`, `make screenshots`, `make docker-up`, `make docker-down`.

## Configuration and storage

Backend env is documented in [`backend/.env.example`](backend/.env.example): `SECRET_SANTA_SECRET`, `SECRET_SANTA_DB_PATH`, `SECRET_SANTA_ALLOW_ORIGIN`, `SECRET_SANTA_TOKEN_TTL`, `VAPID_*`.

Frontend API base can be overridden with `window.SECRET_SANTA_API_BASE` or `localStorage.setItem('secret-santa-api-base', ...)`. Local keys: `secret-santa-simple-v1`, `secret-santa-theme`, `secret-santa-lang`, `secret-santa-api-base`, `secret-santa-chat-cache`, `secret-santa-offline-queue`.

## HTTP API (foundation)

- Health/push: `GET /api/health`, `GET /api/push/config`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe`.
- Rooms: `POST /api/rooms`, `POST /api/rooms/join`, `GET /api/rooms/{code}`.
- Draw: `POST /api/rooms/{code}/draw`, `/draw/reset`, `GET /api/rooms/{code}/assignment`.
- Gifts: `POST/DELETE /api/rooms/{code}/wishlist`, `POST .../gift-status`, `POST .../profile`.
- Rules: `POST/DELETE /api/rooms/{code}/exclusions`.
- Chat/events: `GET/POST /api/rooms/{code}/messages?channel=to_recipient|to_santa`, `GET /api/rooms/{code}/events` (SSE).
- Ops: `GET /api/rooms/{code}/activity`, `POST .../notifications`, `POST .../push/test`.

Protected routes use `Authorization: Bearer <token>`; SSE sends the token via the `token` query parameter.

## PWA, images and verification

`sw.js` uses `secret-santa-v66-art`. The install step caches the shell, icons and 5 above-the-fold images; the remaining 31 images are cached on first use. All 36 JPGs are stripped, progressive and compressed to quality 74 (3.8 MB → 1.2 MB), and decorative section backgrounds are attached by `IntersectionObserver`: the home page now starts with ~163 KB of images instead of ~936 KB. Bump the cache name and `?v=` query strings in `index.html`/`sw.js` whenever assets change. Image prompts, paths, sizes, alt text and insertion points live in [`assets/images/PROMPTS.md`](assets/images/PROMPTS.md).

Checks:

```bash
node --check app.js && node --check sw.js
PYTHONPATH=backend python3 -m unittest discover -s backend/tests -p 'test_*.py'
python3 scripts/smoke_e2e.py
node scripts/capture_screenshots.mjs   # needs playwright + running frontend/backend
```

Screenshot regeneration requires Playwright (`npm i --no-save playwright && npx playwright install chromium`) and both local servers; optional `SECRET_SANTA_BASE`/`SECRET_SANTA_API` override URLs. The script replaces all 28 JPGs in `docs/screenshots/`.

## Production status

Local mode, foundation API, server-side draw, private assignment, wishes/profile, exclusions/groups, chat, SSE, activity log, invites/sessions, PWA/offline, bilingual UI and three themes are implemented and verified. Remaining work: Postgres/Redis infrastructure, worker/SMTP/Sentry deployment, HTTPS/domain/secrets, backups and alerts, prod-stack e2e and final cutover — see [`PRODUCTION_PLAN.md`](PRODUCTION_PLAN.md).

## License

MIT — see [LICENSE](LICENSE).
