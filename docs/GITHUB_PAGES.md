# GitHub Pages: статическая витрина

GitHub Pages раздаёт только статические файлы: здесь нельзя запустить SSR, Hono API, SSE, воркер и Web Push. Поэтому витрина — это отдельная сборка `apps/web`, а не замена полного стека из `docker-compose.v69.yml`.

## Что публикуется

- prerender'енные страницы `/`, `/create`, `/join`, `/quick-draw`;
- RU/EN, темы `winter` / `midnight` / `cozy`, `prefers-reduced-motion`;
- детерминированные SSR SVG-сцены, manifest и иконки PWA, service worker;
- SPA-оболочка `_shell.html` → `404.html` для неизвестных путей.

Страницы `/room/$code` намеренно исключены из prerender: их bootstrap приходит от API. По такой ссылке открывается пояснение и кнопка «На главную». Создание комнат, общий чат, SSE и push работают только в полном деплое с API.

Неизвестные пути открываются через SPA-оболочку: React может один раз предупредить о расхождении разметки (#418) и затем корректно дорисовывает нужную страницу. На prerender'енных витринных страницах таких предупреждений нет.

## Сборка

```bash
PAGES_BASE=/<имя-репозитория> npm run build:pages
```

Переменные:

| Переменная | Назначение |
| :--- | :--- |
| `PAGES_BASE` | Подпуть репозитория, например `/SecretSanta`. Workflow берёт `$GITHUB_REPOSITORY`. |
| `VITE_API_BASE` | Необязательный внешний API. Без него витрина остаётся статической и формы используют локальный режим. |
| `VITE_GOATCOUNTER_CODE` | Необязательный код сайта GoatCounter: cookieless-аналитика только публичных страниц, без `/room/*`. |
| `VITE_SENTRY_DSN` / `VITE_SENTRY_ENVIRONMENT` / `VITE_APP_VERSION` | Необязательный Sentry-совместимый репортер ошибок браузера и SSR. |

Подробнее о мониторинге, аналитике и проверках — [`OBSERVABILITY.md`](OBSERVABILITY.md).

`apps/web/vite.pages.config.ts` включает SPA-режим и prerender, задаёт `router.basepath` (иначе TanStack Start сбрасывает его при гидратации) и сохраняет относительные URL ассетов. `scripts/prepare_pages.mjs` после сборки:

1. переписывает корневые URL в HTML на подпуть `/<repo>/`;
2. копирует `_shell.html` в `404.html`;
3. создаёт `.nojekyll`, чтобы Pages не пропускал файлы через Jekyll.

Результат лежит в `apps/web/dist/client` — именно эту папку загружает workflow.

## Деплой

`.github/workflows/deploy-pages.yml` запускается при пуше в `develop` (демо-витрина) или `main` (стабильная витрина релиза), а также вручную (`workflow_dispatch`). Шаги: `npm ci`, `npm run build:pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`. Разрешения ограничены `contents: read`, `pages: write`, `id-token: write`.

В репозитории нужно включить **Settings → Pages → Source: GitHub Actions**. Отдельный git-тег или новый GitHub Release для витрины не создаётся: демо обновляется из `develop`, стабильная витрина — из `main`, а релизные теги по-прежнему управляют публикацией образов в GHCR.

## Локальная проверка

Проверьте, что страницы открываются именно с подпути и что ассеты не падают:

```bash
PAGES_BASE=/SecretSanta npm run build:pages
python3 -m http.server 4173 --directory apps/web/dist/client
# открыть http://127.0.0.1:4173/SecretSanta/ и /SecretSanta/create
```

Быстрая проверка в Node (без внешних утилит):

```bash
node --input-type=module - <<'NODE'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
const root = 'apps/web/dist/client'
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' }
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname.replace(/^\/SecretSanta/, '') || '/'
  const rel = path.endsWith('/') ? `${path}index.html` : path
  const file = join(root, rel)
  try {
    res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' })
    res.end(await readFile(file))
  } catch {
    res.writeHead(404).end(await readFile(join(root, '404.html')))
  }
}).listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173/SecretSanta/'))
NODE
```

Перед коммитом прогоните общие проверки: `npm run typecheck`, `npm test`, `npm run build`, `npm run check:i18n-unused`.
