import assert from 'node:assert/strict';
import test from 'node:test';
import { PALETTES, SCENES, renderSceneSvg } from './index.ts';

test('каталог содержит ровно 36 уникальных сцен', () => {
  assert.equal(SCENES.length, 36);
  assert.equal(new Set(SCENES.map((scene) => scene.id)).size, 36);
});

test('у каждой сцены своя композиция, а не одна иконка на общем фоне', () => {
  const signatures = new Map<string, string>();
  for (const scene of SCENES) {
    const signature = renderSceneSvg(scene.id, 'winter')
      .replace(/art-[^" ]+/g, 'uid')
      .replace(/#[0-9A-Fa-f]{6}/g, 'color')
      .replace(/-?\d+(?:\.\d+)?/g, '#')
      .replace(/\s+/g, ' ')
      .trim();
    assert.equal(signatures.has(signature), false, `одинаковая композиция: ${scene.id}`);
    signatures.set(signature, scene.id);
  }
  assert.equal(signatures.size, SCENES.length);
});

test('рендер детерминирован для сцены и темы', () => {
  for (const scene of SCENES) {
    const first = renderSceneSvg(scene.id, 'winter');
    const second = renderSceneSvg(scene.id, 'winter');
    assert.equal(first, second, `нестабильный рендер: ${scene.id}`);
  }
});

test('несколько копий сцены не конфликтуют по идентификаторам', () => {
  const first = renderSceneSvg('guide-format', 'winter', 'a');
  const second = renderSceneSvg('guide-format', 'winter', 'b');
  assert.match(first, /id="art-guide-format-winter-a-title"/);
  assert.match(second, /id="art-guide-format-winter-b-title"/);
  assert.equal(first.includes('art-guide-format-winter-b-'), false);
  assert.equal(second.includes('art-guide-format-winter-a-'), false);
});

test('каждая сцена валидна, доступна и меняет палитру', () => {
  for (const scene of SCENES) {
    for (const theme of ['winter', 'midnight', 'cozy'] as const) {
      const svg = renderSceneSvg(scene.id, theme);
      assert.match(svg, /<svg[^>]*role="img"/);
      assert.match(svg, /aria-labelledby=/);
      assert.match(svg, /<title\b/);
      assert.match(svg, /<desc\b/);
      assert.ok(svg.includes(`viewBox="0 0 ${scene.width} ${scene.height}"`));
      assert.ok(svg.includes(PALETTES[theme].sky), `нет палитры ${theme}: ${scene.id}`);
      assert.equal(svg.includes('undefined'), false);
    }
  }
});
