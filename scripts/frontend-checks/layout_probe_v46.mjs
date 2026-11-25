import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true });
const viewports = [
  { w: 320, h: 700, name: '320' },
  { w: 375, h: 812, name: '375' },
  { w: 768, h: 1024, name: '768' },
  { w: 1024, h: 768, name: '1024' },
  { w: 1920, h: 1080, name: '1920' },
  { w: 844, h: 390, name: 'landscape' },
];
const failures = [];
for (const theme of ['winter', 'midnight', 'cozy']) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'ru-RU', serviceWorkers: 'block' });
    await ctx.addInitScript(t => { localStorage.setItem('secret-santa-theme', t); localStorage.setItem('secret-santa-lang', 'ru'); }, theme);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?layout=${theme}-${vp.name}#home`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    for (const v of ['home', 'create', 'join', 'quick', 'dashboard']) {
      if (v === 'dashboard') {
        await page.evaluate(() => document.querySelector('.nav a[data-nav="home"]')?.click());
        await page.waitForFunction(() => document.querySelector('#view-home')?.classList.contains('active'));
        await page.locator('#demoBtn').click();
        await page.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
      } else {
        await page.evaluate(v => document.querySelector(`.nav a[data-nav="${v}"]`)?.click(), v);
        await page.waitForFunction(v => document.querySelector(`#view-${v}`)?.classList.contains('active'), v);
      }
      const r = await page.evaluate(({ v, vp }) => {
        const de = document.documentElement;
        const active = document.querySelector('.view.active');
        const rects = {};
        for (const sel of ['.hero-preview', '.section-pair', '.dash-grid', '.game-header__body', '.quick-result-card']) {
          const el = document.querySelector(sel);
          if (!el || !el.getClientRects().length) continue;
          const b = el.getBoundingClientRect();
          rects[sel] = [Math.round(b.left), Math.round(b.right), Math.round(b.width)];
        }
        const heroCols = (() => { const h = document.querySelector('.hero'); return h ? getComputedStyle(h).gridTemplateColumns.split(' ').length : null; })();
        const dashCols = (() => { const d = document.querySelector('.dash-grid'); return d ? getComputedStyle(d).gridTemplateColumns.split(' ').length : null; })();
        return {
          overflow: de.scrollWidth > de.clientWidth + 1,
          activeOverflow: active.scrollWidth > active.clientWidth + 1,
          scrollW: de.scrollWidth, clientW: de.clientWidth,
          rects, heroCols, dashCols,
        };
      }, { v, vp });
      if (r.overflow || r.activeOverflow || r.clientW !== vp.w) failures.push({ theme, vp: vp.name, v, ...r });
      if (v === 'home') {
        const expected = vp.w <= 760 ? 1 : 2;
        if (r.heroCols !== expected) failures.push({ theme, vp: vp.name, v, issue: 'heroCols', got: r.heroCols, expected });
        for (const [sel, b] of Object.entries(r.rects)) {
          if (b[0] < -1 || b[1] > vp.w + 1) failures.push({ theme, vp: vp.name, v, issue: 'rect', sel, b });
        }
      }
      if (v === 'dashboard') {
        const expected = vp.w <= 980 ? 1 : 12;
        if (r.dashCols !== expected) failures.push({ theme, vp: vp.name, v, issue: 'dashCols', got: r.dashCols, expected });
      }
    }
    await ctx.close();
  }
}
console.log(JSON.stringify({ failures, checked: viewports.length * 3 * 5 }, null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
