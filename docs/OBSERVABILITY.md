# Наблюдаемость, аналитика и проверки

Этот документ описывает четыре необязательных интеграции, добавленные после релиза `v9.5.0`. Все они **выключены по умолчанию**: без переменных окружения в репозиторий не уходит никаких данных.

| Интеграция | Что даёт | Включение |
| :--- | :--- | :--- |
| Synthetic checks | smoke-проверки Pages, API health и базовых a11y-признаков каждые 15 минут | уже в `.github/workflows/synthetic-checks.yml` |
| UptimeRobot | внешние мониторы и статус-страница | секрет `UPTIMEROBOT_API_KEY` (опционально `MONITOR_API_URL`) |
| GoatCounter | приватная cookieless-аналитика статической витрины | `VITE_GOATCOUNTER_CODE` на этапе сборки Pages |
| Sentry-совместимый репортер | ошибки SSR, роутера, браузера и Hono API | `SENTRY_DSN` (API) и/или `VITE_SENTRY_DSN` (web) |
| Checkly / Accesserty Pulse | внешние синтетические проверки и мониторинг доступности | настраиваются вручную в сервисе |

## 1. Synthetic checks без внешних сервисов

Workflow `.github/workflows/synthetic-checks.yml` запускается по расписанию `*/15 * * * *` и вручную (`workflow_dispatch`). Он проверяет:

- `/`, `/create`, `/join`, `/quick-draw` на `https://knowerlife.github.io/SecretSanta/`;
- `/room/DEMO123` — заглушку статической витрины (допускается статус 404 + HTML-оболочка);
- `<html lang="ru|en">`, `<title>`, `<main>` и ссылку на репозиторий в футере;
- `GET /api/health`, если задан `MONITOR_API_URL`.

Локальный запуск:

```bash
node scripts/check_endpoints.mjs
PAGES_URL=https://knowerlife.github.io/SecretSanta/ MONITOR_API_URL=http://127.0.0.1:8787 \
  node scripts/check_endpoints.mjs
```

Скрипт не требует зависимостей — используется `fetch` Node.js 22.

## 2. UptimeRobot

Вариант А — вручную создайте два HTTP-монитора:

| Имя | URL | Интервал |
| :--- | :--- | :--- |
| `[SecretSanta] Pages showcase` | `https://knowerlife.github.io/SecretSanta/` | 5 минут |
| `[SecretSanta] API health` | `<публичный API>/api/health` | 5 минут |

Вариант Б — добавьте в **Settings → Secrets and variables → Actions** секрет `UPTIMEROBOT_API_KEY` (read/write) и, если есть публичный API, `MONITOR_API_URL`. При первом же запуске workflow вызовет `scripts/uptimerobot-sync.mjs`, который:

- получит список существующих мониторов через `getMonitors`;
- создаст только отсутствующие через `createMonitor` (идемпотентно по имени и URL);
- ничего не сделает без ключа.

Проверка без отправки изменений:

```bash
UPTIMEROBOT_API_KEY=... DRY_RUN=1 node scripts/uptimerobot-sync.mjs
```

## 3. GoatCounter: приватная аналитика витрины

GoatCounter из каталога `free-for-dev` даёт cookieless-статистику без согласия на куки. Интеграция Gates:

- работает только при `VITE_PAGES_MODE=1` (то есть только в Pages-сборке);
- не загружается на `/room` и `/room/*` — комнаты остаются приватными;
- не читает `localStorage`, cookies `ss_token_*` и не отправляет query/hash;
- уважает `Do Not Track`;
- подключается рантайм-скриптом, а не вставкой в `404.html`, поэтому deep-link в комнату остаётся без аналитики.

Шаги:

1. Создайте сайт в GoatCounter и скопируйте его код (часть домена до `.goatcounter.com`).
2. Добавьте репозиторий-переменную **Settings → Secrets and variables → Actions → Variables**: `VITE_GOATCOUNTER_CODE=<код>`.
3. Workflow `deploy-pages.yml` передаст её в `npm run build:pages`.

Локальная проверка:

```bash
PAGES_BASE=/SecretSanta VITE_PAGES_MODE=1 VITE_GOATCOUNTER_CODE=<код> npm run build:pages
```

Альтернативы из того же каталога, если нужна другая юрисдикция или больше событий: Cabin (10k просмотров/мес), Beampipe (5 доменов), Aptabase (20k событий). Принципы те же: без кук, без данных комнат.

## 4. Sentry-совместимый error tracking

Используется минимальный репортер на базе публичного **Sentry envelope protocol** (`packages/shared/src/observability.ts`), без vendor SDK в бандле. Он работает с sentry.io, Bugsink и GlitchTip — везде, где принимают DSN и энvelope’ы.

Покрытие:

- `apps/api/src/app.ts` → `app.onError` (исключения Hono, без `/api/health`);
- `apps/web/src/routes/__root.tsx` → `onError` роутера и запасной `errorComponent`;
- `apps/web/src/entities/room/server.ts` → ошибки SSR-загрузчика;
- браузер → `window.onerror` и `unhandledrejection`.

В репортер **не попадают**: cookies, localStorage, тело запроса, токены, query-строка и код комнаты (в URL заменяется на `/room/[redacted]`).

Шаги:

1. Создайте проект в Sentry/Bugsink/GlitchTip и получите DSN.
2. Для API задайте runtime-переменную `SENTRY_DSN` (в `docker-compose.v69.yml` это `.env` → `env_file`). Дополнительно `SENTRY_ENVIRONMENT`, `APP_VERSION`.
3. Для web задайте build-time `VITE_SENTRY_DSN` как репозиторий-variable для `deploy-pages.yml`; для Docker SSR подойдёт runtime `SENTRY_DSN`.
4. Пересоберите образы/витрину.

Проверка:

```bash
SENTRY_DSN=https://key@host/1 node apps/api/src/index.ts
# в логах: ERROR_REPORTING enabled
```

## 5. Checkly и Accesserty Pulse (внешние сервисы)

- **Checkly**: создайте API-чек на `<API>/api/health` и browser-чеки для `/create`, `/join`, `/quick-draw`. Логика совпадает с `scripts/check_endpoints.mjs`, поэтому можно переиспользовать скрипт как Node-чек. Бесплатный план покрывает 10k API и 1.5k browser runs в месяц.
- **Accesserty Pulse**: добавьте `https://knowerlife.github.io/SecretSanta/` как сайт и включите мониторинг доступности; бесплатный план подходит для одного публичного сайта.
- Локально доступность уже проверяется `npm run verify:frontend:v69` (Lighthouse, 3 темы × RU/EN, порог 1.00), а по запросу workflow `synthetic-checks` запускает Lighthouse прямо на Pages-витрине.

## Проверки после изменений

```bash
npm run typecheck
npm test
npm run check:i18n-unused
npm run build
PAGES_BASE=/SecretSanta npm run build:pages
git diff --check
```
