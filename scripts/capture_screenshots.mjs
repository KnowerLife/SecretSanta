/**
 * Regenerates README screenshots from real UI scenarios.
 *
 * Requirements:
 *   - frontend: python3 -m http.server 8080 (from the project root)
 *   - backend:  PYTHONPATH=backend python3 -m app.server --host 127.0.0.1 --port 8000
 *   - Playwright: npm i --no-save playwright && npx playwright install chromium
 *
 * Optional env:
 *   SECRET_SANTA_BASE       frontend URL (default http://127.0.0.1:8080)
 *   SECRET_SANTA_API        backend URL (default http://127.0.0.1:8000)
 *   SECRET_SANTA_SHOTS_OUT  output directory (default ../docs/screenshots)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SECRET_SANTA_BASE || 'http://127.0.0.1:8080';
const API = process.env.SECRET_SANTA_API || 'http://127.0.0.1:8000';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SECRET_SANTA_SHOTS_OUT || path.resolve(HERE, '..', 'docs', 'screenshots');

fs.mkdirSync(OUT, { recursive: true });
for (const file of fs.readdirSync(OUT)) {
  if (file.endsWith('.jpg')) fs.rmSync(path.join(OUT, file));
}

let shotNo = 0;
const browser = await chromium.launch({ headless: true });

async function newPage(lang, { width = 1440, height = 900, theme = 'winter' } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: lang === 'ru' ? 'ru-RU' : 'en-US',
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/?shot=${Date.now()}-${shotNo++}#home`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ lng, thm }) => {
    localStorage.setItem('secret-santa-lang', lng);
    localStorage.setItem('secret-santa-theme', thm);
    localStorage.removeItem('secret-santa-simple-v1');
    localStorage.removeItem('secret-santa-offline-queue');
    localStorage.removeItem('secret-santa-chat-cache');
  }, { lng: lang, thm: theme });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('#view-home')?.classList.contains('active'));
  return { context, page };
}

function shotPath(name) { return path.join(OUT, `${name}.jpg`); }
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: shotPath(name), type: 'jpeg', quality: 88 });
  console.log('saved', name);
}
async function shotEl(page, selector, name) {
  await page.evaluate(() => document.fonts.ready);
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: shotPath(name), type: 'jpeg', quality: 88 });
  console.log('saved', name);
}
async function go(page, view) {
  await page.evaluate(n => document.querySelector(`.nav a[data-nav="${n}"]`)?.click(), view);
  await page.waitForFunction(n => document.querySelector(`#view-${n}`)?.classList.contains('active'), view);
}

async function captureHome(lang, suffix) {
  const { context, page } = await newPage(lang);
  await shot(page, `home-hero${suffix}`);
  await context.close();
}

async function captureCreate(lang, suffix) {
  const { context, page } = await newPage(lang);
  await go(page, 'create');
  const values = lang === 'ru'
    ? ['Новый год в офисе', 'Анна', '2026-12-31', '1000', '2500', 'Уютные и полезные подарки']
    : ['Office New Year', 'Anna', '2026-12-31', '1000', '2500', 'Cozy and useful gifts'];
  await page.fill('#gameName', values[0]);
  await page.fill('#organizerName', values[1]);
  await page.fill('#eventDate', values[2]);
  await page.fill('#budgetMin', values[3]);
  await page.fill('#budgetMax', values[4]);
  await page.fill('#theme', values[5]);
  await shot(page, `create-game${suffix}`);
  await context.close();
}

async function captureJoin(lang, suffix) {
  const { context, page } = await newPage(lang);
  await go(page, 'join');
  await page.fill('#joinCode', 'SANTA-DEMO');
  await page.fill('#joinName', lang === 'ru' ? 'Анна' : 'Anna');
  await shot(page, `join-game${suffix}`);
  await context.close();
}

async function loadDemoRoom(page) {
  await page.evaluate(() => document.querySelector('#demoBtn')?.click());
  await page.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
  await page.waitForFunction(() => (document.querySelector('#gameCodeLabel')?.textContent || '').includes('DEMO-SANTA'));
  await page.evaluate(() => document.querySelector('#drawBtn')?.click());
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('secret-santa-simple-v1') || '{}');
    const code = s.session?.gameCode;
    return code && Object.keys(s.games?.[code]?.assignments || {}).length > 0;
  });
  if (await page.locator('#revealBtn').isVisible()) {
    await page.locator('#revealBtn').click();
    await page.waitForTimeout(200);
  }
}

async function captureDemo(lang, suffix) {
  const { context, page } = await newPage(lang);
  await loadDemoRoom(page);
  await shot(page, `dashboard-demo${suffix}`);
  await context.close();
}

async function captureInvite(lang, suffix) {
  const { context, page } = await newPage(lang);
  await loadDemoRoom(page);
  await page.evaluate(() => document.querySelector('#inviteBtn')?.click());
  await page.waitForFunction(() => (document.querySelector('#inviteText')?.value || '').length > 20);
  await shotEl(page, '#accessPanel', `invite-share${suffix}`);
  await context.close();
}

async function captureWishlist(lang, suffix) {
  const { context, page } = await newPage(lang);
  await loadDemoRoom(page);
  await page.waitForFunction(() => {
    const el = document.querySelector('#recipientWishlist');
    return el && !el.classList.contains('hidden');
  });
  const panel = page.locator('#recipientWishlist').locator('xpath=ancestor::article[1]');
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: shotPath(`recipient-wishlist${suffix}`), type: 'jpeg', quality: 88 });
  console.log('saved', `recipient-wishlist${suffix}`);
  await context.close();
}

async function createOnlineRoom(page, lang) {
  await go(page, 'create');
  await page.fill('#gameName', lang === 'ru' ? 'Секретный Санта команды' : 'Team Secret Santa');
  await page.fill('#organizerName', lang === 'ru' ? 'Организатор' : 'Organizer');
  await page.fill('#eventDate', '2026-12-31');
  await page.fill('#theme', lang === 'ru' ? 'Поделки и книги' : 'Crafts and books');
  await page.locator('#createForm button[type="submit"]').click();
  await page.waitForFunction(() => (document.querySelector('#gameCodeLabel')?.textContent || '').startsWith('SANTA-'));

  const info = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('secret-santa-simple-v1'));
    const code = s.session.gameCode;
    return { code, inviteToken: s.backend.rooms[code].inviteToken };
  });
  const guests = lang === 'ru' ? ['Анна', 'Илья', 'Мария'] : ['Anna', 'Ilya', 'Maria'];
  for (const name of guests) {
    const res = await fetch(`${API}/api/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: info.code, name, inviteToken: info.inviteToken }),
    });
    if (!res.ok) throw new Error(`join ${name}: ${res.status} ${await res.text()}`);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => (document.querySelector('#gameCodeLabel')?.textContent || '').startsWith('SANTA-'));
  await page.waitForFunction(() => document.querySelectorAll('#participantList li, #participantsList li').length >= 4, null, { timeout: 10000 });
  await page.locator('#drawBtn').click();
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('secret-santa-simple-v1') || '{}');
    const code = s.session?.gameCode;
    return code && Object.keys(s.games?.[code]?.assignments || {}).length > 0;
  }, null, { timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('#activityList li').length > 0, null, { timeout: 10000 });
}

async function captureOnline(lang, suffix) {
  const { context, page } = await newPage(lang);
  await createOnlineRoom(page, lang);

  await shotEl(page, '#activityPanel', `activity-log${suffix}`);

  const message = lang === 'ru' ? 'Привет! Какой у вас размер?' : 'Hi! What size do you wear?';
  await page.fill('#chatInput', message);
  await page.locator('#chatForm button[type="submit"]').click();
  await page.waitForFunction(m => (document.querySelector('#chatMessages')?.textContent || '').includes(m), message, { timeout: 10000 });
  await shotEl(page, '#chatPanel', `chat-messages${suffix}`);
  await context.close();
}

async function captureQuick(lang, suffix) {
  const { context, page } = await newPage(lang);
  await go(page, 'quick');
  const names = lang === 'ru'
    ? 'Аня\nБоря\nВитя\nГаля\nДима'
    : 'Anna\nBoris\nVictor\nGalina\nDmitry';
  await page.fill('#quickNames', names);
  await page.locator('#quickDrawBtn').click();
  await page.waitForFunction(() => document.querySelectorAll('#quickResultList li').length >= 5);
  await shotEl(page, '#quickResultCard', `quick-draw${suffix}`);
  await context.close();
}

async function captureInstall(lang, suffix) {
  const { context, page } = await newPage(lang);
  await shotEl(page, '#installCard', `install-footer${suffix}`);
  await context.close();
}

async function captureThemes() {
  const { context, page } = await newPage('ru');
  await page.locator('#themeToggle').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'midnight');
  await shot(page, 'theme-midnight-ru');
  await page.locator('#themeToggle').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'cozy');
  await shot(page, 'theme-cozy-ru');
  await context.close();
}

async function captureMobile() {
  const { context, page } = await newPage('ru', { width: 390, height: 844 });
  await shot(page, 'mobile-home-ru');
  await go(page, 'quick');
  await page.fill('#quickNames', 'Аня\nБоря\nВитя\nГаля\nДима');
  await page.locator('#quickDrawBtn').click();
  await page.waitForFunction(() => document.querySelectorAll('#quickResultList li').length >= 5);
  await shot(page, 'mobile-quick-ru');
  await context.close();
}

for (const [lang, suffix] of [['ru', '-ru'], ['en', '-en']]) {
  await captureHome(lang, suffix);
  await captureCreate(lang, suffix);
  await captureJoin(lang, suffix);
  await captureDemo(lang, suffix);
  await captureInvite(lang, suffix);
  await captureWishlist(lang, suffix);
  await captureOnline(lang, suffix);
  await captureQuick(lang, suffix);
  await captureInstall(lang, suffix);
}
await captureThemes();
await captureMobile();

await browser.close();
console.log('ALL_SCREENSHOTS_DONE');
