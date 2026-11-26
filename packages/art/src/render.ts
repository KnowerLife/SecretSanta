import { getScene } from './scenes.ts';
import type { SceneId, ThemeName } from './scenes.ts';
import { PALETTES } from './palettes.ts';
import { COMPOSITIONS, DESCRIPTIONS } from './compositions.ts';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** FNV-1a + mulberry32: the same scene always produces the same paper cuts. */
function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function renderDefs(uid: string, sky: string, glow: string): string[] {
  return [
    '<defs>',
    `<linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0" stop-color="${sky}"/>`,
    `<stop offset="1" stop-color="${sky}" stop-opacity="0.72"/>`,
    '</linearGradient>',
    `<radialGradient id="${uid}-glow">`,
    `<stop offset="0" stop-color="${glow}" stop-opacity="0.8"/>`,
    `<stop offset="1" stop-color="${glow}" stop-opacity="0"/>`,
    '</radialGradient>',
    '</defs>',
  ];
}

/**
 * `instance` делает идентификаторы градиентов уникальными, когда на странице
 * несколько копий одной сцены; без этого aria-labelledby и fill ссылаются
 * на первый попавшийся `<defs>`.
 *
 * У каждой сцены своя бумажная композиция — однотипных «иконок на фоне» больше нет.
 */
export function renderSceneSvg(id: SceneId, theme: ThemeName, instance = ''): string {
  const scene = getScene(id);
  const palette = PALETTES[theme];
  const random = makeRandom(seedFrom(`${id}|${theme}`));
  const { width: w, height: h } = scene;
  const uid = `art-${id}-${theme}${instance ? `-${instance}` : ''}`;
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${titleId} ${descId}">`,
    `<title id="${titleId}">${escapeXml(scene.titleRu)}</title>`,
    `<desc id="${descId}">${escapeXml(scene.titleEn)}. ${escapeXml(DESCRIPTIONS[id])}</desc>`,
    ...renderDefs(uid, palette.sky, palette.glow),
    `<rect width="${w}" height="${h}" fill="url(#${uid}-sky)"/>`,
    ...COMPOSITIONS[id]({ w, h, p: palette, random }),
    '</svg>',
  ];
  return parts.join('\n');
}
