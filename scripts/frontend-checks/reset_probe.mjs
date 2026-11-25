import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const resetFailures = [];
for (const vp of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'ru-RU', serviceWorkers: 'block' });
  await ctx.addInitScript(() => { localStorage.setItem('secret-santa-lang', 'ru'); localStorage.setItem('secret-santa-theme', 'winter'); });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8080/?resetprobe=' + vp.width + '#home', { waitUntil: 'domcontentloaded' });
  await page.locator('#demoBtn').click();
  await page.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
  const snap = () => page.evaluate(() => {
    const ids = ['gameArea', 'gameHeader', 'gameTitleLabel', 'gameMetaLabel', 'countdownLabel', 'backendStatusLabel', 'drawBtn', 'revealBtn', 'resetDrawBtn', 'leaveBtn', 'dashGrid', 'myAssignment'];
    const out = {};
    for (const id of ids) {
      const el = document.getElementById(id) || (id === 'gameHeader' ? document.querySelector('.game-header') : null) || (id === 'dashGrid' ? document.querySelector('.dash-grid') : null);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      out[id] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), hidden: el.classList.contains('hidden'), vis: s.display !== 'none' && s.visibility !== 'hidden', text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50) };
    }
    out._scroll = { w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight };
    return out;
  });
  const before = await snap();
  await page.locator('#resetDrawBtn').click();
  await page.locator('#confirmOkBtn').click();
  await page.waitForTimeout(300);
  const after = await snap();
  console.log(JSON.stringify({ vp: vp.width, before, after }, null, 2));
  if (!before.resetDrawBtn?.vis || after.resetDrawBtn?.vis || after._scroll.w !== after._scroll.cw) {
    resetFailures.push(vp.width);
  }
  await ctx.close();
}
await browser.close();
console.log('RESET_FAILURES', resetFailures.length, resetFailures.join(','));
if (resetFailures.length) process.exitCode = 1;