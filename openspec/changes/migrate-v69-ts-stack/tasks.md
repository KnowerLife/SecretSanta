# Tasks

## 1. Процесс и SDD

- [x] 1.1 Зафиксировать Gitflow-конвенции в `docs/GITFLOW.md` и `docs/RELEASES.md` и проверить, что `develop` запушен в `origin`.
- [x] 1.2 Инициализировать OpenSpec (`openspec/config.yaml`, `.agents/skills/`) и получить `openspec list --json` с непустым `root`.
- [x] 1.3 Создать change `migrate-v69-ts-stack` со всеми артефактами и добиться прохождения `openspec validate migrate-v69-ts-stack --strict`.
- [x] 1.4 Добавить workflow `.github/workflows/ci-v69.yml` с typecheck, unit-тестами и сборкой; проверить, что старый `.github/workflows/ci.yml` не изменён.

## 2. Каркас монорепозитория

- [x] 2.1 Расширить корневой `package.json` до npm workspaces (`apps/*`, `packages/*`), сохранив скрипты `verify:frontend*` и `screenshots`; проверить `npm ci --ignore-scripts`.
- [x] 2.2 Добавить корневой `tsconfig.base.json` и tsconfig-файлы пакетов; проверить `npm run typecheck` без ошибок.
- [x] 2.3 Создать `apps/web` с Vite 8 + `@tanstack/react-start/plugin/vite` + `@vitejs/plugin-react` в правильном порядке и проверить `npm run build --workspace apps/web`.
- [x] 2.4 Создать `apps/api` на Hono и `@hono/node-server`; проверить, что `GET /api/health` отвечает 200 через `app.request()`.

## 3. Общие контракты и домен

- [x] 3.1 Перенести RU/EN-словарь в `packages/shared/src/i18n-data.ts` и helpers в `i18n.ts`; проверить `node --test packages/shared/src/i18n.test.ts` — 7/7 тестов.
- [x] 3.2 Описать доменные типы room/member/draw/message и zod-схемы запросов в `packages/shared/src/contracts.ts`; проверить typecheck всех пакетов.
- [x] 3.3 Перенести алгоритм derangement в `packages/shared/src/draw.ts` с тестами на самоназначения, исключения и невозможную конфигурацию; проверить `node --test packages/shared/src/draw.test.ts`.

## 4. API на TypeScript

- [x] 4.1 Реализовать SQLite-слой в `apps/api/src/db.ts` с миграциями из `apps/api/migrations`; проверить, что повторный запуск не дублирует таблицы.
- [x] 4.2 Реализовать create/join/get room и/auth-сессии с HMAC-токенами; проверить API-тесты на выдачу и отзыв сессии.
- [x] 4.3 Реализовать draw/reset, exclusions, wishlist, gift-status, profile и activity (organizer-only); проверить интеграционный тест полного цикла комнаты.
- [x] 4.4 Реализовать чат, SSE и уведомления с приватностью назначения; проверить тест, что assignment не раскрывает чужие пары.

## 5. Frontend на React + Mantine + FSD

- [x] 5.1 Настроить `src/routes/__root.tsx` с MantineProvider, `ColorSchemeScript`, `mantineCoreStyles?url` первым в `links` и SSR-обёрткой; проверить `curl` HTML содержит подключение стиля.
- [x] 5.2 Реализовать слои FSD и правило «импорты только вниз»; проверить, что `src/routes/` содержит только delegation в `pages`.
- [x] 5.3 Собрать главную страницу с Mantine-компонентами и тремя темами; проверить RU/EN и 0 контрастных предупреждений в Lighthouse.
- [x] 5.4 Реализовать формы создания и входа, быструю жеребьёвку с CSV/печатью и персональными ссылками; проверить unit-тесты и ручной сценарий.
- [x] 5.5 Реализовать дашборд комнаты с TanStack Query, вкладками, чатом и SSE; проверить, что данные после F5 приходят с сервера.
- [x] 5.6 Подключить PWA-манифест, service worker и offline-очередь; проверить офлайн-сценарий в Playwright.

## 6. SVG-графика

- [x] 6.1 Создать каталог из 36 сцен и палитр в `packages/art`; проверить `node packages/art/scripts/generate.ts` — `ART_GENERATED 36`.
- [x] 6.2 Реализовать детерминированный `renderSceneSvg(id, theme)`; проверить тест побайтового совпадения и корректного `viewBox`.
- [x] 6.3 Подключить инлайн-SVG сцен в UI и проверить смену палитры вместе с темой через браузерный скриншот.

## 7. Документация и релиз

- [x] 7.1 Добавить раздел о v69 и миграции в README, не удаляя описание v68; проверить, что все относительные ссылки существуют.
- [x] 7.2 Завести `CHANGELOG.md` и шаблон `release/v69.0.0`; проверить, что теги следуют `vX.Y.Z`.
- [x] 7.3 Сверить паритет с v68: 19 браузерных проверок и 12 Lighthouse-прогонов; зафиксировать результаты в `docs/PARITY_v69.md` (performance флуктуирует 0.87–1.00, остальные категории 1.00).
- [x] 7.4 Архивировать change через `openspec archive migrate-v69-ts-stack` после слива релиза и проверить `openspec list --specs` обновлённые спеки.

## 8. Интеграционная проверка

- [x] 8.1 Прогнать `npm run typecheck`, `npm test`, `npm run build` и `make test`; все команды зелёные.
- [x] 8.2 Прогнать `git diff --check` и убедиться, что рабочее дерево не содержит конфликтов.
- [x] 8.3 Создать `release/v69.0.0`, поставить тег и запушить `develop` и `main` только после явного разрешения пользователя.

## Workflow follow-up

- Архивировать OpenSpec-change после одобрения релиза.
- Обновить основной README и объявить v69 точкой входа по умолчанию.
