import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../apps/web/src/app/styles/motion.css', import.meta.url), 'utf8');
const globalCss = readFileSync(new URL('../apps/web/src/app/styles/global.css', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const MOTION_TOKENS = [
  '--santa-ease-ui',
  '--santa-ease-enter',
  '--santa-dur-control',
  '--santa-dur-nav',
  '--santa-dur-progress',
  '--santa-dur-notice',
  '--santa-dur-result',
  '--santa-dur-motion',
  '--santa-dur-reveal',
  '--santa-dur-hero',
  '--santa-dur-cheer',
  '--santa-delay-hero',
  '--santa-delay-stagger',
];

const EXPECTED_IMPORTS = [
  'animate.css/source/_vars.css',
  'animate.css/source/_base.css',
  'animate.css/source/zooming_entrances/zoomIn.css',
  'animate.css/source/fading_entrances/fadeInUp.css',
  'animate.css/source/attention_seekers/headShake.css',
  'animate.css/source/fading_entrances/fadeInDown.css',
  'animate.css/source/attention_seekers/pulse.css',
];

test('motion.css imports only the curated animate.css effects', () => {
  const imports = [...css.matchAll(/^@import '([^']+)';$/gm)].map((match) => match[1]);
  assert.deepEqual(imports, EXPECTED_IMPORTS);
  assert.equal(css.includes('animate.min.css'), false);
  assert.equal(css.includes("import 'animate.css'"), false);
});

test('motion tokens are defined once and drive both style layers', () => {
  for (const token of MOTION_TOKENS) {
    assert.match(globalCss, new RegExp(`${token}:`));
  }
  assert.match(css, /--animate-duration: var\(--santa-dur-motion\)/);
  assert.match(css, /--animate-delay: var\(--santa-delay-stagger\)/);
  assert.doesNotMatch(css, /animation-duration: \d/);
  assert.match(globalCss, /animation: festive-rise var\(--santa-dur-hero\) var\(--santa-ease-enter\)/);
});

test('reduced-motion rule also clears animation delay', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-delay: 0ms !important/);
});

test('animate.css is pinned and its license is vendored', () => {
  assert.equal(pkg.dependencies['animate.css'], '4.1.1');
  assert.equal(existsSync(new URL('../LICENSES/animate.css.txt', import.meta.url)), true);
});
