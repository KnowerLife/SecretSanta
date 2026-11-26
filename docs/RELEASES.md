# Релизы

Версии следуют SemVer: `vMAJOR.MINOR.PATCH`. v68 — последний релиз монолитного ES-модульного интерфейса, v69 — первый релиз TypeScript-стека TanStack Start + Mantine + Hono.

## Чеклист релиза

1. Актуальна ветка `develop`, все feature-ветки слиты, CI зелёный.
2. Выполнены локальные проверки:

   ```bash
   npm run typecheck
   npm test
   npm run build
   make test
   git diff --check
   ```

3. OpenSpec-change для релиза прошёл `openspec validate <name> --strict`.
4. Создана `release/vX.Y.Z`, обновлены `CHANGELOG.md`, README и `docs/PARITY_v69.md`.
5. Проверены браузерные сценарии v68 и новый SSR-срез v69.
6. После одобрения: merge в `main`, тег `vX.Y.Z`, merge обратно в `develop`, архивация change.

## CHANGELOG

Формат основан на Keep a Changelog: секции `Added`, `Changed`, `Fixed`, `Removed`, `Security`. Дата — ISO `YYYY-MM-DD`. Записи добавляются в релизной ветке до слива в `main`.

## Откат

Откат выполняется через `git revert` релизного коммита в `main` и отдельный hotfix в `develop`. Удаление тегов и переписывание истории запрещены.
