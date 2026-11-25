import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ru-RU' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${BASE}/?pwa=${Date.now()}#home`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => navigator.serviceWorker?.ready);
await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 10000 });

const info = await page.evaluate(async () => {
  const manifestHref = document.querySelector('link[rel="manifest"]')?.href;
  const manifest = await fetch(manifestHref).then(r => r.json());
  const iconStatus = await Promise.all(manifest.icons.map(async i => ({
    src: i.src,
    status: (await fetch(new URL(i.src, manifestHref))).status,
  })));
  const cached = await caches.keys();
  const cache = await caches.open(cached[0]);
  const keys = await cache.keys();
  return {
    manifestHref,
    name: manifest.name,
    display: manifest.display,
    icons: iconStatus,
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    cacheName: cached[0],
    cachedUrls: keys.map(r => new URL(r.url).pathname + new URL(r.url).search).sort(),
    themeColor: document.querySelector('meta[name="theme-color"]')?.content,
    appleIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
    viewport: document.querySelector('meta[name="viewport"]')?.content,
  };
});

await page.locator('#themeToggle').click();
const midnightTheme = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  color: document.querySelector('meta[name="theme-color"]')?.content,
}));

await page.locator('#installFooterBtn').click();
const installToast = await page.locator('#toastLayer').innerText();

await ctx.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
const offline = await page.evaluate(() => ({
  title: document.title,
  homeActive: document.querySelector('#view-home')?.classList.contains('active'),
  demoVisible: !!document.querySelector('#demoBtn')?.getClientRects().length,
  offlineBanner: !document.querySelector('#offlineBanner')?.classList.contains('hidden'),
}));
await ctx.setOffline(false);

console.log(JSON.stringify({ info, midnightTheme, installToast, offline, errors }, null, 2));
await browser.close();

const pwaBad = errors.length || !info.cachedUrls.some(u => u.startsWith('/src/')) || !offline.homeActive || !offline.demoVisible || !offline.offlineBanner;
console.log('PWA_BAD', pwaBad ? 1 : 0);
if (pwaBad) process.exitCode = 1;
