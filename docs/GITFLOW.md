# Gitflow

Репозиторий развивается по Gitflow с двумя долгоживущими ветками и releases.

## Ветки

| Ветка | Назначение | Откуда создаётся | Куда сливается |
| :--- | :--- | :--- | :--- |
| `main` | Только релизные и hotfix-коммиты; всегда соответствует тегу | — | — |
| `develop` | Интеграционная ветка v69 | `main` | `main` через `release/*` |
| `feature/*` | Одна задача или OpenSpec-change | `develop` | `develop` |
| `release/vX.Y.Z` | Подготовка релиза, только фиксы и документация | `develop` | `main` и `develop` |
| `hotfix/vX.Y.Z` | Срочный фикс работающего релиза | `main` | `main` и `develop` |

## Правила

1. Любая работа начинается с `feature/<short-name>` от актуального `develop`.
2. Один feature — один OpenSpec-change или его часть. План хранится в `openspec/changes/<name>/`.
3. В `main` не делается прямых коммитов и force-push.
4. Релиз создаётся только после зелёного CI и `openspec validate <change> --strict`.
5. После релиза ставятся аннотированный тег `vX.Y.Z` и подвижный тег `stable` на тот же коммит, change архивируется.
6. Пуш в `main` и тегирование выполняются только по явной просьбе владельца репозитория.

## Команды

```bash
git switch develop
git pull --ff-only
git switch -c feature/v69-ts-stack
# работа, тесты, openspec validate
git push -u origin feature/v69-ts-stack

# релиз
git switch -c release/v69.0.0 develop
git push -u origin release/v69.0.0
# после проверок
git switch main && git merge --no-ff release/v69.0.0
git tag -a v69.0.0 -m "Release v69.0.0"
git switch develop && git merge --no-ff release/v69.0.0
```

Статус веток и расхождений: `git status --short --branch` и `git log --oneline --decorate --graph --all -n 20`.
