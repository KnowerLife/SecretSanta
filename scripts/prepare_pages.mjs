/**
 * GitHub Pages раздаёт статику из подпапки репозитория. Prerender отдаёт
 * корневые ссылки, поэтому после сборки переписываем их на базовый путь и
 * добавляем SPA-fallback через 404.html.
 */

import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'SecretSanta';
const rawBase = process.env.PAGES_BASE ?? `/${repo}`;
const base = `/${rawBase.replace(/^\/+|\/+$/g, '')}/`;
const outDir = join(process.cwd(), 'dist/client');

async function htmlFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

function prefix(html) {
  return html
    // Встроенный поток TanStack Start содержит URL чанков в кавычках и бэктиках.
    .replace(/(["'`])\/assets\//g, `$1${base}assets/`)
    .replace(/(["'`])\.\/assets\//g, `$1${base}assets/`)
    .replace(/((?:href|src)=")\/((?!\/)[^"#]*)/g, (whole, attr, path) => {
      if (path.startsWith(base.slice(1))) return whole;
      return `${attr}${base}${path}`;
    });
}

const files = await htmlFiles(outDir);
for (const file of files) {
  const html = await readFile(file, 'utf8');
  await writeFile(file, prefix(html));
}

// Настоящий SPA--shell не привязан к маршруту: гидратация deep-link'ов
// проходит без несовпадения разметки, в отличие от копии index.html.
const shellHtml = join(outDir, '_shell.html');
const fallbackHtml = files.includes(shellHtml) ? shellHtml : join(outDir, 'index.html');
await copyFile(fallbackHtml, join(outDir, '404.html'));
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, '.nojekyll'), '');

console.log(`[pages] prepared ${files.length} html files, base=${base}`);
