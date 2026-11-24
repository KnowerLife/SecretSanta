# Secret Santa — план перехода к продакшену

Этот документ фиксирует следующий этап развития прототипа `SecretSanta/` (текущий MVP: локальный frontend, `localStorage`, без backend).

## 1. Цели продакшена
- Мультипользовательские комнаты с реальным присоединением по коду/ссылке.
- Приватность: назначение «кто кому дарит» недоступно другим участникам и не раскрывается клиентской логике.
- Надёжная серверная жеребьёвка с учётом исключений и режимов игры.
- Синхронизация состояния в реальном времени, чат/анонимные сообщения, уведомления.
- Готовность к публикации (PWA, домен, мониторинг, безопасность, масштабирование).

## 2. Рекомендуемая архитектура

### Frontend
- Текущий стек можно эволюционировать (Vanilla/SPA) или мигрировать на React/Vue + TypeScript для роста команды/поддержки.
- PWA: манифест, SW с версионированием, offline-shell, стратегия кэширования (app shell + API cache where safe).
- Состояние: сервер как source of truth; локальный кэш только для UX/offline drafts.

### Backend
- API: REST + WebSocket/SSE (или tRPC/GraphQL) для realtime обновлений комнат.
- Auth:
  - быстрый старт: magic link / email OTP;
  - опционально OAuth (Google/Apple) и гостевой вход с привязкой позже.
- Авторизация: роли `organizer`, `participant`; проверки доступа на уровне API/DB.
- Жеребьёвка: выполняется **на сервере**; клиент получает только своё назначение/необходимые данные.
- Уведомления:
  - Web Push (VAPID) для браузера/PWA;
  - email как fallback (дедлайны, старт жеребьёвки, напоминания).

### Хранилище данных (пример схемы)
- `users`: id, email/phone, name, avatar, settings, created_at.
- `rooms`: id, code, name, mode, budget_min, budget_max, event_date, theme, organizer_id, status, created_at.
- `room_members`: room_id, user_id, role, joined_at, gift_status, checklist (json/таблица), preferences.
- `wishlists` / `anti_wishlists`: member-scoped items.
- `exclusions`: room_id, member_a_id, member_b_id.
- `draw_runs`: room_id, run_id, created_at, algorithm_version, seed/hash (audit-safe).
- `assignments`: draw_run_id, santa_member_id, recipient_member_id (строгий доступ: только santa/organizer по политике).
- `gift_pool`, `pool_turns`, `pool_claims`, `pool_events`: для режимов лотереи/общего обмена.
- `messages`: room_id, from_member_id (nullable/hidden for anon UX), to_member_id/room scope, type, body, created_at.
- `reminders`: room_id/member_id, schedule, channel, status.
- `audit_logs`: важные события (создание, join, draw, reset, edits).

> Примечание: секретные назначения и анонимные сообщения должны проектироваться так, чтобы минимизировать утечки даже при ошибках UI/клиента.

## 3. Безопасность и приватность
- Серверная валидация всех действий (включая права, режим, дедлайны, состав участников).
- Rate limiting, CSRF (если cookie-сессии), защита от перебора кодов комнат.
- Шифрование в transit (HTTPS) и at rest (DB/секреты), управление секретами (VAPID keys, JWT/session secrets).
- Политика доступа к `assignments` и сообщениям (минимально необходимая выдача данных).
- Логи без утечки секретов (не логировать назначения/токены/PII сверх нужного).
- Резервное копирование БД и план восстановления.

## 4. Функциональная дорожная карта

### Этап A — Backend foundation
- Модель данных, миграции, auth, CRUD комнат/участников.
- Серверная жеребьёвка (classic + ограничения), выдача только персонального назначения.
- Базовый realtime sync (статусы, участники, события).

### Этап B — Коммуникации и UX
- Анонимные/служебные сообщения с серверной маршрутизацией.
- Напоминания (scheduler/cron + Web Push/email).
- Надёжная синхронизация чек-листов, вишлистов, статусов подарков.

### Этап C — Игровые режимы и расширения
- Серверная логика лотереи/общего обмена (ходы, кражи, блокировки, таймеры хода, восстановление состояния).
- История событий/аудит, анти-абьюз правила.

### Этап D — Продакшенизация
- Наблюдаемость (Sentry/логирование/метрики), алерты.
- CI/CD, staging/prod окружения, миграции, feature flags.
- Тестирование: unit/integration/e2e (включая жеребьёвку, права доступа, realtime).

## 5. Качество и тестирование
- Автотесты алгоритма жеребьёвки (валидность, исключения, отсутствие self-assignments, воспроизводимость/аудит).
- Тесты авторизации (участник не видит чужие назначения/приватные данные).
- E2E сценарии: создание комнаты, join, draw, reveal, лотерея/кражи, напоминания, экспорт.
- Нагрузочные проверки для realtime-комнат и push/email очередей.

## 6. Инфраструктура и деплой
- Frontend: CDN/статический хостинг (Vercel/Netlify/Cloudflare Pages) + HTTPS.
- Backend: контейнеризированный сервис (Fly.io/Render/Kubernetes/Cloud Run) + managed DB (Postgres).
- Очереди/джобы: Redis + worker (BullMQ/Celery/RQ) для напоминаний, push, email.
- Домены, сертификаты, environment management, секреты.

## 7. Миграция с текущего MVP
- Добавить экспорт/импорт совместимый с будущей схемой (versioned payloads).
- Сохранить локальный режим как demo/offline fallback на ранних этапах.
- Постепенно переносить критичные операции (draw, assignments, reminders delivery) на сервер.

## 8. Ближайшие практические шаги (рекомендуется начать)
1. Зафиксировать API-контракты (rooms, members, draw, pool, reminders, messages).
2. Спроектировать схему БД и политики доступа (особенно `assignments`).
3. Реализовать серверную жеребьёвку и минимальный realtime для одной комнаты.
4. Подключить Web Push (VAPID) и серверный планировщик напоминаний.
5. Добавить e2e-тесты критических пользовательских сценариев.
