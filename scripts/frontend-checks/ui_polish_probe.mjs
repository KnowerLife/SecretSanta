import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const failures = [];

for (const width of [1440, 768, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ru-RU' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:8080/?polish=${Date.now()}#home`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { localStorage.setItem('secret-santa-lang', 'ru'); localStorage.removeItem('secret-santa-simple-v1'); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);

  const nav = await p.evaluate(() => {
    const wrap = document.querySelector('.nav-wrap');
    const n = document.querySelector('.nav');
    const hint = document.querySelector('.nav-scroll-hint');
    return {
      scrollable: wrap?.classList.contains('is-scrollable'),
      hintDisplay: hint ? getComputedStyle(hint).display : null,
      hintOpacity: hint ? Number(getComputedStyle(hint).opacity) : null,
      overflow: n ? n.scrollWidth - n.clientWidth : null,
    };
  });
  const wantHint = width <= 760 && nav.overflow > 4;
  if (wantHint && (!nav.scrollable || nav.hintOpacity < 0.9)) failures.push({ width, nav });
  if (!wantHint && nav.scrollable) failures.push({ width, nav });

  if (wantHint) {
    await p.evaluate(() => { const n = document.querySelector('.nav'); n.scrollLeft = n.scrollWidth; });
    await p.waitForTimeout(120);
    const atEnd = await p.evaluate(() => document.querySelector('.nav-wrap')?.classList.contains('is-scrollable'));
    if (atEnd) failures.push({ width, navAtEnd: atEnd });
  }

  const rail = await p.evaluate(() => {
    const steps = [...document.querySelectorAll('#siteGuideRail .guide__step')];
    return {
      buttons: steps.length,
      widths: steps.map(s => Math.round(s.getBoundingClientRect().width)),
      overflowingText: steps.filter(s => s.scrollWidth > s.clientWidth + 1).map(s => s.textContent.trim()),
      railOverflow: (() => { const r = document.querySelector('#siteGuideRail'); return r.scrollWidth - r.clientWidth; })(),
    };
  });
  if (rail.buttons !== 5 || rail.overflowingText.length || rail.railOverflow !== 0) failures.push({ width, rail });

  await p.evaluate(() => document.querySelector('#homeInfo summary')?.click());
  await p.waitForTimeout(150);
  const info = await p.evaluate(() => {
    const pair = document.querySelector('#homeInfo .section-pair--spaced');
    const s = pair ? getComputedStyle(pair) : null;
    const sum = getComputedStyle(document.querySelector('#homeInfo summary'));
    return {
      pairDisplay: s?.display,
      pairBorder: s?.borderTopWidth,
      summaryBorder: sum.borderBottomWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (info.pairDisplay !== 'block' || info.pairBorder !== '1px' || info.summaryBorder !== '1px' || info.overflow !== 0) failures.push({ width, info });

  await p.evaluate(() => document.querySelector('.faq-item summary')?.click());
  await p.waitForTimeout(150);
  const faq = await p.evaluate(() => {
    const items = [...document.querySelectorAll('.faq-item')];
    const open = items.filter(d => d.open);
    return {
      openCount: open.length,
      openText: open[0]?.querySelector('summary')?.textContent.trim(),
      heights: items.slice(0, 4).map(d => Math.round(d.getBoundingClientRect().height)),
    };
  });
  if (faq.openCount !== 1) failures.push({ width, faq });

  await p.evaluate(() => document.querySelector('#demoBtn')?.click());
  await p.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
  await p.waitForFunction(() => (document.querySelector('#gameCodeLabel')?.textContent || '').includes('DEMO-SANTA'));
  await p.evaluate(() => document.querySelector('#drawBtn')?.click());
  if (await p.locator('#revealBtn').isVisible()) await p.locator('#revealBtn').click();
  await p.waitForTimeout(250);
  const room = await p.evaluate(() => {
    const btn = document.querySelector('#roomGuideDetail [data-guide-go]');
    const title = document.querySelector('#roomGuideDetail h3');
    const steps = [...document.querySelectorAll('#roomGuideRail .guide__step')];
    return {
      title: title?.textContent.trim(),
      cta: btn?.textContent.trim(),
      btnH: btn ? Math.round(btn.getBoundingClientRect().height) : null,
      overflowingText: steps.filter(s => s.scrollWidth > s.clientWidth + 1).map(s => s.textContent.trim()),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (room.title !== (width <= 760 ? 'Подготовьте подарок' : 'Подготовьте подарок')) failures.push({ width, room });
  if (room.cta !== 'Отметить подарок' || room.btnH < 48 || room.overflowingText.length || room.overflow !== 0) failures.push({ width, room });
  if (errors.length) failures.push({ width, errors });

  console.log(JSON.stringify({ width, nav, rail, info, faq, room }, null, 2));
  await ctx.close();
}
console.log('POLISH_FAILURES', failures.length);
if (failures.length) console.log(JSON.stringify(failures.slice(0, 8), null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
