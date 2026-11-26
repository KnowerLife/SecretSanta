# Релизы

Версии следуют SemVer: `vMAJOR.MINOR.PATCH`. Актуальный стек — v69: TanStack Start + Mantine + Hono.

## Чеклист релиза

1. Актуальна ветка `develop`, все feature-ветки слиты, CI зелёный.
2. Выполнены локальные проверки:

   ```bash
   npm run typecheck
   npm test
   npm run check:i18n-unused
   npm run build
   make test
   npm audit --audit-level=high
   git diff --check
   ```

3. OpenSpec-change для релиза прошёл `openspec validate <name> --strict`.
4. Создана `release/vX.Y.Z`, обновлены `CHANGELOG.md` и README.
5. Проверены браузерные сценарии v69 на трёх темах и двух языках (`npm run verify:frontend:v69`).
6. После одобрения: merge в `main`, тег `vX.Y.Z`, merge обратно в `develop`, архивация change.

## CHANGELOG

Формат основан на Keep a Changelog: секции `Added`, `Changed`, `Fixed`, `Removed`, `Security`. Дата — ISO `YYYY-MM-DD`. Записи добавляются в релизной ветке до слива в `main`.

## Откат

Откат выполняется через `git revert` релизного коммита в `main` и отдельный hotfix в `develop`. Удаление тегов и переписывание истории запрещены без явного решения владельца репозитория.
