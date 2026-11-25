import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.SECRET_SANTA_BASE || 'http://127.0.0.1:8080';
const OUT = process.env.SECRET_SANTA_LH_OUT || join(tmpdir(), 'secret-santa-lighthouse');
const PORT = Number(process.env.SECRET_SANTA_LH_PORT || 9333);
const profile = mkdtempSync(join(tmpdir(), 'lh-secret-santa-'));
mkdirSync(OUT, { recursive: true });
let chromeLog = '';
const chrome = spawn(chromium.executablePath(), [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  `--remote-debugging-port=${PORT}`,
  '--remote-allow-origins=*',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
chrome.stderr.on('data', (chunk) => { chromeLog = (chromeLog + chunk.toString()).slice(-4000); });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function waitForCdp() {
  for (let i = 0; i < 300; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`CDP did not start: ${chromeLog.trim() || 'no Chrome output'}`);
}

const results = [];
try {
  await waitForCdp();
  // Playwright must disconnect before Lighthouse attaches to the same Chrome target.
  const prepare = async ({ lang, theme, view }) => {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
    try {
      const context = browser.contexts()[0];
      const page = context.pages()[0] || await context.newPage();
      page.setDefaultNavigationTimeout(60000);
      await page.goto(`${BASE}/?lh-setup=${Date.now()}#home`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async ({ lang, theme }) => {
        try {
          const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
          await Promise.all(regs.map(r => r.unregister()));
        } catch {}
        localStorage.setItem('secret-santa-lang', lang);
        localStorage.setItem('secret-santa-theme', theme);
        localStorage.removeItem('secret-santa-simple-v1');
        localStorage.removeItem('secret-santa-offline-queue');
        localStorage.removeItem('secret-santa-chat-cache');
      }, { lang, theme });
      await page.reload({ waitUntil: 'domcontentloaded' });
      if (view === 'dashboard') {
        await page.locator('#demoBtn').click();
        await page.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
      }
    } finally {
      await browser.close();
    }
  };

  for (const lang of ['ru', 'en']) {
    for (const theme of ['winter', 'midnight', 'cozy']) {
      for (const view of ['home', 'dashboard']) {
        await prepare({ lang, theme, view });
        const name = `lh_${view}_${theme}_${lang}`;
        const reportPath = `${OUT}/${name}.json`;
        const runStarted = Date.now();
        console.log(`LH_START ${name}`);
        const run = spawnSync('npx', [
          '--yes', 'lighthouse@12',
          `${BASE}/#${view}`,
          '--port', String(PORT),
          '--disable-storage-reset',
          '--only-categories=accessibility,best-practices,seo,performance',
          '--output=json',
          '--output-path', reportPath,
          '--quiet',
          '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
        ], { cwd: process.cwd(), encoding: 'utf8', timeout: 300000 });
        console.log(`LH_DONE ${name} status=${run.status} seconds=${((Date.now() - runStarted) / 1000).toFixed(1)}`);
        if (run.status !== 0) {
          const detail = (run.stderr || run.stdout || '').slice(-1500);
          console.log(detail);
          results.push({ name, error: detail });
          continue;
        }
        const report = JSON.parse(readFileSync(reportPath, 'utf8'));
        results.push({
          name,
          scores: Object.fromEntries(Object.entries(report.categories).map(([k, v]) => [k, v.score])),
        });
      }
    }
  }
} catch (e) {
  results.push({ name: 'lighthouse_runner', error: String(e?.stack || e).slice(-800) });
} finally {
  chrome.kill('SIGTERM');
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log(JSON.stringify(results, null, 2));
const bad = results.filter(r => r.error || Object.values(r.scores || {}).some(v => v < 1));
console.log('LH_RUNS', results.length, 'LH_BAD', bad.length);

if (bad.length) process.exitCode = 1;
