/**
 * Browser and API regression suite for the v69 stack.
 *
 * Targets the new ports: web 3000, API 8787 (both overridable by env).
 * By default it expects both servers to be running. Set
 * SECRET_SANTA_V69_START_SERVERS=1 to let the runner start and stop them.
 *
 * Usage:
 *   npm run verify:frontend:v69:quick   # without Lighthouse
 *   npm run verify:frontend:v69         # + 6 Lighthouse runs (3 themes x RU/EN)
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const WEB = process.env.SECRET_SANTA_WEB_BASE ?? 'http://127.0.0.1:3000';
const API = process.env.SECRET_SANTA_API_BASE ?? 'http://127.0.0.1:8787';
const QUICK = process.argv.includes('--quick');
const START = process.env.SECRET_SANTA_V69_START_SERVERS === '1';

const failures = [];
const passed = [];
const children = [];

function report(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed.push(name);
      console.log(`PASS ${name}`);
    })
    .catch((error) => {
      failures.push(name);
      console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitFor(url, timeoutMs = 90_000) {
  const started = Date.now();
  let last = '';
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok || response.status === 404) return;
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`ready gate timed out for ${url}: ${last}`);
}

async function api(pathname, init = {}) {
  const response = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, text };
}

async function post(pathname, body, token) {
  return api(pathname, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body ?? {}),
  });
}

function cleanup() {
  for (const child of children.splice(0)) {
    try {
      child.kill('SIGTERM');
    } catch {
      // already gone
    }
  }
}

if (START) {
  const apiProcess = spawn(process.execPath, ['apps/api/src/index.ts'], {
    cwd: ROOT,
    env: { ...process.env, PORT: '8787' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const webProcess = spawn('npm', ['run', 'dev'], {
    cwd: ROOT,
    env: { ...process.env, SECRET_SANTA_API_TARGET: API },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(apiProcess, webProcess);
  process.on('exit', cleanup);
}

await report('gates', async () => {
  await waitFor(`${API}/api/health`);
  await waitFor(WEB);
});

await report('api.health_and_contracts', async () => {
  const health = await api('/api/health');
  assert(health.status === 200 && health.body.ok === true, 'health is not ok');
  assert(health.body.stack === 'hono-node', 'wrong stack');
  const config = await api('/api/push/config');
  assert(config.status === 200 && 'enabled' in config.body, 'push config missing');
  const missing = await api('/api/rooms/SANTA-FFFFFF');
  assert(missing.status === 404 && missing.body.error === 'room_not_found', 'unknown room must be 404');
});

let demo;
await report('api.demo_room', async () => {
  const response = await post('/api/rooms/demo', {
    memberNames: ['Аня', 'Борис', 'Вика', 'Галя'],
  });
  assert(response.status === 201, `demo failed: ${response.text}`);
  demo = response.body;
  assert(demo.demo === true && /^SANTA-[0-9A-F]{6}$/.test(demo.code), 'bad demo code');
  assert(demo.room.members.length === 4 && demo.room.drawRunId, 'demo room incomplete');
  const assignment = await api(`/api/rooms/${demo.code}/assignment`, {
    headers: { authorization: `Bearer ${demo.token}` },
  });
  assert(assignment.body.drawn === true, 'demo assignment missing');
  assert(!('pairs' in assignment.body), 'demo leaked all pairs');
});

await report('api.groups_members_and_privacy', async () => {
  const created = await post('/api/rooms', {
    name: 'Проверка',
    organizerName: 'Аня',
    eventDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    memberNames: ['Борис', 'Вика', 'Галя'],
  });
  assert(created.status === 201, `create failed: ${created.text}`);
  const { code, token } = created.body;
  const ids = created.body.room.members.map((member) => member.id);

  const group = await post(`/api/rooms/${code}/groups`, { name: 'Семья', memberIds: ids }, token);
  assert(group.status === 201 && group.body.pairs === 6, `group failed: ${group.text}`);
  const impossible = await post(`/api/rooms/${code}/draw`, {}, token);
  assert(impossible.status === 409, 'draw must be impossible for a full exclusion group');
  const removed = await api(`/api/rooms/${code}/groups/${encodeURIComponent('Семья')}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  assert(removed.status === 200, 'group delete failed');
  const draw = await post(`/api/rooms/${code}/draw`, {}, token);
  assert(draw.status === 201, 'draw after group delete failed');

  const added = await post(`/api/rooms/${code}/members`, { name: 'Новый' }, token);
  assert(added.status === 201, 'member add failed');
  const deleted = await api(`/api/rooms/${code}/members/${added.body.memberId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  assert(deleted.status === 200, 'member delete failed');
});

await report('api.sse_replay', async () => {
  const response = await fetch(
    `${API}/api/rooms/${demo.code}/events?token=${encodeURIComponent(demo.token)}`,
  );
  assert(response.ok, 'SSE connection failed');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (let i = 0; i < 8 && !text.includes('event: connected'); i += 1) {
    const chunk = await reader.read();
    if (chunk.done) break;
    text += decoder.decode(chunk.value, { stream: true });
  }
  await reader.cancel();
  assert(/"seq":\d+/.test(text), 'SSE replay has no seq');
  assert(/"eventDbId":/.test(text), 'SSE replay has no eventDbId');
  assert(!/id: connected/.test(text), 'connected frame must have no id');
});

let browser;
let page;
await report('browser.bootstrap', async () => {
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ locale: 'ru-RU' });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location();
      consoleErrors.push(
        `${message.text()} @ ${location.url || 'unknown'}:${location.lineNumber ?? 0}`,
      );
    }
  });
  await page.goto(WEB, { waitUntil: 'networkidle' });
  assert(await page.locator('html[lang="ru"]').count() === 1, 'RU html lang missing');
  assert(await page.locator('html[data-theme="winter"]').count() === 1, 'winter theme missing');
  assert(await page.locator('#main').count() === 1, 'main landmark missing');
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
});

await report('browser.locale_theme', async () => {
  const controls = page.locator('.nav__controls .icon-button');
  await controls.nth(0).click();
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await controls.nth(1).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'midnight');
  await controls.nth(0).click();
  await controls.nth(1).click();
  await page.waitForFunction(() => document.documentElement.lang === 'ru');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'cozy');
  await controls.nth(1).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'winter');
});

await report('browser.quick_draw', async () => {
  await page.goto(`${WEB}/quick-draw`, { waitUntil: 'networkidle' });
  const textarea = page.locator('textarea').first();
  assert(await textarea.count() === 1, 'quick draw textarea missing');
  await textarea.fill('Аня\nБорис\nВика\nГаля');
  await page.getByRole('button', { name: /жеребь/i }).first().click();
  await page.waitForFunction(() => document.querySelectorAll('[data-pair]').length >= 4 ||
    /Аня|Борис|Вика|Галя/.test(document.body.innerText));
  assert(await page.locator('body').innerText().then((t) => t.includes('Аня')), 'no result');
});

await report('browser.demo_dashboard', async () => {
  // SSR загружает токен из cookie; браузерные запросы — из localStorage.
  await page.context().addCookies([
    {
      name: `ss_token_${demo.code}`,
      value: demo.token,
      url: WEB,
      sameSite: 'Lax',
    },
  ]);
  await page.addInitScript(({ code, token }) => {
    window.localStorage.setItem(`ss:v69:token:${code}`, token);
  }, { code: demo.code, token: demo.token });
  // SSE-connectivity holds an open request, so `networkidle` never settles.
  await page.goto(`${WEB}/room/${demo.code}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.dashboard .tab').length >= 4);
  assert(await page.locator('.dashboard').count() === 1, 'dashboard missing');
  assert(await page.locator('.room-code').innerText().then((t) => t.includes(demo.code)), 'room code missing');
});

await report('browser.assignment_privacy', async () => {
  const html = await page.locator('.dashboard').innerHTML();
  const allNames = ['Борис', 'Вика', 'Галя'];
  const recipientText = await page.locator('.dashboard').innerText();
  const revealed = /Борис|Вика|Галя/.test(recipientText);
  if (!revealed) {
    for (const name of allNames) assert(!html.includes(name), `${name} leaked before reveal`);
  }
});

await browser?.close();

if (!QUICK) {
  await report('lighthouse.a11y_3_themes_2_locales', async () => {
    const { chromium } = await import('playwright');
    const chromePath = process.env.CHROME_PATH ?? chromium.executablePath();
    const reportDir = mkdtempSync(path.join(tmpdir(), 'ss-v69-lh-'));
    for (const theme of ['winter', 'midnight', 'cozy']) {
      for (const locale of ['ru', 'en']) {
        const url = `${WEB}/`;
        const output = path.join(reportDir, `${theme}-${locale}.json`);
        const headers = JSON.stringify({ Cookie: `ss_locale=${locale}; ss_theme=${theme}` });
        const run = spawnSync(
          'npx',
          ['--yes', 'lighthouse@12', url, '--quiet', '--chrome-flags=--headless=new --no-sandbox',
            '--only-categories=accessibility', `--extra-headers=${headers}`,
            '--output=json', `--output-path=${output}`],
          {
            cwd: ROOT,
            encoding: 'utf8',
            timeout: 300_000,
            env: { ...process.env, CHROME_PATH: chromePath },
          },
        );
        assert(
          run.status === 0,
          `lighthouse ${theme}/${locale}: ${run.stderr.slice(-2000)}`,
        );
        const result = JSON.parse((await import('node:fs')).readFileSync(output, 'utf8'));
        const score = result.categories.accessibility.score;
        assert(score >= 1, `accessibility ${theme}/${locale} = ${score}`);
      }
    }
    writeFileSync(path.join(reportDir, 'summary.txt'), `runs=6 passed=${passed.length}\n`);
  });
}

cleanup();
console.log(`FRONTEND_V69_CHECKS ${passed.length + failures.length} FAILED ${failures.length}`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exitCode = 1;
}
