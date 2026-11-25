import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true });
const failures = [];
let checked = 0;

const viewports = [
  { w: 320, h: 568, name: '320' },
  { w: 375, h: 812, name: '375' },
  { w: 390, h: 844, name: '390' },
  { w: 768, h: 1024, name: '768' },
  { w: 1024, h: 768, name: '1024' },
  { w: 1920, h: 1080, name: '1920' },
  { w: 844, h: 390, name: 'landscape' },
];

for (const theme of ['winter', 'midnight', 'cozy']) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'ru-RU', serviceWorkers: 'block' });
    await ctx.addInitScript(t => {
      localStorage.setItem('secret-santa-theme', t);
      localStorage.setItem('secret-santa-lang', 'ru');
    }, theme);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?states=${theme}-${vp.name}#home`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#demoBtn').click();
    await page.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));

    const measure = async (label, selector) => {
      checked++;
      const r = await page.evaluate(({ selector, vp }) => {
        const de = document.documentElement;
        const el = document.querySelector(selector);
        const active = document.querySelector('.view.active');
        const visible = el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
        const box = visible ? el.getBoundingClientRect() : null;
        const small = [];
        const scope = el || active;
        for (const b of scope.querySelectorAll('button, a, input, select, textarea, [role="button"]')) {
          const s = getComputedStyle(b), q = b.getBoundingClientRect();
          if (s.display === 'none' || s.visibility === 'hidden' || q.width <= 0 || q.height <= 0) continue;
          if (q.height < 40 && !b.disabled) small.push({ id: b.id, text: (b.innerText || '').trim().slice(0, 24), h: Math.round(q.height) });
        }
        return {
          overflow: de.scrollWidth > de.clientWidth + 1,
          scrollW: de.scrollWidth,
          clientW: de.clientWidth,
          visible,
          box: box ? [Math.round(box.left), Math.round(box.top), Math.round(box.right), Math.round(box.bottom)] : null,
          small: small.slice(0, 8),
        };
      }, { selector, vp });
      if (r.overflow || r.clientW !== vp.w || !r.visible || r.small.length) {
        failures.push({ theme, vp: vp.name, label, ...r });
      }
      if (r.box && (r.box[0] < -1 || r.box[2] > vp.w + 1)) {
        failures.push({ theme, vp: vp.name, label, issue: 'outside-horizontal', box: r.box });
      }
      if (label === 'confirm-modal' && r.box && (r.box[1] < -1 || r.box[3] > vp.h + 1)) {
        failures.push({ theme, vp: vp.name, label, issue: 'modal-outside-vertical', box: r.box });
      }
    };

    await measure('chat-panel', '#chatPanel');
    await page.locator('#chatTabSanta').click();
    await measure('chat-tab-santa', '#chatPanel');
    await page.locator('[data-dash-tab="access"]').click();
    await page.waitForFunction(() => document.querySelector('[data-dash-pane="access"]')?.classList.contains('is-active'));
    await page.locator('#activityPanel').scrollIntoViewIfNeeded();
    await measure('activity-panel', '#activityPanel');

    await page.locator('#resetDrawBtn').click();
    await page.waitForFunction(() => !document.querySelector('#confirmModal').classList.contains('hidden'));
    await measure('confirm-modal', '#confirmModal .modal-card');
    await page.locator('[data-close-confirm]').last().click();

    await ctx.close();
  }
}

console.log(JSON.stringify({ checked, failures }, null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
