# Production Stack Scaffold (migration target)

Эта директория — каркас для миграции foundation-бэкенда (stdlib + SQLite) на production-стек:
- **FastAPI** (API, OpenAPI, dependency injection)
- **PostgreSQL** (основная БД)
- **SQLAlchemy 2.x + Alembic** (модели/миграции)
- **Redis** (pub/sub для realtime, rate limiting, очереди/кэш)
- **Worker** (Celery/RQ/Arq/Dramatiq) для напоминаний, Web Push, email
- **pywebpush** (реальная отправка Web Push) + SMTP/provider для email fallback

## Статус
Scaffold/шаблон для следующего этапа внедрения. Текущий рабочий foundation остаётся в `backend/app/*`.

## Рекомендуемая структура (целевая)
- `fastapi_app/main.py` — FastAPI app, middleware (CORS, rate limit, auth)
- `fastapi_app/api/*` — routers (rooms, auth, draw, push, events)
- `fastapi_app/core/*` — config, security, logging/observability
- `fastapi_app/db/*` — engine/session, models, repositories
- `fastapi_app/services/*` — draw, notifications, realtime publisher
- `alembic/*` — миграции схемы
- `docker-compose.yml` — postgres/redis/api/worker (dev/staging)

## Ключевые миграционные задачи
1. Перенести доменную логику (draw, privacy rules, auth/session revocation) в сервисный слой.
2. Заменить SQLite на Postgres, добавить Alembic миграции и транзакционные гарантии.
3. Вынести realtime из in-memory bus в Redis pub/sub; сохранить `room_events` как durable log для replay/offsets.
4. Подключить реальную отправку Web Push (VAPID + pywebpush) и email provider; планировщик/воркер для `notification_jobs`.
5. Добавить rate limiting, CSRF (для cookie-auth сценариев), аудит, e2e/security тесты, наблюдаемость.
