<div align="center">

# 🎁 SecretSanta

**PWA для игры «Тайный Санта»: честная серверная жеребьёвка, анонимный чат, комнаты с SSE, вишлисты, RU/EN, три темы и офлайн-режим.**

[![CI v69](https://github.com/KnowerLife/SecretSanta/actions/workflows/ci-v69.yml/badge.svg)](https://github.com/KnowerLife/SecretSanta/actions/workflows/ci-v69.yml)
[![PWA Offline Ready](https://img.shields.io/badge/PWA-Offline%20Ready-183B70?style=flat-square)](#pwa--offline)
[![License: MIT](https://img.shields.io/badge/License-MIT-6B4EFF?style=flat-square)](#лицензия)

</div>

## Содержание

- [О проекте](#о-проекте)
- [Быстрый старт](#быстрый-старт)
- [Что можно делать](#что-можно-делать)
- [Архитектура](#архитектура)
- [HTTP API](#http-api)
- [PWA и offline](#pwa--offline)
- [Локализация, темы и доступность](#локализация-темы-и-доступность)
- [Графика](#графика)
- [Тесты и качество](#тесты-и-качество)
- [Конфигурация](#конфигурация)
- [Production и откат](#production-и-откат)
- [Структура репозитория](#структура-репозитория)
- [Устранение проблем](#устранение-проблем)
- [Лицензия](#лицензия)

## О проекте

В репозитории живёт только актуальный стек v69: TanStack Start + React + Mantine (SSR), Hono API, SQLite, SSE и Web Push. React Query синхронизирует состояние комнаты, а Redis Pub/Sub при `REDIS_URL` соединяет несколько процессов API.

Приложение работает без регистрации: комната создаётся по коду, participants подключаются по ссылке или коду. Назначение получателя раскрывается только явным действием участника и никогда не попадает в SSR-разметку или публичные SSE-кадры.

## Быстрый старт

Требуются Node.js `>=22.20.0` и npm. Для production-стека — Docker с Compose.

```bash
npm ci
cp .env.example .env
# Задайте SECRET_SANTA_SECRET (минимум 32 символа) и при необходимости VAPID-ключи
npm run dev       # SSR на http://127.0.0.1:3000
npm run dev:api   # API на http://127.0.0.1:8787
```

Полный стек с API, SSR, воркером и Redis:

```bash
docker compose -f docker-compose.v69.yml up --build
```

Проверка готовности: `curl -fsS http://127.0.0.1:8787/api/health` и `curl -fsS http://127.0.0.1:3000/api/health`.

## Что можно делать

- **Полная игра.** Создать комнату, пригласить участников, исключить пары, провести жеребьёвку, открыть назначение, обменяться сообщениями и пожеланиями.
- **Быстрая жеребьёвка.** `/quick-draw` раздаёт пары локально в браузере без сервера и регистрации.
- **Демо.** `POST /api/rooms/demo` создаёт готовую комнату для проверки интерфейса.
- **Офлайн.** Без связи комнаты, вишлисты, чат и журнал хранятся в localStorage и синхронизируются после восстановления сети.
- **Уведомления.** Web Push с напоминаниями за 3 дня, 1 день и в день события; включается только при корректной VAPID-паре.

## Архитектура

| Слой | Технологии | Что делает |
| :--- | :--- | :--- |
| `apps/web` | TanStack Start, React, Mantine, React Query | SSR-страницы, формы, гиды, темы, PWA |
| `apps/api` | Hono, SQLite, SSE, ioredis | Комнаты, жеребьёвка, чат, токены, push, миграции |
| `packages/shared` | TypeScript | Контракты и RU/EN-словарь |
| `packages/art` | TypeScript + SVG | Детерминированные сцены для трёх тем |

События комнаты пишутся в таблицу `room_events` с монотонным `rowid`, который служит курсором SSE. Подписка создаётся до replay, поэтому события не теряются и не дублируются. При заданном `REDIS_URL` брокер доставляет события между процессами; без него работает in-memory шина одного процесса.

Фоновая задача `apps/api/src/worker.ts` обрабатывает `notification_jobs` и напоминания. Отдельные health-ответы показывают состояние API и push.

## HTTP API

Основные группы эндпоинтов:

| Префикс | Назначение |
| :--- | :--- |
| `/api/health` | Готовность API и статус push |
| `/api/rooms` | Создание, вход, состояние комнаты, жеребьёвка, сброс, исключения |
| `/api/rooms/{code}/assignment` | Назначение текущего участника (без имени получателя в публичных данных) |
| `/api/rooms/{code}/events` | SSE с курсором `Last-Event-ID` |
| `/api/push/config`, `/api/push/subscribe` | VAPID-конфигурация и подписка |
| `/api/rooms/demo` | Демо-комната |

Все мутации комнаты требуют токен участника, который выдаётся при входе и хранится в браузере.

## PWA и offline

Service worker кэширует оболочку приложения и статические SVG-сцены. Очередь офлайн-действий хранится в localStorage и отправляется на сервер после восстановления связи. Установка PWA предлагается через баннер в интерфейсе; `pushEnabled()` показывает кнопки уведомлений только при рабочей конфигурации VAPID.

## Локализация, темы и доступность

RU и EN синхронизированы (`npm run check:i18n-unused` сообщает о неиспользуемых ключах). Три темы — `winter`, `midnight`, `cozy` — задаются через CSS-токены и общие SVG-палитры. Интерфейс сохраняет выбранные язык и тему в localStorage, поддерживает клавиатурную навигацию, видимый фокус и `prefers-reduced-motion`.

## Графика

Иллюстрации генерируются из `packages/art` и лежат в `apps/web/public/art`. Одна и та же сцена рендерится в трёх палитрах; при повторном использовании на странице идентификаторы SVG делаются уникальными, чтобы не конфликтовать с `aria-labelledby` и градиентами.

## Тесты и качество

```bash
npm run typecheck              # все пакеты
npm test                       # Unit-тесты shared/art/api/web
npm run check:i18n-unused      # Словарь RU/EN
npm run build                  # API и SSR
npm run verify:frontend:v69    # Браузерные сценарии + Lighthouse (3 темы × RU/EN)
npm audit --audit-level=high   # Уязвимости зависимостей
npx openspec validate --all --strict
```

CI запускает типопроверку, тесты, сборку, валидацию OpenSpec и браузерный набор v69 на `ubuntu-24.04`. Verify поднимает compose-стек, проверяет готовность API и SSR, демо, приватность назначения, SSE replay и доступность Lighthouse.

## Конфигурация

Шаблон — `.env.example`. Ключевые переменные:

| Переменная | Назначение |
| :--- | :--- |
| `SECRET_SANTA_SECRET` | Подпись токенов; в production минимум 32 символа, заглушки запрещены |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Пара P-256 для Web Push; несовпадение ключей отключает push |
| `REDIS_URL` | Включает Redis Pub/Sub для SSE между процессами |
| `V69_IMAGE_REGISTRY`, `V69_IMAGE_NAMESPACE`, `V69_IMAGE_TAG` | Источник образов для production-стека |
| `PORT` | Порт API (по умолчанию `8787`) |

Приложение не открывает порт, если production-секрет слабый или известен как заглушка. Приватный VAPID-ключ никогда не попадает в логи и ответы API.

## Production и откат

Публикация образов выполняется workflow `.github/workflows/publish-images.yml` по тегу `v*` или вручную. Актуальный образ — `v69.4.0`, предыдущий рабочий — `v69.3.0`; оба доступны в GHCR вместе с `latest`. Git-тег `stable` всегда указывает на последний стабильный релиз.

```bash
git tag -a v69.4.0 -m "v69.4.0"
git tag -a stable -m "Stable: v69.4.0"
git push origin v69.4.0 stable
docker manifest inspect ghcr.io/<владелец>/secret-santa-api:v69.4.0
```

Для отката задайте предыдущий `V69_IMAGE_TAG`, сохраните том `v69_api_data`, проверьте совместимость миграций и пересоздайте сервисы:

```bash
export V69_IMAGE_TAG=v69.3.0
docker compose -f docker-compose.v69.yml pull api web
docker compose -f docker-compose.v69.yml up -d --no-build --force-recreate
```

Подробный чеклист — [`docs/RELEASES.md`](docs/RELEASES.md), правила веток — [`docs/GITFLOW.md`](docs/GITFLOW.md).

## Структура репозитория

```text
apps/api/         Hono API, миграции, воркер
apps/web/         TanStack Start, страницы, компоненты, стили
packages/shared/  Контракты и локализация
packages/art/     Генератор SVG-сцен
scripts/          Браузерные проверки v69
docs/             GITFLOW и RELEASES
openspec/         Спецификации и архив изменений
```

## Устранение проблем

- **Порты заняты.** SSR использует `3000`, API — `8787`; измените их в конфигурации dev-серверов или `PORT`.
- **Воркер unhealthy в демо.** При VAPID-заглушках push отключён — это ожидаемо; проверьте `push.enabled=false` в `/api/health`.
- **Слабый секрет.** API завершится до открытия порта; задайте уникальный `SECRET_SANTA_SECRET` длиной от 32 символов.
- **Нет событий SSE.** Проверьте `REDIS_URL` при нескольких процессах и курсор `Last-Event-ID` при переподключении.

## Лицензия

MIT — см. [`LICENSE`](LICENSE).
