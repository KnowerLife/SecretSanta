import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const failures = [];
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ru-RU' });
  const p = await ctx.newPage();
  const imgReqs = [];
  p.on('response', async r => {
    if (r.url().includes('/assets/images/')) {
      let size = 0; try { size = (await r.body()).length; } catch {}
      imgReqs.push({ f: r.url().split('/').pop(), size });
    }
  });
  await p.goto(`http://127.0.0.1:8080/?lazy=${Date.now()}#home`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const initial = imgReqs.reduce((a, x) => a + x.size, 0);
  await p.evaluate(() => { const d = document.querySelector('#homeInfo'); if (d) d.open = true; });
  await p.waitForTimeout(150);

  for (let y = 0; y < await p.evaluate(() => document.body.scrollHeight); y += 600) {
    await p.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y);
    await p.waitForTimeout(120);
  }
  await p.waitForTimeout(300);
  const homeArt = await p.evaluate(() => [...document.querySelectorAll('.section-head--art, .cta-card--art')]
    .filter(el => el.offsetParent !== null)
    .map(el => ({ cls: [...el.classList].find(c => c.startsWith('art-') || c === 'cta-card--art'), set: !!el.style.getPropertyValue('--art-image') })));

  const viewArt = [];
  for (const nav of ['create', 'join', 'quick']) {
    await p.evaluate(n => document.querySelector(`[data-nav="${n}"]`)?.click(), nav);
    await p.waitForTimeout(250);
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await p.waitForTimeout(250);
    viewArt.push(...await p.evaluate(() => [...document.querySelectorAll('.view.active .section-head--art')]
      .map(el => ({ cls: [...el.classList].find(c => c.startsWith('art-')), set: !!el.style.getPropertyValue('--art-image') }))));
  }

  const unset = [...homeArt, ...viewArt].filter(x => !x.set);
  const loaded = await p.evaluate(() => [...document.querySelectorAll('img')]
    .filter(i => i.src.includes('/assets/images/') && i.offsetParent !== null)
    .every(i => i.complete && i.naturalWidth > 0));
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (unset.length || !loaded || overflow !== 0) failures.push({ width, initialKB: Math.round(initial / 1024), unset, loaded, overflow });
  console.log(JSON.stringify({ width, initialKB: Math.round(initial / 1024), homeArt, viewArt, loaded, overflow }));
  await ctx.close();
}
console.log('LAZY_ART_FAILURES', failures.length);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
