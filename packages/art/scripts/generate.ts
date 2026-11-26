import { mkdirSync, writeFileSync } from 'node:fs';
import { SCENES, renderSceneSvg } from '../src/index.ts';
import type { SceneId, ThemeName } from '../src/index.ts';

const outputDir = `${process.cwd()}/apps/web/public/art`;
const theme: ThemeName = 'winter';

mkdirSync(outputDir, { recursive: true });

for (const scene of SCENES) {
  const id: SceneId = scene.id;
  writeFileSync(`${outputDir}/${id}.svg`, renderSceneSvg(id, theme), 'utf8');
}

console.log(`ART_GENERATED ${SCENES.length}`);
