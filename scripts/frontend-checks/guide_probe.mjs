import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const failures = [];
for (const width of [390, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ru-RU' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
  await p.goto(`http://127.0.0.1:8080/?guide=${Date.now()}#home`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    localStorage.setItem('secret-santa-lang', 'ru');
    localStorage.removeItem('secret-santa-simple-v1');
  });
  await p.reload({ waitUntil: 'domcontentloaded' });

  const site = await p.evaluate(() => ({
    steps: document.querySelectorAll('#siteGuideRail [data-guide-step]').length,
    progress: document.querySelector('#siteGuideProgress')?.textContent,
    title: document.querySelector('#siteGuideDetail h3')?.textContent.trim(),
    actions: document.querySelectorAll('#siteGuideDetail .guide__actions .btn').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  if (site.steps !== 5 || site.progress !== '1 / 5' || site.actions < 2 || site.overflow !== 0) failures.push({ width, site });

  await p.evaluate(() => document.querySelectorAll('#siteGuideRail [data-guide-step]')[3]?.click());
  const siteStep4 = await p.evaluate(() => ({
    progress: document.querySelector('#siteGuideProgress')?.textContent,
    title: document.querySelector('#siteGuideDetail h3')?.textContent.trim(),
    active: document.querySelector('#siteGuideRail [aria-selected="true"] span')?.textContent.trim(),
  }));
  if (siteStep4.progress !== '4 / 5' || !siteStep4.title) failures.push({ width, siteStep4 });

  await p.evaluate(() => document.querySelector('#demoBtn')?.click());
  await p.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
  await p.waitForFunction(() => (document.querySelector('#gameCodeLabel')?.textContent || '').includes('DEMO-SANTA'));
  await p.evaluate(() => document.querySelector('#drawBtn')?.click());
  if (await p.locator('#revealBtn').isVisible()) await p.locator('#revealBtn').click();

  const roomBefore = await p.evaluate(() => ({
    steps: document.querySelectorAll('#roomGuideRail [data-guide-step]').length,
    done: document.querySelectorAll('#roomGuideRail .is-done').length,
    progress: document.querySelector('#roomGuideProgress')?.textContent,
    title: document.querySelector('#roomGuideDetail h3')?.textContent.trim(),
    cta: document.querySelector('#roomGuideDetail [data-guide-go]')?.getAttribute('data-guide-go'),
    presetWish: document.querySelectorAll('[data-preset="wish"] .preset-chip').length,
    presetAnti: document.querySelectorAll('[data-preset="anti"] .preset-chip').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  if (roomBefore.steps !== 5 || roomBefore.presetWish !== 6 || roomBefore.presetAnti !== 6 || roomBefore.overflow !== 0) failures.push({ width, roomBefore });

  await p.evaluate(() => document.querySelector('#roomGuideDetail [data-guide-go]')?.click());
  await p.waitForTimeout(350);
  const afterCta = await p.evaluate(() => ({
    tab: document.querySelector('.dash-tab.is-active')?.dataset.dashTab,
    active: document.activeElement?.id || document.activeElement?.className,
  }));

  const wishBefore = await p.evaluate(() => document.querySelectorAll('#myWishlist li').length);
  await p.evaluate(() => document.querySelector('[data-preset="wish"] .preset-chip')?.click());
  await p.waitForTimeout(250);
  const wishAfter = await p.evaluate(() => ({
    count: document.querySelectorAll('#myWishlist li').length,
    first: document.querySelector('#myWishlist li span')?.textContent.trim(),
    added: document.querySelectorAll('[data-preset="wish"] .preset-chip.is-added').length,
  }));
  if (wishAfter.count !== wishBefore + 1 || !wishAfter.added) failures.push({ width, wishBefore, wishAfter });

  await p.evaluate(() => document.querySelector('[data-preset="anti"] .preset-chip')?.click());
  await p.waitForTimeout(400);
  const antiAfter = await p.evaluate(() => ({
    value: document.querySelector('#profileAnti')?.value || '',
    added: document.querySelectorAll('[data-preset="anti"] .preset-chip.is-added').length,
    saved: (() => { try { const s = JSON.parse(localStorage.getItem('secret-santa-simple-v1')); const code = s.session.gameCode; const me = s.games[code].participants.find(x => x.id === s.session.participantId); return !!(me && me.antiWishlist); } catch { return false; } })(),
  }));
  if (!antiAfter.value || !antiAfter.added || !antiAfter.saved) failures.push({ width, antiAfter });

  await p.evaluate(() => document.querySelector('#langToggle')?.click());
  const en = await p.evaluate(() => ({
    siteTitle: document.querySelector('#siteGuideDetail h3')?.textContent.trim(),
    roomTitle: document.querySelector('#roomGuideDetail h3')?.textContent.trim(),
    chip: document.querySelector('[data-preset="wish"] .preset-chip span')?.textContent.trim(),
    rail: document.querySelector('.guide__rail')?.getAttribute('aria-label'),
  }));
  if (/[А-Яа-я]/.test(en.siteTitle || '') || /[А-Яа-я]/.test(en.roomTitle || '') || /[А-Яа-я]/.test(en.chip || '')) failures.push({ width, en });
  if (errors.length) failures.push({ width, errors });
  console.log(JSON.stringify({ width, site, siteStep4, roomBefore, afterCta, wishAfter, antiAfter, en }, null, 2));
  await ctx.close();
}
console.log('GUIDE_FAILURES', failures.length);
if (failures.length) console.log(JSON.stringify(failures.slice(0, 6), null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
