# Secret Santa Backend Foundation

Минимальный backend-фундамент для `SecretSanta` (этап A+ заготовки B): SQLite, HTTP API, server-side draw, auth/session, SSE realtime, Web Push scaffolding.

## Стек
- Python 3.9+ (stdlib): `sqlite3`, `http.server`, `json`, `hmac`, `hashlib`, `secrets`
- БД: SQLite (`backend/data/app.db`)
- Без внешних зависимостей для запуска демо-сервера

> Для production рекомендуется миграция на FastAPI + Postgres + Redis/worker + pywebpush/webpush libs (см. `../PRODUCTION_PLAN.md`).

## Быстрый старт
```bash
cd SecretSanta/backend
python3 -m app.server --host 127.0.0.1 --port 8000
```

Проверка:
```bash
curl http://127.0.0.1:8000/api/health
```

## Конфигурация (env)
- `SECRET_SANTA_DB_PATH` — путь к SQLite (default: `backend/data/app.db`)
- `SECRET_SANTA_SECRET` — секрет для подписи токенов/сессий (обязательно сменить в prod)
- `SECRET_SANTA_ALLOW_ORIGIN` — CORS origin (default: `*` для локальной разработки)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — для Web Push (опционально, scaffold)

## Основные возможности
- Auth/session: guest join/login по комнате + токен участника (Bearer)
- Rooms/members: создание комнаты, join, просмотр участников/настроек (с проверками доступа)
- Server-side draw: приватная жеребьёвка на сервере; участник получает только своё назначение
- Realtime: SSE stream событий комнаты (`/api/rooms/{code}/events`)
- Web Push: хранение subscriptions и endpoint-заглушка отправки (реальная отправка требует VAPID/библиотеку)

## Важные принципы приватности
- Назначения (`assignments`) не возвращаются списком всем участникам.
- API `GET /api/rooms/{code}/assignment` отдаёт только назначение текущего участника.
- Логи/события не должны содержать секретные пары назначений.

## Обновления foundation (auth/realtime/push hardening)
- **Auth & sessions**: `auth_sessions`, `room_invites`, `member_access_tokens` (migration `002_auth_realtime_push.sql`), invite-based join, resumable member tokens, session revocation/listing.
- **Новые/расширенные API**:
  - `POST /api/rooms` → возвращает `inviteToken`, `sessionId`
  - `POST /api/rooms/join` → поддерживает `inviteToken` / `memberToken` (legacy name join сохранён как fallback)
  - `POST /api/rooms/{code}/invites` (organizer)
  - `POST /api/rooms/{code}/member-tokens`
  - `GET /api/rooms/{code}/sessions`
  - `POST /api/rooms/{code}/sessions/revoke`
  - `POST /api/rooms/{code}/notifications` (enqueue `notification_jobs`)
- **Realtime**: SSE с `id` событий, хранение `room_events`, replay по `Last-Event-ID` (durable cursor) + heartbeat.
- **Push/notifications**: `app/push.py` поддерживает реальную отправку через `pywebpush` при наличии VAPID/зависимости; `scripts/notification_worker.py`, `scripts/scheduler.py`.
- **Тесты**: `tests/test_draw.py`, `tests/test_security_e2e.py` (privacy/authz/revocation/replay persistence).

## Production migration scaffold
См. `backend/prod_stack/` (FastAPI + SQLAlchemy models + Alembic env + Redis realtime abstraction + notification worker/queue scaffold + docker-compose/requirements + contract tests).
