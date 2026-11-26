<div align="center">

# 🎁 SecretSanta

**Веб-приложение и PWA для игры «Тайный Санта»: честная серверная жеребьёвка, анонимный чат, комнаты с SSE, профили и вишлисты, RU/EN, три темы и офлайн-очередь.**

[![CI](https://github.com/KnowerLife/SecretSanta/actions/workflows/ci.yml/badge.svg)](https://github.com/KnowerLife/SecretSanta/actions/workflows/ci.yml)
[![CI v69](https://github.com/KnowerLife/SecretSanta/actions/workflows/ci-v69.yml/badge.svg)](https://github.com/KnowerLife/SecretSanta/actions/workflows/ci-v69.yml)
[![PWA Offline Ready](https://img.shields.io/badge/PWA-Offline%20Ready-183B70?style=flat-square)](#pwa--offline)
[![Visuals](https://img.shields.io/badge/Visuals-v68%20Paper%20Cut--Outs-2F7A5B?style=flat-square)](#графика-и-ассеты)
[![Architecture](https://img.shields.io/badge/ES%20modules-18%20files-FF6960?style=flat-square)](#архитектура)
[![Checks](https://img.shields.io/badge/Browser%20checks-19%20passed-183B70?style=flat-square)](#тесты--качество)
[![License: MIT](https://img.shields.io/badge/License-MIT-6B4EFF?style=flat-square)](#лицензия)

<a href="https://github.com/KnowerLife/SecretSanta">
  <img src="assets/images/social-cover.jpg" alt="SecretSanta — зимняя иллюстрация обмена подарками" width="720" />
</a>

</div>

---

## Содержание

- [О проекте](#о-проекте)
- [v69: TypeScript-стек](#v69-typescript-стек)
- [Быстрый старт](#быстрый-старт)
- [Что можно делать](#что-можно-делать)
- [Архитектура](#архитектура)
- [HTTP API](#http-api)
- [PWA и offline](#pwa--offline)
- [Локализация, темы и доступность](#локализация-темы-и-доступность)
- [Графика и ассеты](#графика-и-ассеты)
- [Тесты и качество](#тесты--качество)
- [Конфигурация](#конфигурация)
- [Переход в production](#переход-в-production)
- [Структура репозитория](#структура-репозитория)
- [Устранение проблем](#устранение-проблем)
- [Как править проект](#как-править-проект)
- [Лицензия](#лицензия)

---

## О проекте

SecretSanta — самостоятельный frontend на ES-модулях плюс лёгкий Python-бэкенд. Приложение работает в трёх режимах и одинаково хорошо подходит для компании, семьи и распределённой команды.

| Режим | Суть | Где живут данные |
| :--- | :--- | :--- |
| **Полная игра** | Комната с кодом, организатор и участники, приглашения и сессии, жеребьёвка на сервере, вишлисты, профили, чат, журнал активности | Backend API + SQLite; при недоступности сервера — `localStorage` |
| **Быстрая жеребьёвка** | Список имён → пара «Санта → получатель», персональные ссылки, копирование, CSV и печать | Локально в браузере |
| **Демо** | Готовая игра с кодом `DEMO-SANTA` для знакомства с интерфейсом без регистрации | Локально в браузере |

Ключевые принципы:

- **Приватность.** Сервер хранит все пары, но `GET /api/rooms/{code}/assignment` возвращает только назначение текущего участника. Список пар никому не отдаётся.
- **Честность.** Жеребьёвка — серверный derangement с учётом исключений; результат проверяется перед сохранением.
- **Устойчивость.** При потере сети сообщения уходят в очередь и отправляются после восстановления соединения или через Background Sync.
- **Без сборщика.** Модули подключаются напрямую через `<script type="module">`; достаточно любого статического HTTP-сервера.
- **Доступность.** Контраст ≥ 4.5:1, цели нажатия ≥ 44 px, `focus-visible`, `aria-live`, `prefers-reduced-motion`, без горизонтального overflow.

Текущая версия ассетов — **v68**: в v67 frontend разбит на 18 ES-модулей, в v68 исправлен контраст темы `cozy` и все query-версии/кэш service worker подняты до `68`.

---

## v69: TypeScript-стек

**Статус:** v69.1.0 — полный функциональный и UX-паритет с v68 в новой архитектуре. v68 сохранён как рабочий legacy-стек и эталон: старые файлы, проверки и API не удалены. Новый стек добавляет демо в один клик, локальную игру офлайн, групповые исключения, управление участниками, Web Push с напоминаниями, интерактивные гиды, перенос данных v68 и готовые Docker-артефакты.

| Слой | v68 (legacy) | v69 (релиз) |
| :--- | :--- | :--- |
| Frontend | ES-модули, `index.html`, `styles.css` | React 19 + Vite 8 (Rolldown), TanStack Start/Router/Query, Mantine 9, FSD |
| Backend | Python stdlib + SQLite | Hono 4 + TypeScript на Node.js 22 + `node:sqlite` |
| Графика | JPG/paper cut-out в `assets/images/` | 36 детерминированных SVG-сцен в `packages/art` |
| Процесс | прямые коммиты в `main` | Gitflow (`develop`, `feature/*`, `release/*`) + OpenSpec SDD |

Локальный запуск v69:

```bash
npm ci --ignore-scripts
npm run dev:api    # Hono API на http://127.0.0.1:8787
npm run dev        # SSR-приложение на http://localhost:3000
```

Проверки v69: `npm run typecheck`, `npm test`, `npm run check:i18n-unused`, `npm run build`, `npm run verify:frontend:v69:quick`, `npm run verify:frontend:v69` (включая Lighthouse для 3 тем × RU/EN), `npx openspec validate --all --strict`. Для Lighthouse runner использует Chromium Playwright через `CHROME_PATH`; переменную можно переопределить. `npm audit` пока сообщает об одной high-уязвимости в транзитивной зависимости Vite; обновление отложено до совместимого релиза.

Перенос данных v68 (источник открывается только на чтение, режим `--dry-run` не пишет целевую БД):

```bash
npm run migrate:v68 -- --dry-run
npm run migrate:v68            # копия v68 → apps/api/data/app.db
```

Запуск воркера напоминаний и production-стенда:

```bash
npm run worker --workspace @secret-santa/api
cp .env.example .env
docker compose -f docker-compose.v69.yml up --build
```

Подробности — [`apps/api/WORKER.md`](apps/api/WORKER.md). База нового API лежит в `apps/api/data/app.db` и отделена от `backend/data/app.db`: миграция не изменяет источник и сохраняет счётчики. Архив плана перехода и спецификации хранятся в [`openspec/changes/archive/2026-11-26-migrate-v69-ts-stack/`](openspec/changes/archive/2026-11-26-migrate-v69-ts-stack/) и `openspec/specs/`; результаты сверки — в [`docs/PARITY_v69.md`](docs/PARITY_v69.md), процесс — в [`docs/GITFLOW.md`](docs/GITFLOW.md) и [`docs/RELEASES.md`](docs/RELEASES.md).

---

## Быстрый старт

### Требования

- Python **3.9+** (в Docker и CI — 3.12), стандартной библиотеки достаточно для бэкенда.
- Node.js **20+** — только для браузерных проверок и скриншотов.
- Современный браузер с поддержкой ES-модулей и Service Worker.

### 1. Только интерфейс

Из-за ES-модулей и Service Worker нельзя открывать `index.html` через `file://`:

```bash
git clone https://github.com/KnowerLife/SecretSanta.git
cd SecretSanta
python3 -m http.server 8080
```

Откройте <http://localhost:8080>. Бэкенд не обязателен: приложение переключится в локальный режим (`localStorage`).

> Makefile-цель `make frontend` поднимает статику на порту **8766**, как и `docker-compose.yml`. Браузерный набор проверок ожидает frontend на **8080** — это разные сценарии, а не конфликт.

### 2. Полный стек локально

В двух терминалах из корня репозитория:

```bash
# Терминал 1 — frontend
python3 -m http.server 8080

# Терминал 2 — backend
PYTHONPATH=backend python3 -m app.server --host 127.0.0.1 --port 8000
```

Проверка:

```bash
curl http://127.0.0.1:8000/api/health
# {"ok":true,"time":"...","push":{...},"version":"0.2"}
```

Эквивалент через Make: `make frontend` и `make backend`. SQLite-база создаётся автоматически, миграции `backend/migrations/001..006.sql` применяются при первом подключении и учитываются в таблице `schema_migrations`.

### 3. Docker Compose

```bash
cp backend/.env.example .env   # при необходимости: задайте свой SECRET_SANTA_SECRET
make docker-up                 # или docker compose up --build
```

- Frontend: <http://localhost:8766> (смонтирован read-only, `python -m http.server 8766`).
- Backend: <http://localhost:8000>, БД в именованном volume `secretsanta_data` → `/data/app.db`.
- Остановка: `make docker-down`.

Compose читает корневой `.env` (он в `.gitignore`); минимально важны `SECRET_SANTA_SECRET` и `SECRET_SANTA_ALLOW_ORIGIN`.

---

## Что можно делать

### Полная игра

- Создать комнату: название, организатор, дата события, бюджет, тема; ответ приходит с кодом, токеном участника, invite- и session-токенами.
- Присоединиться по коду или invite-ссылке; поддерживается возобновление по member token и legacy-вход по имени.
- Просматривать участников, вишлисты, статус подарков, исключения и группы «сугроб».
- Заполнять расширенный профиль: адрес, о себе, anti-wishlist, размер, ссылки на товары, аллергии.
- Вести анонимный чат в двух каналах: «моему получателю» и «моему Санте». Сообщения привязаны к конкретному `drawRunId`; после сброса жеребьёвки удаляются.
- Приглашать через скопированную ссылку, текст или кнопки Telegram / WhatsApp / Email; просматривать и отзывать сессии, возобновлять вход по member token. Endpoint выдачи member token есть в API, но отдельной кнопки в UI пока нет.
- Следить за готовностью: счётчики участников, вишлистов и подарков, прогресс-бар и чеклист.
- Читать журнал организатора: входы, исключения, жеребьёвка, сброс, обновления профиля, сообщения.
- Получать обновления в реальном времени через SSE с replay по `Last-Event-ID`.

### Быстрая жеребьёвка

Введите имена по одному на строку — и получите:

- честное распределение без самоназначений;
- общий результат со списком пар;
- персональную ссылку для каждого участника (`#quick?gift=…`);
- кнопки копирования, экспорта CSV и печати.

### Демо

Кнопка «Посмотреть демо» создаёт локальную игру `DEMO-SANTA` и открывает дашборд со всеми панелями. Демо можно пересоздать кнопкой «Пересоздать демо».

---

## Архитектура

Клиент с v67 — тонкий `app.js` и 18 модулей в `src/`. Все внутренние импорты имеют версионированный суффикс `?v=68`.

```text
SecretSanta/
├── index.html              # Разметка 5 экранов,.meta, SVG-иконки, подключение app.js?v=68
├── styles.css?v=68         # 3 темы, сетки, адаптив, фокус и reduced motion
├── app.js?v=68             # Bootstrap: инициализация, роутинг, SW, offline flush
├── sw.js                   # Cache 'secret-santa-v68-modular', offline fallback, sync
├── manifest.webmanifest    # PWA-манифест: standalone, иконки 192/512/maskable
├── package.json            # npm-скрипты и playwright@1.55.1
├── Makefile                # frontend/backend/test/verify/smoke/docker-цели
├── src/                    # 18 ES-модулей
├── scripts/                # verify_frontend.mjs, frontend-checks/, smoke, screenshots
├── assets/images/          # 36 оптимизированных JPEG + PROMPTS.md
├── icons/                  # PNG 192/512, maskable, apple-touch, SVG
├── docs/screenshots/       # 28 скриншотов RU/EN
├── backend/                # Рабочий stdlib+SQLite бэкенд и prod_stack-каркас
└── .github/workflows/ci.yml
```

### Что делает `app.js`

Инициализирует ленивые фоны, обработчики событий и PWA-установку; навешивает переключатели языка и темы; разбирает hash (`#home`, `#create`, `#join`, `#quick`, `#dashboard`, `#join?code=…&invite=…`, `#quick?gift=…`); применяет язык и тему; проверяет доступность backend; сбрасывает офлайн-очередь и регистрирует service worker.

### Модули `src/`

| Модуль | Ответственность |
| :--- | :--- |
| `i18n-data.js` | Полный RU/EN-словарь: 458 ключей RU, 457 EN (разница — русская форма «пары») |
| `i18n.js` | Выбор языка, `data-i18n` / placeholder / aria, переключение RU ⇄ EN |
| `theme.js` | Три темы `winter` → `midnight` → `cozy`, `meta[name=theme-color]` |
| `storage.js` | `localStorage`: локальные игры, сессии комнаты, кэш чата, офлайн-очередь |
| `api.js` | HTTP-клиент, `detectBackend()`, Bearer-токены, привязка сессии к коду комнаты |
| `game.js` | Модель игры, исключения/группы, локальная и демо-жеребьёвка |
| `room.js` | Дашборд: участники, вишлисты, профиль, активность, SSE-обновления |
| `chat.js` | Анонимный чат, два канала, кэш сообщений, шаблоны |
| `guides.js` | Сайт-гид (5 шагов), гид комнаты (5 шагов), пресеты настроек |
| `quick.js` | Быстрая жеребьёвка, персональные ссылки, CSV, печать |
| `router.js` | Виды, навигация, подсказки в шапке |
| `feedback.js` | Toasts, уведомления, модальное подтверждение |
| `dates.js` | Форматирование дат и текста событий |
| `offline.js` | Офлайн-баннер, очередь сообщений, Background Sync |
| `install.js` | PWA-установка и сетевые события |
| `lazy-art.js` | Ленивые фоновые сцены через `IntersectionObserver` |
| `utils.js` | DOM/строковые утилиты, escaping, хеш-параметры |
| `wire.js` | Регистрация обработчиков форм, кнопок и клавиатуры |

### Бэкенд

Рабочий бэкенд — `backend/app/*` без внешних зависимостей:

| Файл | Роль |
| :--- | :--- |
| `server.py` | `ThreadingHTTPServer`, маршрутизация, CORS, security headers, rate limit, логирование |
| `auth.py` | Подпись и проверка токенов, сессии, invite/member токены, TTL |
| `db.py` | SQLite-подключения, автоприменение миграций |
| `draw.py` | Построение графа исключений, derangement, валидация |
| `realtime.py` | In-memory шина событий комнаты (очередь до 200) и SSE-форматирование; только один процесс |
| `push.py` | VAPID-конфигурация и отправка Web Push через `pywebpush` (если установлен) |

Фоновые задачи уже есть в репозитории:

```bash
# разовая обработка notification_jobs
python3 backend/scripts/notification_worker.py --once --limit 50

# постоянно, каждые 30 секунд
python3 backend/scripts/notification_worker.py --interval 30 --limit 50

# напоминания за 3, 1 и 0 дней до события
python3 backend/scripts/scheduler.py --once
```

Web Push пока вызывается только бэкендом: frontend не подписывается на `/api/push/*` и не отправляет уведомления напрямую.

---

## HTTP API

Базовый URL по умолчанию: `http://127.0.0.1:8000`. Большинство операций с комнатой требуют заголовок `Authorization: Bearer <token>`; исключения — публичные `/api/health`, `/api/push/config` и создание/вход в комнату. SSE использует `?token=…`, потому что `EventSource` не умеет слать кастомные заголовки.

### Система и push

| Метод | Endpoint | Назначение |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck, версия `0.2`, публичный VAPID-ключ |
| `GET` | `/api/push/config` | Публичная часть VAPID |
| `POST` | `/api/push/subscribe` | Сохранить PushSubscription |
| `POST` | `/api/push/unsubscribe` | Удалить подписку по endpoint |

### Комнаты и доступ

| Метод | Endpoint | Назначение | Доступ |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/rooms` | Создать комнату; возвращает `code`, `token`, `inviteToken`, `sessionId` | Публичный |
| `POST` | `/api/rooms/join` | Войти по `code` + `inviteToken` / `memberToken` (или по имени) | Публичный |
| `GET` | `/api/rooms/{code}` | Комната, участники, вишлисты, исключения, информация о жеребьёвке | Участник |
| `GET` | `/api/rooms/{code}/assignment` | **Только моё** назначение и профиль получателя | Участник |
| `POST` | `/api/rooms/{code}/invites` | Создать invite-токен с ролью и лимитами | Организатор |
| `POST` | `/api/rooms/{code}/member-tokens` | Выдать member token себе или другому участнику | Участник / организатор |
| `GET` | `/api/rooms/{code}/sessions` | Список сессий текущего участника | Участник |
| `POST` | `/api/rooms/{code}/sessions/revoke` | Отозвать сессию, все свои или указанную | Участник / организатор |

### Игра и данные

| Метод | Endpoint | Назначение | Доступ |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/rooms/{code}/draw` | Серверная жеребьёвка с учётом исключений | Организатор |
| `POST` | `/api/rooms/{code}/draw/reset` | Сброс жеребьёвки и связанных сообщений | Организатор |
| `POST` | `/api/rooms/{code}/exclusions` | Добавить исключение, опционально `groupName` | Организатор |
| `DELETE` | `/api/rooms/{code}/exclusions/{a}/{b}` | Удалить исключение; после жеребьёвки запрещено (`409`) | Организатор |
| `POST` | `/api/rooms/{code}/wishlist` | Добавить пожелание | Участник |
| `DELETE` | `/api/rooms/{code}/wishlist/{id}` | Удалить своё пожелание | Владелец / организатор |
| `POST` | `/api/rooms/{code}/gift-status` | Статус подготовки подарка: `none`, `idea`, `bought`, `done` | Участник |
| `POST` | `/api/rooms/{code}/profile` | Обновить расширенный профиль | Участник |
| `GET` | `/api/rooms/{code}/activity?limit=20` | Журнал событий комнаты (1–50) | Организатор |

### Realtime, чат и уведомления

| Метод | Endpoint | Назначение |
| :--- | :--- | :--- |
| `GET` | `/api/rooms/{code}/events?token=…&lastEventId=…` | SSE-поток с `id`, replay до 200 событий из `room_events`, `connected` и пингами каждые 15 с |
| `GET` | `/api/rooms/{code}/messages?channel=to_recipient\|to_santa` | История чата с текущим собеседником (до 200 сообщений) |
| `POST` | `/api/rooms/{code}/messages` | Отправить анонимное сообщение |
| `POST` | `/api/rooms/{code}/notifications` | Поставить задачу в `notification_jobs` (`202`) |
| `POST` | `/api/rooms/{code}/push/test` | Тестовая отправка Web Push подписчикам комнаты |

Ограничения и безопасность:

- rate limit: **30 запросов/мин** на IP для create/join/invites/revoke и **180 запросов/мин** для остальных маршрутов;
- `OPTIONS` на любом пути отвечает `204` для CORS-preflight;
- заголовки `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`;
- CORS-origin задаётся `SECRET_SANTA_ALLOW_ORIGIN` (по умолчанию `*` только для локальной разработки);
- сообщения ограничены 1000 символов, пожелания — 500, поля профиля — 300/800/80/500;
- токены живут `SECRET_SANTA_TOKEN_TTL` секунд (по умолчанию 7 дней).

---

## PWA и offline

<a id="pwa--offline"></a>

- `manifest.webmanifest`: `display: standalone`, `start_url: ./`, иконки `192`, `512`, `maskable` и Apple Touch.
- Кэш service worker: **`secret-santa-v68-modular`**.
- Precaching идёт только по списку `SHELL_ASSETS` (34 записи): оболочка, `styles.css`, `app.js`, все 18 модулей, манифест, 6 иконок и 5 сцен первого экрана. Массив `IMAGE_ASSETS` описывает все 36 изображений, но в precache не участвует — остальные картинки попадают в кэш при первом запросе.
- Навигация — network-first с fallback на `index.html`; остальные GET — cache-first с догрузкой в кэш. Google Fonts загружаются с внешнего домена и service worker не кешируются.
- `sync` с тегом `secret-santa-sync` просит открытый клиент сбросить очередь; при отсутствии Background Sync сброс происходит при запуске и по событию `online`.
- Очередь хранится в `secret-santa-offline-queue`; неудачные отправки получают до 10 попыток.
- Кэш чата — `secret-santa-chat-cache`, состояние игры — `secret-santa-simple-v1`.

**Важно при релизе:** при изменении `styles.css`, `app.js`, любого файла `src/` или изображений поднимите `CACHE_NAME` в `sw.js` и все `?v=…` в `index.html`, `app.js`, `src/`, иначе пользователи получат старые версии из кэша.

---

## Локализация, темы и доступность

- **Языки.** Полный словарь в `src/i18n-data.js`: 458 ключей RU и 457 EN; единственная разница — русская числовая форма `quick.resultMetaFew`. Переключатель в шапке меняет `document.documentElement.lang`, тексты, placeholders и aria-атрибуты. Браузерная проверка проверяет **325 отрендеренных элементов** на каждом языке.
- **Темы.** `winter` (голубая зима), `midnight` (тёмная ночь), `cozy` (тёплое золото). Выбор сохраняется и меняет `meta[name=theme-color]`.
- **Контраст.** После v68 все темы дают **0 предупреждений**; зелёный акцент в `cozy` усилен с 4.19:1 до 4.91:1.
- **Фокус.** `:focus-visible` с 3 px outline на ссылках, кнопках, полях, табах гида и шаблонах чата.
- **Движение.** `@media (prefers-reduced-motion: reduce)` отключает анимации.
- **Семантика.** `role="tablist"`/`tabpanel` у гидов, `aria-live` у чата, тостов, баннера и журнала, `aria-label` у иконок.
- **Вёрстка.** Проверяются ширины 390 / 768 / 1440 px и отсутствие горизонтального переполнения.
- **Lighthouse.** 12 прогонов (home/dashboard × 3 темы × RU/EN): performance / accessibility / best practices / SEO = **1.0**.

---

## Графика и ассеты

В `assets/images/` — **36 JPEG**, всего **1 223 517 байт (~1.2 МБ)**, `sRGB`, progressive, quality 74. Полный источник правды по стилю, зонам и промтам — [`assets/images/PROMPTS.md`](assets/images/PROMPTS.md).

| Группа | Файлы | Разрешение |
| :--- | :--- | :--- |
| Обложка | `social-cover.jpg` | 1200×630 |
| Первый экран и шапки разделов | `hero-winter-scene.jpg`, `rules-fair-draw.jpg`, `testimonials-friends.jpg`, `faq-help.jpg`, `create-game-head.jpg`, `join-game-head.jpg`, `quick-draw-head.jpg`, `privacy-who-sees.jpg`, `gift-ideas.jpg`, `cta-celebration.jpg`, `quick-draw-success.jpg` | 1200×675 |
| Карточки форматов и шаги | `mode-online.jpg`, `mode-quick.jpg`, `mode-demo.jpg`, `dashboard-empty.jpg`, `step-create-game.jpg`, `step-invite-friends.jpg`, `step-draw-gifts.jpg` | 1200×800 |
| Состояния | `access-empty.jpg`, `activity-empty.jpg`, `audience-remote.jpg`, `chat-empty.jpg`, `chat-waiting.jpg`, `feature-anonymous-chat.jpg`, `invite-share.jpg`, `profile-empty.jpg`, `recipient-waiting.jpg`, `wishlist-empty.jpg` | 1200×900 |
| Гиды | `guide-format.jpg`, `guide-prep.jpg`, `guide-room-team.jpg`, `guide-room-wishes.jpg`, `guide-room-profile.jpg`, `guide-room-draw.jpg`, `guide-room-gift.jpg` | 800×600 |

Фоны секций подключаются лениво: `src/lazy-art.js` ставит `--art-image` только когда блок приближается к экрану.

### Скриншоты

В `docs/screenshots/` — 28 JPEG, снятых реальным UI через `npm run screenshots`:

| Сценарий | RU | EN |
| :--- | :---: | :---: |
| Главный экран | `home-hero-ru.jpg` | `home-hero-en.jpg` |
| Сайт-гид | `guide-site-ru.jpg` | `guide-site-en.jpg` |
| Гид комнаты | `guide-room-ru.jpg` | `guide-room-en.jpg` |
| Создание игры | `create-game-ru.jpg` | `create-game-en.jpg` |
| Вход по коду | `join-game-ru.jpg` | `join-game-en.jpg` |
| Быстрая жеребьёвка | `quick-draw-ru.jpg` | `quick-draw-en.jpg` |
| Дашборд демо | `dashboard-demo-ru.jpg` | `dashboard-demo-en.jpg` |
| Чат | `chat-messages-ru.jpg` | `chat-messages-en.jpg` |
| Вишлист получателя | `recipient-wishlist-ru.jpg` | `recipient-wishlist-en.jpg` |
| Журнал активности | `activity-log-ru.jpg` | `activity-log-en.jpg` |
| Приглашение | `invite-share-ru.jpg` | `invite-share-en.jpg` |
| Установка PWA | `install-footer-ru.jpg` | `install-footer-en.jpg` |
| Тема `midnight` | `theme-midnight-ru.jpg` | — |
| Тема `cozy` | `theme-cozy-ru.jpg` | — |
| Мобильный экран | `mobile-home-ru.jpg`, `mobile-quick-ru.jpg` | — |

Переменные для пересъёмки: `SECRET_SANTA_BASE`, `SECRET_SANTA_API`, `SECRET_SANTA_SHOTS_OUT`.

---

## Тесты и качество

<a id="тесты--качество"></a>

### Локальные команды

```bash
# Бэкенд-тесты + проверка синтаксиса app.js, src/*.js и sw.js
make test

# Smoke-сценарий против запущенного backend
make smoke

# Установка зависимостей браузерных проверок (один раз)
make deps-frontend

# 18 проверок без Lighthouse
make verify-frontend-quick

# Все 19 проверок, включая 12 Lighthouse-прогонов
make verify-frontend
```

Эквиваленты npm:

```bash
npm run verify:frontend:quick
npm run verify:frontend
npm run screenshots
```

`make test` запускает 5 файлов unittest (`test_draw`, `test_security_e2e`, `test_wishlist`, `test_messages`, `test_profile_extended`) — **12 тестов** — плюс `node --input-type=module --check` для JS. Зависимость браузерного набора одна: `playwright@1.55.1`; `npm audit --audit-level=high` показывает 0 уязвимостей.

### Состав браузерного набора

<details>
<summary>19 проверок из <code>scripts/frontend-checks/</code></summary>

| Группа | Проверки |
| :--- | :--- |
| Вёрстка и UX | `spacing_probe`, `layout_probe_v46`, `states_probe_v46`, `home_compact_probe`, `ui_polish_probe`, `guide_probe`, `guide_images_probe`, `lazy_art_probe`, `images_final_probe`, `reduced_probe` |
| Локализация и PWA | `i18n`, `pwa_probe`, `install_probe` |
| Функциональность | `functional`, `quick_final_probe`, `reset_probe`, `audit`, `contrast` |
| Производительность и доступность | `lh_final` — 12 прогонов Lighthouse |

Проверки завершаются ненулевым кодом при реальной регрессии: неверном результате жеребьёвки, сломанной ссылке, отсутствии PWA-кэша, падении i18n-паритета, росте контрастных предупреждений или ухудшении Lighthouse.

</details>

Проверки ожидают:

- frontend на `http://127.0.0.1:8080/`;
- backend на `http://127.0.0.1:8000/api/health`;
- демо-код `DEMO-SANTA`.

Lighthouse запускается через `npx lighthouse@12` автоматически, отдельно ставить не нужно. Полезные переменные: `SECRET_SANTA_LH_PORT`, `SECRET_SANTA_LH_OUT`. Отчёты по умолчанию пишутся во временную директорию `secret-santa-lighthouse`. Runner отключает Playwright от CDP перед каждым прогоном — иначе Lighthouse и DevTools-клиент конкуренты за один Chrome target.

### CI

`.github/workflows/ci.yml` при push в `main` и на pull request запускает три job:

1. **test-backend** — unittest бэкенда и статические contract-тесты prod-stack.
2. **syntax-check** — Node 20, проверка всех ES-модулей и `sw.js`.
3. **frontend-checks** — Python 3.12 + Node 20, `npm ci --ignore-scripts`, `npx playwright install --with-deps chromium`, локальный frontend/backend и полный `npm run verify:frontend` (timeout 45 минут).

---

## Конфигурация

### Backend

Шаблон — [`backend/.env.example`](backend/.env.example):

| Переменная | По умолчанию | Назначение |
| :--- | :--- | :--- |
| `SECRET_SANTA_SECRET` | `dev-insecure-change-me` | Секрет подписи токенов; **обязательно сменить в проде** |
| `SECRET_SANTA_DB_PATH` | `backend/data/app.db` | Путь к SQLite-файлу |
| `SECRET_SANTA_ALLOW_ORIGIN` | `*` | Разрешённый CORS-origin |
| `SECRET_SANTA_TOKEN_TTL` | `604800` | Время жизни токена, секунды |
| `HOST` / `PORT` | `127.0.0.1` / `8000` | Адрес разработческого сервера |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | — | Web Push; без них работает заглушка |
| `SECRET_SANTA_DEBUG` | — | Подробности ошибок в ответе |

### Frontend

- Глобальная переменная `window.SECRET_SANTA_API_BASE` или `localStorage['secret-santa-api-base']` задаёт адрес API; по умолчанию `http://127.0.0.1:8000`.
- Ключи `localStorage`: `secret-santa-simple-v1`, `secret-santa-lang`, `secret-santa-theme`, `secret-santa-api-base`, `secret-santa-offline-queue`, `secret-santa-chat-cache`.
- Для диагностики можно передать `?dbg=1`, а для принудительного снимка — `?shot=…`.

---

## Переход в production

Рабочий бэкенд сегодня — stdlib + SQLite. Параллельно подготовлен, но ещё не включён в cutover каркас [`backend/prod_stack/`](backend/prod_stack/README.md):

- FastAPI, Pydantic, SQLAlchemy 2.x, Alembic;
- PostgreSQL и Redis pub/sub;
- сервисы `draw`, `notifications`, `realtime`;
- routers `rooms`, `access`, `notifications`, `events` с parity ключевых контрактов;
- polling-воркер `notification_jobs` с точками интеграции RQ/Celery;
- Alembic-миграции и helpers для переноса данных из SQLite;
- `docker-compose.yml` с `postgres`, `redis`, `api`, `worker`;
- статические тесты контрактов и безопасности.

Подробный статус — [`backend/prod_stack/MIGRATION_STATUS.md`](backend/prod_stack/MIGRATION_STATUS.md) и [`PRODUCTION_PLAN.md`](PRODUCTION_PLAN.md).

Ограничения каркаса, которые стоит знать до деплоя:

- `backend/prod_stack/docker-compose.yml` ссылается на `Dockerfile.api` и `Dockerfile.worker`, которых в репозитории нет — в текущем виде compose не соберётся.
- `migrate_sqlite_to_postgres.py` переносит 12 таблиц, но пока не переносит `wishlist_items`, `messages` и расширенные поля профиля.
- `POST /api/rooms/{code}/exclusions` объявлен и в `rooms.py`, и в `access.py`; первым зарегистрирован `rooms.py`, поэтому вариант из `access.py` затенён.
- SSE в FastAPI-каркасе читает только `?lastEventId=`, а foundation поддерживает и заголовок `Last-Event-ID`; форматы payload немного отличаются.

Что остаётся вне репозитория: реальные секреты и VAPID, HTTPS и домен, managed Postgres/Redis, деплой API/воркера/CDN, backup, Sentry/метрики, нагрузочное и security-аудирование, финальное переключение `API_BASE` и снятие с поддержки foundation.

Пример миграции данных (из каталога `backend/prod_stack/scripts`):

```bash
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/secretsanta \
SQLITE_PATH=../../data/app.db \
PYTHONPATH=.. python3 migrate_sqlite_to_postgres.py
```

---

## Структура репозитория

```text
.
├── .github/workflows/ci.yml      # 3 job: backend, syntax, frontend
├── .env.example → backend/.env.example
├── LICENSE                       # MIT, © 2026 KnowerLife
├── Makefile                      # удобные цели для разработки
├── PRODUCTION_PLAN.md            # статус этапов A–F и roadmap
├── README.md                     # этот файл
├── app.js / styles.css / index.html / sw.js / manifest.webmanifest
├── package.json / package-lock.json
├── src/                          # 18 ES-модулей frontend
├── scripts/
│   ├── verify_frontend.mjs       # раннер 19 проверок
│   ├── frontend-checks/*.mjs     # сами проверки
│   ├── capture_screenshots.mjs   # 28 скриншотов UI
│   └── smoke_e2e.py              # сквозной API-сценарий
├── assets/images/PROMPTS.md      # визуальный канон и промты
├── docs/screenshots/             # скриншоты RU/EN
├── icons/                        # иконки PWA
└── backend/
    ├── README.md                 # документация foundation
    ├── app/                      # server/auth/db/draw/realtime/push
    ├── migrations/               # 001..006 SQL
    ├── tests/                    # unit + security e2e
    ├── .env.example
    ├── Dockerfile
    ├── scripts/                  # notification_worker.py, scheduler.py
    └── prod_stack/               # FastAPI/Postgres/Redis scaffold
        ├── README.md / MIGRATION_STATUS.md
        ├── fastapi_app/, alembic/, workers/, scripts/, tests/
        ├── requirements.txt
        └── docker-compose.yml
```

Дополнительные документы: [`backend/README.md`](backend/README.md), [`backend/prod_stack/README.md`](backend/prod_stack/README.md), [`PRODUCTION_PLAN.md`](PRODUCTION_PLAN.md), [`assets/images/PROMPTS.md`](assets/images/PROMPTS.md).

---

## Устранение проблем

| Симптом | Что проверить |
| :--- | :--- |
| Старый интерфейс после обновления | Service worker отдаёт кэш: убедитесь, что `CACHE_NAME` и `?v=…` подняты до v68; в Chrome — Unregister в DevTools → Application → Service Workers |
| Frontend «не видит» backend | `curl http://127.0.0.1:8000/api/health`, затем проверьте `secret-santa-api-base` и CORS |
| Браузерные проверки не запускаются | Frontend должен быть на **8080**, backend на **8000**; зависимости — `make deps-frontend` |
| Lighthouse висит | Закройте вручную подключённые DevTools/CDP-клиенты; runner сам отключает Playwright перед прогоном |
| Сообщения не отправляются после офлайна | Проверьте `secret-santa-offline-queue`, наличие сессии комнаты и событие `online`; попыток не больше 10 |
| Порт 8766 против 8080 | `make frontend` и Docker используют 8766, проверки — 8080; задайте нужный `SECRET_SANTA_BASE` |

---

## Как править проект

1. Для v68 создайте ветку от `main`; для v69 — от `develop` (см. [`docs/GITFLOW.md`](docs/GITFLOW.md)).
2. Если меняются `assets/images/`, `styles.css`, `app.js` или `src/`, синхронизируйте списки в `sw.js` и поднимите версию везде: `index.html`, `app.js`, `src/*.js`, `sw.js`, документация (сейчас v68 → v69).
3. Прогоните:

   ```bash
   make test
   npm run verify:frontend:quick
   git diff --check
   ```

4. Перед релизом — `npm run verify:frontend` и `npm run screenshots`, если менялся UI.
5. Для v69: pushes в `feature/*` и `develop`, в `main` — только релизной/hotfix-веткой по явной просьбе владельца; CI должен быть зелёным. Для v68 сохраняется прежний порядок.

---

## Лицензия

[MIT](LICENSE) © 2026 KnowerLife.
