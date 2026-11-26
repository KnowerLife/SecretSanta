# Art engine (`@secret-santa/art`)

Набор из **36 сцен** в трёх темах: `winter` (ледяные голубые тона), `midnight` (тёмно-синий с бирюзой и золотом) и `cozy` (кремовый, янтарь, терракота). Все картинки рисуются на чистом TypeScript как автономный SVG: без JPG, внешних ресурсов и текста внутри изображения.

## Сцены

`SCENES` — неизменяемый список дескрипторов (`id`, `titleRu`, `titleEn`, `category`, `width`, `height`) в фиксированном порядке: обложка, 11 шапок, 7 карточек режимов и шагов, 10 состояний и 7 миниатюр гидов. `getScene(id)` возвращает дескриптор по идентификатору, `SceneId` — union всех 36 идентификаторов.

## Использование

```ts
import { renderSceneSvg, PALETTES, SCENES } from './src/index.ts';

const svg: string = renderSceneSvg('hero-winter-scene', 'midnight');
```

`renderSceneSvg` возвращает готовый SVG с `viewBox`, `width`/`height`, `role="img"` и `aria-labelledby` на `<title>`/`<desc>` из дескриптора. Композиция детерминирована: PRNG с сидом от `id` и темы даёт одинаковый снег, холмы и ёлки при каждом вызове. Палитры доступны через `PALETTES`.

## Генерация файлов

```bash
node packages/art/scripts/generate.ts
```

Команда создаёт `apps/web/public/art/` относительно корня репозитория и записывает туда winter-варианты всех 36 сцен как `<id>.svg`, затем выводит `ART_GENERATED 36`.
