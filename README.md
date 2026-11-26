<div align="center">

# 🎁 SecretSanta

**Веб-приложение и PWA для организации игры «Тайный Санта» с честной жеребьёвкой, анонимным чатом, профилями участников, поддержкой RU/EN и офлайн-очередью**

[![PWA Offline Ready](https://img.shields.io/badge/PWA-Offline%20Ready-183B70?style=flat-square)](#офлайн-режим-и-кэширование-swjs)
[![Visuals](https://img.shields.io/badge/Visuals-v68%20Paper%20Cut--Outs-2F7A5B?style=flat-square)](#визуальная-система-и-графика-v68)
[![Architecture](https://img.shields.io/badge/Modules-ES%20src%2F%20%2B%2019%20Checks-FF6960?style=flat-square)](#руководство-разработчика)

<a href="https://github.com/KnowerLife/SecretSanta">
  <img src="assets/images/social-cover.jpg" alt="SecretSanta — зимняя иллюстрация обмена подарками" width="720" />
</a>

</div>

---

## О проекте

**SecretSanta** — веб-приложение (PWA) для проведения игры «Тайный Санта» в кругу друзей, семьи или распределённой команды. Проект объединяет комнаты с синхронизацией и SSE, быструю жеребьёвку с персональными ссылками и демо-режим, а визуально оформлен вокруг зимней палитры (`#A3CEFD` / `#DCEEFF`, `#183B70`, `#FF6960`, `#2F7A5B`, тёплое золото), тем `winter`, `midnight` и `cozy` и матовой графики в стиле бумажных вырезок.

---

## Иллюстрации и скриншоты

Все графические материалы хранятся в каталоге `assets/images/` в виде оптимизированных JPEG-файлов (`sRGB`, progressive, `q74`) и используются как нарисованные иллюстрации, фоны разделов (`.section-head--art`, `.cta-card--art`), карточки состояний и миниатюры гидов и шагов. Для автоматического снятия скриншотов интерфейса в репозитории предусмотрен скрипт `scripts/capture_screenshots.mjs`.

### Ключевые иллюстрации и сценарии интерфейса

| Сценарий / экран | Иллюстрация / превью | Файл в репозитории |
| :--- | :---: | :--- |
| Обложка проекта (`og:image` / `twitter:image`) | ![Обложка SecretSanta](assets/images/social-cover.jpg) | `assets/images/social-cover.jpg` |
| Главный экран / выбор формата старта | ![Главный экран](assets/images/hero-winter-scene.jpg) | `assets/images/hero-winter-scene.jpg` |
| Режим «Полная игра» (комната, участники и роли) | ![Полная игра](assets/images/mode-online.jpg) | `assets/images/mode-online.jpg` |
| Режим «Быстрая жеребьёвка» и персональные ссылки | ![Быстрая жеребьёвка](assets/images/mode-quick.jpg) | `assets/images/mode-quick.jpg` |
| Интерактивный демо-режим | ![Демо-режим](assets/images/mode-demo.jpg) | `assets/images/mode-demo.jpg` |
| Успешная жеребьёвка и распределение пар | ![Успешная жеребьёвка](assets/images/quick-draw-success.jpg) | `assets/images/quick-draw-success.jpg` |
| Анонимный чат между Сантой и получателем | ![Анонимный чат](assets/images/feature-anonymous-chat.jpg) | `assets/images/feature-anonymous-chat.jpg` |
| Подбор идей подарков и вишлист | ![Идеи подарков](assets/images/gift-ideas.jpg) | `assets/images/gift-ideas.jpg` |
| Приглашение участников в игру | ![Приглашение](assets/images/invite-share.jpg) | `assets/images/invite-share.jpg` |

### Визуальная система и графика (v68)

| Зона интерфейса | Файлы в `assets/images/` | Разрешение |
| :--- | :--- | :--- |
| Обложка и первый экран | `social-cover.jpg` (`1200×630`), `hero-winter-scene.jpg` (`1200×675`) | `1200×630` / `1200×675` |
| Карточки форматов запуска | `mode-online.jpg`, `mode-quick.jpg`, `mode-demo.jpg` | `1200×800` |
| Шапки разделов и экранов (`rules`, `testimonials`, `faq`, `create`, `join`, `quick`, `privacy`, `ideas`, `cta`) | `rules-fair-draw.jpg`, `testimonials-friends.jpg`, `faq-help.jpg`, `create-game-head.jpg`, `join-game-head.jpg`, `quick-draw-head.jpg`, `privacy-who-sees.jpg`, `gift-ideas.jpg`, `cta-celebration.jpg` | `1200×675` |
| Состояния комнаты, чата, вишлиста, профиля, доступа и активности | `dashboard-empty.jpg`, `recipient-waiting.jpg`, `chat-empty.jpg`, `chat-waiting.jpg`, `profile-empty.jpg`, `wishlist-empty.jpg`, `invite-share.jpg`, `access-empty.jpg`, `activity-empty.jpg`, `audience-remote.jpg`, `feature-anonymous-chat.jpg`, `quick-draw-success.jpg` | `1200×800` / `1200×900` |
| Миниатюры сайт-гида, гида комнаты и шагов | `guide-format.jpg`, `guide-prep.jpg`, `guide-room-team.jpg`, `guide-room-wishes.jpg`, `guide-room-profile.jpg`, `guide-room-draw.jpg`, `guide-room-gift.jpg`, `step-create-game.jpg`, `step-invite-friends.jpg`, `step-draw-gifts.jpg` | `800×600` / `1200×800` |

---

## Руководство пользователя

### Основные возможности

* **Три формата старта:** полноценная игра с комнатой, сессиями и ролями, быстрая жеребьёвка с персональными ссылками и интерактивный демо-режим для знакомства с приложением.
* **Честная жеребьёвка и правила:** учёт исключений при распределении пар, строгое разграничение ролей и приватность данных без спойлеров.
* **Анонимный чат:** переписка между Сантой и получателем для уточнения деталей подарка с сохранением интриги и автоматической постановкой сообщений в офлайн-очередь при потере связи.
* **Профили, вишлисты и идеи подарков:** заполнение пожеланий и ограничений, готовые подсказки идей и дружелюбные пустые состояния с пошаговыми действиями на всех экранах.
* **Темы оформления и языки:** переключение тем `winter`, `midnight` и `cozy`, а также мгновенная смена локализации `RU` / `EN`.
* **Гиды и PWA:** встроенный сайт-гид, гид по комнате, пресеты настроек, установка приложения на устройство и полноценная работа в офлайне.

### Как начать играть

1. Откройте приложение и выберите подходящий сценарий: **«Полная игра»**, **«Быстрая жеребьёвка»** или **«Посмотреть демо»**.
2. В полноценной игре создайте комнату или присоединитесь по приглашению, выберите язык (`RU` / `EN`) и тему оформления (`winter`, `midnight`, `cozy`), затем заполните профиль и вишлист.
3. Запустите жеребьёвку с учётом исключений, узнайте своего получателя и при необходимости уточните детали подарка в анонимном чате.
4. При потере интернета изменения и сообщения сохраняются локально и автоматически отправляются при восстановлении соединения.

---

## Руководство разработчика

### Архитектура и структура репозитория

Начиная с v67 клиентская логика вынесена в ES-модули директории `src/`, а `app.js` работает как тонкий bootstrap-слой (инициализация модулей и первичный роутинг).

```text
SecretSanta/
├── index.html          # Разметка, meta-теги и подключение ES-модуля app.js
├── styles.css          # Темы (winter / midnight / cozy), сетки, декоративные фоны и адаптив
├── app.js              # Тонкий bootstrap: инициализация модулей и первичный роутинг
├── sw.js               # Service Worker: кэш оболочки, модулей и ассетов
├── package.json        # Скрипты и dev-зависимости браузерных проверок
├── scripts/
│   ├── verify_frontend.mjs   # Запуск всех браузерных проверок
│   ├── frontend-checks/      # 19 проверок: UX, i18n, PWA, Lighthouse и др.
│   ├── capture_screenshots.mjs
│   └── smoke_e2e.py
├── src/                # Прикладная логика, разбитая по ответственности
│   ├── i18n-data.js    # RU/EN-словарь
│   ├── i18n.js         # Переводы, язык и применение локализации
│   ├── theme.js        # Темы оформления: winter / midnight / cozy
│   ├── storage.js      # localStorage: состояние, чат, офлайн-очередь
│   ├── api.js          # HTTP-клиент и сессии комнаты
│   ├── game.js         # Модель игры, исключения, жеребьёвка, демо
│   ├── room.js         # Рендер комнаты, синхронизация, SSE, доступ, активность
│   ├── chat.js         # Чат и офлайн-очередь сообщений
│   ├── guides.js       # Сайт-гид, гид комнаты, пресеты
│   ├── quick.js        # Быстрая жеребьёвка и персональные ссылки
│   ├── router.js       # Виды и навигация
│   ├── feedback.js     # Toasts, уведомления, модальное подтверждение
│   ├── dates.js        # Форматирование дат и текста событий
│   ├── offline.js      # Офлайн-баннер и отправка очереди
│   ├── install.js      # PWA-установка и сетевые события
│   ├── lazy-art.js     # Ленивые фоновые сцены через IntersectionObserver
│   ├── utils.js        # DOM/строковые утилиты
│   └── wire.js         # Регистрация обработчиков событий
└── assets/
    └── images/         # Набор оптимизированных JPEG-иллюстраций (sRGB, progressive, q74)
```

### Офлайн-режим и кэширование (`sw.js`)

* Service Worker кэширует оболочку приложения, модули и ключевые ассеты, а фоновые сцены догружаются лениво через `IntersectionObserver` (`src/lazy-art.js`) по мере навигации.
* В релизе v68 исправлен контраст темы `cozy` и все query-версии и кэш приведены к версии `68`.
* При обновлении файлов в `assets/images/`, `styles.css` или `src/` синхронизируйте списки ассетов в `sw.js` и обновляйте версии кэша и query-параметры (`?v=...`) в `index.html`, `app.js`, `src/` и `sw.js`.

### Локальный запуск

Из-за работы Service Worker и ES-модулей запускайте проект через локальный HTTP-сервер, а не по `file://`:

```bash
# Клонирование репозитория
git clone https://github.com/KnowerLife/SecretSanta.git
cd SecretSanta

# Запуск локального веб-сервера на порту 8080
python3 -m http.server 8080
```

После запуска откройте `http://localhost:8080`.

### Проверки и тесты

Перед публикацией изменений выполните базовые проверки синтаксиса ES-модулей, чистоты `diff` и суммарного веса графики:

```bash
# Проверка синтаксиса ES-модулей, service worker и чистоты diff
for f in app.js src/*.js; do node --input-type=module --check < "$f"; done
node --check sw.js
git diff --check

# Проверка суммарного веса графики (macOS / BSD stat)
find assets/images -name '*.jpg' -exec stat -f%z {} \; | awk '{s+=$1} END {print s}'
```

Для автоматизированных браузерных проверок используется набор из 19 тестов в `scripts/frontend-checks/` (запуск через `scripts/verify_frontend.mjs`), который ожидает frontend на `127.0.0.1:8080` и backend на `127.0.0.1:8000`. В CI полный набор выполняется в job `frontend-checks`.

```bash
# Установка зависимостей и браузера Playwright (один раз)
make deps-frontend

# Быстрый прогон без Lighthouse
make verify-frontend-quick

# Полный прогон, включая 12 запусков Lighthouse
make verify-frontend
```

Эквивалентные npm-команды — `npm run verify:frontend:quick` и `npm run verify:frontend`. Проверки завершаются с ошибкой при падении i18n-паритета, вёрстки, PWA/offline, контраста (`<4.5:1`) и показателей Lighthouse (`npx lighthouse@12` запускается автоматически; при необходимости задаются `SECRET_SANTA_LH_PORT` и `SECRET_SANTA_LH_OUT`). Для сквозных и скриншотных сценариев также доступны `scripts/capture_screenshots.mjs` и `scripts/smoke_e2e.py`.

---

## Ссылки

* Репозиторий проекта: [github.com/KnowerLife/SecretSanta](https://github.com/KnowerLife/SecretSanta)
