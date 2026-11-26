# Changelog

Все значимые изменения фиксируются здесь. Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версии — [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [69.0.0] — 2026-11-26

### Added

- OpenSpec-change `migrate-v69-ts-stack` с пятью capability: `room-gameplay`, `server-rendering`, `localized-themes`, `svg-scenes`, `pwa-offline`.
- npm workspaces: `apps/web`, `apps/api`, `packages/shared`, `packages/art`.
- `apps/web`: SSR на TanStack Start + Vite 8, TanStack Router/Query, Mantine 9, FSD-слои, RU/EN и три темы, PWA-манифест и service worker.
- `apps/api`: Hono + TypeScript + `node:sqlite`, HMAC-сессии и приглашения, комнаты, жеребьёвка, исключения, вишлисты, профили, активность, чат, SSE и уведомления.
- `packages/shared`: точный RU/EN-словарь, доменные контракты и чистый алгоритм derangement.
- `packages/art`: 36 детерминированных SVG-сцен с тремя палитрами и генератор статических файлов.
- Документация процесса: `docs/GITFLOW.md`, `docs/RELEASES.md`, `docs/PARITY_v69.md`, workflow `.github/workflows/ci-v69.yml`.

### Changed

- `package.json` расширен до workspaces при сохранении скриптов проверок v68.
- `README.md` дополнен разделом о параллельной разработке v69.

### Fixed

- Контраст текста во всех трёх темах v69: Lighthouse accessibility 1.00 для RU/EN × winter/midnight/cozy.
- Офлайн-очередь сообщений: параллельные слушатели `online` больше не отправляют одно сообщение дважды.
- SSR дашборда: токен комнаты хранится в отдельной cookie `ss_token_<CODE>`, поэтому несколько комнат не конфликтуют.

v69.0.0 — рекомендуемая точка входа для разработки. v68 сохранён как legacy-стек и резервный вариант; старые файлы и проверки не удалены. Production-деплой нового стека ещё не настроен.

## [68.0.0] — 2026-01-15

### Added

- Разделение frontend на 18 ES-модулей, серверная жеребьёвка, комнаты с SSE, анонимный чат, RU/EN, три темы и офлайн-очередь.

### Fixed

- Контраст темы `cozy` и версии ассетов/service worker обновлены до v68.

[Unreleased]: https://github.com/KnowerLife/SecretSanta/compare/v69.0.0...HEAD
[69.0.0]: https://github.com/KnowerLife/SecretSanta/compare/v68.0.0...v69.0.0
[68.0.0]: https://github.com/KnowerLife/SecretSanta/releases/tag/v68.0.0
