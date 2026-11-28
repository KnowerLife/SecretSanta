import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const footer = readFileSync(new URL('../apps/web/src/widgets/SiteFooter.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../apps/web/src/app/styles/global.css', import.meta.url), 'utf8');
const i18n = readFileSync(new URL('../packages/shared/src/i18n-data.ts', import.meta.url), 'utf8');

const titleRule = css.match(/\.footer-title\s*\{([^}]*)\}/)?.[1] ?? '';

test('footer bottom is a list without decorative dot separators', () => {
  assert.match(footer, /<ul className="footer-bottom__list">/);
  assert.doesNotMatch(footer, />·</);
  assert.match(footer, /href="#top"/);
});

test('external footer links keep their visible text in the accessible name', () => {
  assert.match(footer, /\{t\('footer\.copy'\)\}\s*<span className="sr-only">/);
  assert.match(footer, /GitHub\s*<span className="sr-only">/);
  assert.doesNotMatch(footer, /aria-label=\{t\('footer\.(copyLink|github)'\)\}/);
});

test('footer titles use readable sentence case', () => {
  assert.ok(titleRule, '.footer-title rule is missing');
  assert.doesNotMatch(titleRule, /text-transform:\s*uppercase/);
  assert.doesNotMatch(titleRule, /letter-spacing:/);
});

test('footer context strings exist in both locales', () => {
  for (const key of ['footer.copyContext', 'footer.githubContext', 'footer.toTop']) {
    assert.equal(i18n.split(`'${key}':`).length - 1, 2, `${key} must be translated twice`);
  }
});
