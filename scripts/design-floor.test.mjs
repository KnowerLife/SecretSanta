import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../apps/web/src/app/styles/global.css', import.meta.url), 'utf8');
const i18n = readFileSync(new URL('../packages/shared/src/i18n-data.ts', import.meta.url), 'utf8');
const progress = readFileSync(
  new URL('../apps/web/src/features/dashboard/ProgressPanel.tsx', import.meta.url),
  'utf8',
);

test('horizontal scroll is clipped on both html and body', () => {
  assert.match(css, /html,\s*body\s*\{[^}]*overflow-x:\s*clip/s);
  assert.doesNotMatch(css, /body\s*\{[^}]*overflow-x:\s*hidden/s);
});

test('progress bar animates transform instead of width', () => {
  assert.match(css, /\.progress-bar__fill\s*\{[^}]*transition:\s*transform/s);
  assert.match(progress, /scaleX\(/);
  assert.doesNotMatch(progress, /style=\{\{\s*width:/);
});

test('marketing copy contains no fabricated testimonials', () => {
  assert.doesNotMatch(i18n, /testimonials\.\d+\.(name|role|text)/);
});
