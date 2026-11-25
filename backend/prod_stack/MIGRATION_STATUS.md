# Migration Status (prod stack)

## Completed in this iteration
- **Frontend access/session UI**: управление invite/member токенами, ротация member token, просмотр и отзыв сессий в текущей комнате (онлайн backend). Реализовано в `SecretSanta/src/` (начиная с v67 ES-модули, bootstrap в `SecretSanta/app.js`) и `SecretSanta/index.html`.
- **FastAPI/Postgres/Alembic scaffold (API contracts migration target)**:
  - `fastapi_app/main.py`, `core/config.py`, `core/security.py`, `db/models.py`, `db/session.py`
  - `services/draw.py`, `services/notifications.py`, `services/realtime.py` (Redis abstraction)
  - `api/rooms.py` с ключевыми контрактами (create/join/invite/member-token flow, room, draw, assignment)
  - `alembic/env.py`, `alembic.ini`, `alembic/versions/`
- **Redis pub/sub + queue worker scaffolding**:
  - `services/realtime.py` — Redis pub/sub publisher/subscriber abstraction (durable replay остаётся в `room_events`)
  - `workers/notifications_worker.py` — обработка `notification_jobs` (polling scaffold + RQ/Celery integration points)
  - `services/notifications.py` — Web Push (pywebpush/VAPID) и email (SMTP fallback/provider hook)
  - `docker-compose.yml`, `requirements.txt`
- **Tests**:
  - Foundation security/e2e: `backend/tests/test_security_e2e.py` (privacy assignments, authz, session revocation, persisted events for replay)
  - Prod-stack contract scaffolds: `prod_stack/tests/test_security_contracts.py`

## Remaining production hardening
- Полный перенос всех endpoints/сервисов foundation в FastAPI (exclusions CRUD, invites/sessions/member-token management endpoints parity, push subscribe/test/enqueue, SSE endpoint with Redis fanout + DB replay).
- Alembic автогенерация/миграции для Postgres и data migration из SQLite.
- Реальный Redis deployment wiring, горизонтальный SSE/realtime, idempotency/retry semantics.
- Celery/RQ в production конфигурации, DLQ/retries/backoff, мониторинг очередей.
- Полноценные e2e (Playwright/httpx) и security тесты в CI, rate limiting/CSRF, observability (Sentry/metrics/tracing).
