/**
 * Отчёт неиспользуемых ключей локализации v69.
 *
 * Ключ считается использованным, если он встречается в исходниках буквально
 * либо покрывается динамическим префиксом шаблонной строки, например
 * t(`hero.trust.${index}`) или t(`dash.evt.${type}`).
 *
 * Запуск: npm run check:unused-keys --workspace @secret-santa/shared
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const { I18N } = await import(new URL('../src/i18n-data.ts', import.meta.url));

const SCAN_DIRS = [
  'apps/web/src',
  'apps/api/src',
  'packages/shared/src',
  'packages/art/src',
  'scripts',
];
const SKIP = /(^|\/)(i18n-data\.ts|i18n\.test\.ts)$/;

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?|mjs)$/.test(entry.name)) files.push(full);
  }
}
for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir));

let sources = '';
const prefixes = new Set();
for (const file of files) {
  if (SKIP.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  sources += `\n${text}`;

  // t(`group.${variable}`) — сохраняем статическую часть до интерполяции.
  for (const match of text.matchAll(/`([^`]*?)\$\{/g)) {
    const prefix = match[1]?.replace(/.*?([a-z0-9_.]*)\.$/i, '$1.');
    if (prefix && prefix.endsWith('.')) prefixes.add(prefix);
  }
  // 'group.' + variable — строковый префикс конкатенации.
  for (const match of text.matchAll(/['"]([a-z][a-z0-9_.]*\.)['"]\s*\+/gi)) {
    if (match[1]) prefixes.add(match[1]);
  }
}

const unused = Object.keys(I18N.ru)
  .filter((key) => {
    if (sources.includes(key)) return false;
    return ![...prefixes].some((prefix) => key.startsWith(prefix));
  })
  .sort();

console.log(`keys=${Object.keys(I18N.ru).length} dynamic_prefixes=${prefixes.size} unused=${unused.length}`);
for (const key of unused) console.log(key);
if (unused.length) process.exitCode = 1;
