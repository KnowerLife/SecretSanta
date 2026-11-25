import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const failures = [];
for (const width of [1440, 768, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ru-RU' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
  await p.goto(`http://127.0.0.1:8080/?compact=${Date.now()}#home`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { localStorage.setItem('secret-santa-lang', 'ru'); localStorage.removeItem('secret-santa-simple-v1'); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.evaluate(() => document.fonts.ready);

  const closed = await p.evaluate(() => {
    const h = s => { const el = document.querySelector(s); return el ? Math.round(el.getBoundingClientRect().height) : null; };
    const info = document.querySelector('#homeInfo');
    return {
      scrollH: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      infoOpen: info?.open,
      infoH: h('#homeInfo'),
      guideH: h('#siteGuide'),
      modesH: h('.mode-grid'),
      modeCards: document.querySelectorAll('.mode-card').length,
      heroImg: document.querySelector('.guide__media img')?.getAttribute('src'),
      heroImgOk: (() => { const i = document.querySelector('.guide__media img'); return !!i && i.complete && i.naturalWidth > 0; })(),
      summary: document.querySelector('#homeInfo summary')?.textContent.trim().replace(/\s+/g, ' '),
      smallTargets: [...document.querySelectorAll('#siteGuide .guide__step, .mode-card .btn, #siteGuide .guide__actions .btn')]
        .map(el => ({ cls: el.className, h: Math.round(el.getBoundingClientRect().height) }))
        .filter(x => x.h < 44),
    };
  });
  if (closed.infoOpen !== false || closed.modeCards !== 3 || closed.overflow !== 0 || closed.smallTargets.length) failures.push({ width, closed });

  await p.evaluate(() => document.querySelector('#siteGuideRail [data-guide-step="2"]')?.click());
  await p.waitForTimeout(150);
  const step3 = await p.evaluate(() => {
    const i = document.querySelector('.guide__media img');
    return {
      img: i?.getAttribute('src'),
      ok: !!i && (i.offsetParent === null || (i.complete && i.naturalWidth > 0)),
    };
  });
  if (!step3.img?.includes('step-invite-friends.jpg') || !step3.ok) failures.push({ width, step3 });

  await p.evaluate(() => document.querySelector('#homeInfo summary')?.click());
  await p.waitForTimeout(200);
  const opened = await p.evaluate(() => ({
    open: document.querySelector('#homeInfo')?.open,
    pairs: document.querySelectorAll('#homeInfo .section-pair').length,
    artHeads: document.querySelectorAll('#homeInfo .section-head--art').length,
    scrollH: document.documentElement.scrollHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  if (!opened.open || opened.pairs !== 3 || opened.artHeads !== 6 || opened.overflow !== 0) failures.push({ width, opened });

  await p.evaluate(() => document.querySelector('#langToggle')?.click());
  const en = await p.evaluate(() => ({
    summary: document.querySelector('#homeInfo summary')?.textContent.trim().replace(/\s+/g, ' '),
    step: document.querySelector('#siteGuideDetail h3')?.textContent.trim(),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  if (/[А-Яа-я]/.test(en.summary || '') || /[А-Яа-я]/.test(en.step || '') || en.overflow !== 0) failures.push({ width, en });
  if (errors.length) failures.push({ width, errors });

  console.log(JSON.stringify({ width, closed, step3, opened, en }, null, 2));
  await ctx.close();
}
console.log('COMPACT_FAILURES', failures.length);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
