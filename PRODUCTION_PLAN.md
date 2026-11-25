# Secret Santa — Production Plan (Status)

Этот документ фиксирует план перехода `SecretSanta/` в production-ready состояние и текущий статус реализации в репозитории.

## Сводка статуса

- [x] **A. Foundation backend** — реализован в `backend/app/*` (Python stdlib + SQLite)
- [x] **B. Auth / Access / Sessions** — реализовано (invite/member tokens, sessions, revoke, rate limit basic)
- [x] **C. Realtime / Notifications scaffold** — SSE + room_events replay, push scaffold, notification jobs; worker/provider hooks подготовлены; анонимный чат (MVP), organizer activity log
- [x] **D. PWA / Offline** — manifest, SW cache versioning, offline shell fallback, offline-баннер, отложенная отправка чата и background sync
- [x] **E. Frontend integration** — online backend mode + localStorage fallback, SSE auto-refresh, extended UI (темы, быстрая жеребьёвка, приглашения, чеклист, группы, профиль, журнал); с v67 клиент разбит на ES-модули в `src/`
- [x] **F. CI / Docker / Tests / Docs** — CI, docker-compose, env example, unit/e2e security tests, README/plan updated
- [~] **Prod stack migration (FastAPI+Postgres+Redis)** — scaffold + parity improvements в `backend/prod_stack/` (требует infra/зависимостей/полного cutover)
- [ ] **Operational deployment** — требует реальной инфраструктуры/секретов (VAPID/SMTP/Sentry/домен/хостинг)

---

## A) Foundation Backend (готово)

- [x] SQLite схема + миграции (`backend/migrations/001..006`)
- [x] Rooms / members / join / draw / assignment
- [x] Wishlist + gift status + draw reset
- [x] Расширенный профиль (`address`, `profileNote`, `antiWishlist`, `size`, `links`, `allergies`)
- [x] Исключения и группы «сугроб» (pairwise exclusions, `groupName` в событиях)
- [x] Organizer activity log (`GET /api/rooms/{code}/activity`)
- [x] Анонимные сообщения Санта↔получатель (после жеребьёвки, scoped по draw run)
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

- [x] SSE события: draw/wishlist/gift-status/reset/member joined/message
- [x] Frontend auto-refresh через EventSource
- [x] Notification jobs table + enqueue endpoint
- [x] Worker/scheduler scripts в backend (scaffold)
- [ ] Реальная доставка Web Push в production (VAPID keys + pywebpush + worker deploy)
- [ ] Email provider integration (SMTP/SendGrid/etc.)
- [ ] Напоминания по расписанию (cron/worker в infra)

## D) PWA / Offline / UX (готово базово)

- [x] `manifest.webmanifest`, `sw.js`, cache versioning, install prompt
- [x] Local fallback mode при недоступном backend
- [x] RU/EN локализация, темы winter/midnight/cozy
- [x] Offline-баннер, кеш последних сообщений и очередь анонимных сообщений с background sync
- [ ] Conflict resolution для параллельных правок профиля/вишлиста — после стабильного backend API

## E) Frontend Integration (готово)

- [x] Auto-detect backend `/api/health`
- [x] Create/join/sync/draw/assignment/wishlist/gift-status/reset через API
- [x] Extended profile, exclusions/groups, activity log, chat через API
- [x] Invite link + генератор текста и share-кнопки
- [x] SSE realtime refresh
- [x] Demo-игра, быстрая жеребьёвка (персональные ссылки/CSV/печать), чеклист, privacy-блок
- [x] LocalStorage fallback сохранён

## F) Quality / Infra / Deploy (готово в репозитории)

- [x] Unit/e2e tests: `backend/tests/test_draw.py`, `test_security_e2e.py`, `test_wishlist.py`, `test_messages.py`, `test_profile_extended.py`
- [x] Smoke script `scripts/smoke_e2e.py` (profile, exclusions, activity)
- [x] Коммитируемый браузерный набор `scripts/verify_frontend.mjs` + `scripts/frontend-checks/` (19 проверок, включая Lighthouse); запуск через `npm run verify:frontend` или `make verify-frontend`
- [x] Lighthouse (12 прогонов: home/dashboard × winter/midnight/cozy × RU/EN): accessibility / best practices / SEO = 1.0
- [x] v68: контраст зелёных акцентов в `cozy` доведён до 4.91:1; кэш SW и query-версии подняты до v68
- [x] Static contract tests `backend/prod_stack/tests/test_api_contracts.py` (routes, activity, groups, chat)
- [x] CI: `.github/workflows/ci.yml` (unittest + prod-stack contracts + JS syntax + 19 браузерных проверок)
- [x] Docker: `backend/Dockerfile`, root `docker-compose.yml`
- [x] Env: `backend/.env.example`
- [x] Docs: README RU/EN, backend READMEs, этот план, image prompts
- [x] Prod stack scaffold parity updates: wishlist/gift-status/reset/messages/profile/exclusions/activity endpoints in FastAPI scaffold
- [ ] Observability stack (Sentry/Prometheus/Grafana) — подключается при деплое
- [ ] Load/stress/security audit в целевой infra

## Prod Stack Migration (следующий технический этап)

Цель: перенести foundation на `backend/prod_stack/` (FastAPI + Postgres + SQLAlchemy/Alembic + Redis + worker).

- [x] Scaffold структуры, моделей, routers, docker-compose, requirements
- [x] Добавлена parity для wishlist/gift-status/reset/messages/profile/exclusions/activity в FastAPI rooms router
- [x] `groupName` в exclusion events + `room.created` / `room.member_joined` в prod-stack event log
- [x] Parity для foundation endpoints: sessions/invites/member-tokens/push/notifications/events replay (routes + базовая семантика; требуется финальная сверка контрактов при cutover)
- [x] Alembic migrations для foundation-таблиц (включая wishlist_items/messages/extended profile)
- [~] Redis pub/sub интеграция в runtime + durable replay (durable replay и best-effort publish добавлены; нужна полная runtime-интеграция в целевой async/worker контур)
- [~] Worker (RQ/Celery/Arq) для notification jobs / push / email (polling worker + service scaffold есть; нужен production deploy/очередь/ретраи/мониторинг)
- [~] Static contract tests против prod-stack scaffold (без infra); runtime E2E против реального FastAPI/Postgres/Redis остаётся
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
- [x] Wishlist/gift-status/sessions/invites/activity поддержаны в foundation
- [x] Группы, расширенный профиль, чат и офлайн-очередь работают в UI
- [x] Есть тесты, CI, docker, env docs, runbook в README
- [x] Есть план миграции на prod stack и scaffold с parity ключевых endpoints

Дальнейшие пункты помечены как operational/infrastructure и выполняются при деплое.