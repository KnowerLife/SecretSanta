
<div align="center">

# 🎁 SecretSanta

**Веб-приложение для организации игры «Тайный Санта» с честной жеребьёвкой, анонимным чатом, профилями участников и офлайн-поддержкой (PWA)**

[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-183B70?style=flat-square)](#офлайн-режим-и-кэширование-swjs)
[![Visuals](https://img.shields.io/badge/Visuals-v66%20Paper%20Cut--Outs-2F7A5B?style=flat-square)](#визуальная-система-и-графика-v66)
[![Status](https://img.shields.io/badge/Status-Active-FF6960?style=flat-square)](#возможности-проекта)

<a href="https://github.com/KnowerLife/SecretSanta">
  <img src="assets/images/social-cover.jpg" alt="SecretSanta — зимняя иллюстрация обмена подарками" width="720" />
</a>

</div>

---

## О проекте

**SecretSanta** — лёгкое и дружелюбное веб-приложение для проведения игры «Тайный Санта» в компании друзей, семьи или распределённой команды. Интерфейс сочетает сценарии полноценной комнаты с участниками, мгновенной быстрой жеребьёвки и демо-режима, а визуальное оформление построено вокруг мягкой зимней палитры (`#A3CEFD` / `#DCEEFF`, `#183B70`, `#FF6960`, `#2F7A5B`, тёплое золото) и матовой бумажной графики.

---

## Возможности проекта

* **Несколько форматов запуска:** полноценная игра с комнатой и ролями, быстрая жеребьёвка без лишних шагов и интерактивный демо-режим для знакомства с интерфейсом.
* **Разделение ролей и приватность:** каждый участник, Санта и организатор видит только релевантную информацию без спойлеров о парах.
* **Анонимный чат:** общение между Сантой и получателем для уточнения деталей подарка с сохранением интриги.
* **Профили и вишлисты:** подсказки о предпочтениях, идеях подарков и важных ограничениях, а также пустые состояния с пошаговыми подсказками.
* **Интерактивные гиды:** встроенный сайт-гид и гид по комнате с предметными миниатюрами.
* **Офлайн-режим и кэширование (`sw.js`):** предзагрузка оболочки и ключевых сцен первого экрана с догрузкой остальных иллюстраций по мере навигации.

---

## Визуальная система и графика (v66)

Все иллюстрации проекта хранятся в директории `assets/images/` и выполнены в едином стиле матовых бумажных вырезок и мягкой ручной печати с акцентом на «воздух» в композиции под заголовки и UI-элементы:

| Зона интерфейса | Файл | Размер |
| :--- | :--- | :--- |
| Обложка (`og:image` / `twitter:image`) | `assets/images/social-cover.jpg` | `1200×630` |
| Фон макета на первом экране | `assets/images/hero-winter-scene.jpg` | `1200×675` |
| Карточки форматов («Полная игра», «Быстрая жеребьёвка», «Посмотреть демо») | `mode-online.jpg`, `mode-quick.jpg`, `mode-demo.jpg` | `1200×800` |
| Шапки разделов и экранов (`rules`, `testimonials`, `faq`, `create`, `join`, `quick`, `privacy`, `ideas`, `cta`) | `rules-fair-draw.jpg`, `testimonials-friends.jpg`, `faq-help.jpg`, `create-game-head.jpg`, `join-game-head.jpg`, `quick-draw-head.jpg`, `privacy-who-sees.jpg`, `gift-ideas.jpg`, `cta-celebration.jpg` | `1200×675` |
| Состояния комнаты, чата, вишлиста, профиля, доступа и лога | `dashboard-empty.jpg`, `recipient-waiting.jpg`, `chat-empty.jpg`, `chat-waiting.jpg`, `profile-empty.jpg`, `wishlist-empty.jpg`, `invite-share.jpg`, `access-empty.jpg`, `activity-empty.jpg`, `audience-remote.jpg`, `feature-anonymous-chat.jpg`, `quick-draw-success.jpg` | `1200×800` / `1200×900` |
| Миниатюры сайт-гида и гида комнаты | `guide-format.jpg`, `guide-prep.jpg`, `guide-room-team.jpg`, `guide-room-wishes.jpg`, `guide-room-profile.jpg`, `guide-room-draw.jpg`, `guide-room-gift.jpg`, `step-create-game.jpg`, `step-invite-friends.jpg`, `step-draw-gifts.jpg` | `800×600` / `1200×800` |

---

## Структура репозитория

```text
SecretSanta/
├── index.html          # Разметка, meta-теги и подключение ES-модуля app.js
├── styles.css          # Темы, сетки, декоративные фоны (.section-head--art, .cta-card--art) и адаптив
├── app.js              # Тонкий bootstrap: инициализация модулей и первичный роутинг
├── sw.js               # Service Worker: кэш оболочки, модулей и ассетов
├── src/                # Прикладная логика, разбитая по ответственности
│   ├── i18n-data.js    # RU/EN-словарь
│   ├── i18n.js         # Переводы, язык и применение локализации
│   ├── theme.js        # winter / midnight / cozy
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

---

## Локальный запуск и проверка

Поскольку приложение использует Service Worker и модульную клиентскую логику, запускать его лучше через локальный HTTP-сервер (а не напрямую по `file://`):

```bash
# Клонирование репозитория
git clone https://github.com/KnowerLife/SecretSanta.git
cd SecretSanta

# Запуск локального сервера (Python 3)
python3 -m http.server 8080
```

После запуска откройте в браузере `http://localhost:8080`.

### Базовые проверки перед публикацией изменений

```bash
# Проверка синтаксиса ES-модулей, service worker и чистоты diff
for f in app.js src/*.js; do node --experimental-default-type=module --check "$f"; done
node --check sw.js
git diff --check

# Проверка суммарного веса графики (macOS / BSD stat)
find assets/images -name '*.jpg' -exec stat -f%z {} \; | awk '{s+=$1} END {print s}'
```

Начиная с v67 клиентская логика разбита на ES-модули в `src/`, а `app.js` выполняет только bootstrap. При обновлении состава файлов в `assets/images/` или `src/` не забывайте синхронизировать списки ассетов в `sw.js` и обновлять версии кэша и query-параметров (`?v=...`) в `index.html`, `app.js`, `src/` и `sw.js`.

---

## Ссылки

* Репозиторий проекта: [github.com/KnowerLife/SecretSanta](https://github.com/KnowerLife/SecretSanta)
