/**
 * Runs the committed browser regression suite against a locally served app.
 *
 * Requirements:
 *   - frontend: python3 -m http.server 8080 (from the project root)
 *   - backend:  PYTHONPATH=backend python3 -m app.server --host 127.0.0.1 --port 8000
 *   - deps:     npm ci && npx playwright install chromium
 *
 * Usage:
 *   node scripts/verify_frontend.mjs          # all checks, including Lighthouse
 *   node scripts/verify_frontend.mjs --quick  # skip the 12 Lighthouse runs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHECKS_DIR = path.join(HERE, 'frontend-checks');

const ALL_CHECKS = [
  'spacing_probe',
  'guide_images_probe',
  'lazy_art_probe',
  'audit',
  'contrast',
  'i18n',
  'layout_probe_v46',
  'states_probe_v46',
  'guide_probe',
  'home_compact_probe',
  'ui_polish_probe',
  'quick_final_probe',
  'install_probe',
  'images_final_probe',
  'functional',
  'pwa_probe',
  'reset_probe',
  'reduced_probe',
  'lh_final',
];

const quick = process.argv.includes('--quick');
const checks = quick ? ALL_CHECKS.filter(name => name !== 'lh_final') : ALL_CHECKS;
const failed = [];

for (const name of checks) {
  const file = path.join(CHECKS_DIR, `${name}.mjs`);
  if (!existsSync(file)) {
    console.log(`FAIL ${name} (missing ${file})`);
    failed.push(name);
    continue;
  }
  const started = Date.now();
  const run = spawnSync(process.execPath, [file], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    timeout: name === 'lh_final' ? 1800000 : 600000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = run.status === 0 && !run.error;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${seconds}s)`);
  if (!ok) {
    const detail = [run.error?.message, run.stderr, run.stdout].filter(Boolean).join('\n').trim();
    if (detail) console.log(detail.slice(-2500));
    failed.push(name);
  }
}

console.log(`FRONTEND_CHECKS ${checks.length} FAILED ${failed.length}`);
if (failed.length) {
  console.log(`FAILED_CHECKS ${failed.join(',')}`);
  process.exitCode = 1;
}
