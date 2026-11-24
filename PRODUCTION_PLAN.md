# Secret Santa — Production Plan (Status)

Этот документ фиксирует план перехода `SecretSanta/` в production-ready состояние и текущий статус реализации в репозитории.

## Сводка статуса

- [x] **A. Foundation backend** — реализован в `backend/app/*` (Python stdlib + SQLite)
- [x] **B. Auth / Access / Sessions** — реализовано (invite/member tokens, sessions, revoke, rate limit basic)
- [x] **C. Realtime / Notifications scaffold** — SSE + room_events replay, push scaffold, notification jobs; worker/provider hooks подготовлены
- [x] **D. PWA / Offline** — manifest, SW cache versioning, offline shell fallback
- [x] **E. Frontend integration** — online backend mode + localStorage fallback, SSE auto-refresh
- [x] **F. CI / Docker / Tests / Docs** — CI, docker-compose, env example, unit/e2e security tests, README/plan updated
- [~] **Prod stack migration (FastAPI+Postgres+Redis)** — scaffold + parity improvements в `backend/prod_stack/` (требует infra/зависимостей/полного cutover)
- [ ] **Operational deployment** — требует реальной инфраструктуры/секретов (VAPID/SMTP/Sentry/домен/хостинг)

---

## A) Foundation Backend (готово)

- [x] SQLite схема + миграции (`backend/migrations/001..003`)
- [x] Rooms / members / join / draw / assignment
- [x] Wishlist + gift status + draw reset
- [x] Auth sessions, room invites, member access tokens
- [x] SSE `/api/rooms/{code}/events` + `room_events` durable replay (`Last-Event-ID`)
- [x] Web Push scaffold (`/api/push/*`, VAPID config), notification jobs enqueue
- [x] Privacy: assignment выдаётся только владельцу (`/assignment`)
- [x] Basic hardening: rate limiting, security headers, request logging

## B) Auth & Room Access (готово в foundation)

- [x] Invite-based join + legacy name fallback (для совместимости)
- [x] Member token resume flow
- [x] Session listing + revoke (self/all)
- [x] Frontend UI: copy invite link, sessions list, revoke session
- [ ] Полная продовая модель аккаунтов (email/Telegram/OAuth) — следующий этап после cutover на prod_stack
- [ ] CSRF для cookie-auth сценариев (актуально при переходе на cookie sessions)

## C) Realtime & Notifications (частично / scaffold готов)

- [x] SSE события: draw/wishlist/gift-status/reset/member joined
- [x] Frontend auto-refresh через EventSource
- [x] Notification jobs table + enqueue endpoint
- [x] Worker/scheduler scripts в backend (scaffold)
- [ ] Реальная доставка Web Push в production (VAPID keys + pywebpush + worker deploy)
- [ ] Email provider integration (SMTP/SendGrid/etc.)
- [ ] Напоминания по расписанию (cron/worker в infra)

## D) PWA / Offline / UX (готово базово)

- [x] `manifest.webmanifest`, `sw.js`, cache versioning
- [x] Local fallback mode при недоступном backend
- [x] RU/EN локализация
- [ ] Расширенный offline UX (background sync, conflict resolution) — после стабильного backend API

## E) Frontend Integration (готово)

- [x] Auto-detect backend `/api/health`
- [x] Create/join/sync/draw/assignment/wishlist/gift-status/reset через API
- [x] Invite link с token + session persistence
- [x] SSE realtime refresh
- [x] LocalStorage fallback сохранён

## F) Quality / Infra / Deploy (готово в репозитории)

- [x] Unit/e2e tests: `backend/tests/test_draw.py`, `test_security_e2e.py`, `test_wishlist.py`
- [x] CI: `.github/workflows/ci.yml` (unittest + JS syntax)
- [x] Docker: `backend/Dockerfile`, root `docker-compose.yml`
- [x] Env: `backend/.env.example`
- [x] Docs: README RU/EN, backend READMEs, этот план
- [x] Prod stack scaffold parity updates: wishlist/gift-status/reset endpoints in FastAPI scaffold
- [ ] Observability stack (Sentry/Prometheus/Grafana) — подключается при деплое
- [ ] Load/stress/security audit в целевой infra

## Prod Stack Migration (следующий технический этап)

Цель: перенести foundation на `backend/prod_stack/` (FastAPI + Postgres + SQLAlchemy/Alembic + Redis + worker).

- [x] Scaffold структуры, моделей, routers, docker-compose, requirements
- [x] Добавлена parity для wishlist/gift-status/reset в FastAPI rooms router
- [ ] Полная parity всех foundation endpoints (sessions/invites/member-tokens/push/notifications/events replay)
- [ ] Alembic migrations для всех таблиц (включая wishlist_items)
- [ ] Redis pub/sub интеграция в runtime + durable replay
- [ ] Worker (RQ/Celery/Arq) для notification jobs / push / email
- [ ] E2E tests против prod stack
- [ ] Cutover: frontend API_BASE -> prod stack, deprecate foundation

## Operational Deployment Checklist (выполняется при наличии infra)

- [ ] Создать production secrets: `SECRET_SANTA_SECRET`, DB creds, VAPID, SMTP
- [ ] Настроить Postgres + Redis managed services
- [ ] Развернуть API + worker + static frontend (Nginx/CDN)
- [ ] Настроить HTTPS, домен, CORS allowlist, backups
- [ ] Подключить Sentry/log aggregation/metrics/alerts
- [ ] Прогнать e2e smoke + security checklist перед релизом

## Определение “готово” для этого репозитория

Репозиторий считается production-ready на уровне implementation baseline, когда:
- [x] Основной user flow работает в онлайн и локальном режимах
- [x] Draw приватный и серверный
- [x] Wishlist/gift-status/sessions/invites поддержаны в foundation
- [x] Есть тесты, CI, docker, env docs, runbook в README
- [x] Есть план миграции на prod stack и scaffold

Дальнейшие пункты помечены как operational/infrastructure и выполняются при деплое.