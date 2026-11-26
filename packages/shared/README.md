# packages/shared

Общий слой приложения v69: полный bilingual-словарь интерфейса и чистые помощники без DOM.

## Словарь

Источник — `src/i18n-data.js` в корне проекта. Все строки перенесены в `src/i18n-data.ts` без изменений, включая HTML-разметку и плейсхолдеры. Ключей: **458 в RU** и **457 в EN**. Единственное расхождение — RU-ключ плюрализации `quick.resultMetaFew`, которого нет в EN.

```ts
import { I18N } from './src/i18n-data.ts';
import type { Locale } from './src/i18n-data.ts';
```

`Locale` — `'ru' | 'en'`. `I18N: Record<Locale, Record<string, string>>`.

## API (`src/i18n.ts`)

- `t(locale, key, params?)` — вернуть строку локали, при отсутствии — из RU, иначе сам ключ; заменяет `{name}` на значения `params`.
- `hasKey(locale, key)` — проверить наличие ключа именно в этой локали.
- `keys(locale)` — список ключей локали.
- `missingKeys()` — отсортированные ключи, отсутствующие в одной из локалей (ожидаемо: только `quick.resultMetaFew`).
- `pluralRu(n)` — русское число: `'one' | 'few' | 'many'`.
- `quickResultMetaKey(n)` — ключ счётчика пар: `quick.resultMetaOne` / `quick.resultMetaFew` / `quick.resultMetaMany`.

Проверка: `node --test packages/shared/src/i18n.test.ts` из корня проекта.
