import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const failures = [];
const siteImages = [
  'guide-format.jpg', 'step-create-game.jpg', 'step-invite-friends.jpg', 'guide-prep.jpg', 'step-draw-gifts.jpg',
];
const roomImages = [
  'guide-room-team.jpg', 'guide-room-wishes.jpg', 'guide-room-profile.jpg', 'guide-room-draw.jpg', 'guide-room-gift.jpg',
];
for (const width of [1440, 768, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'ru-RU' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:8080/?gi=${Date.now()}#home`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { localStorage.setItem('secret-santa-lang', 'ru'); localStorage.removeItem('secret-santa-simple-v1'); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.evaluate(() => document.fonts.ready);

  const site = [];
  for (let i = 0; i < 5; i++) {
    await p.evaluate(n => document.querySelector(`#siteGuideRail [data-guide-step="${n}"]`)?.click(), i);
    await p.waitForTimeout(120);
    site.push(await p.evaluate(() => {
      const img = document.querySelector('#siteGuideDetail .guide__media img');
      return {
        file: img?.getAttribute('src')?.split('/').pop(),
        hidden: img ? img.offsetParent === null : null,
        ok: !!img && (img.offsetParent === null || (img.complete && img.naturalWidth > 0)),
      };
    }));
  }
  site.forEach((s, i) => {
    if (s.file !== siteImages[i] || !s.ok) failures.push({ width, siteStep: i + 1, s });
  });

  await p.evaluate(() => document.querySelector('#demoBtn')?.click());
  await p.waitForFunction(() => (document.querySelector('#gameCodeLabel')?.textContent || '').includes('DEMO-SANTA'));
  await p.evaluate(() => document.querySelector('#drawBtn')?.click());
  if (await p.locator('#revealBtn').isVisible()) await p.locator('#revealBtn').click();
  await p.waitForTimeout(200);

  const room = [];
  for (let i = 0; i < 5; i++) {
    await p.evaluate(n => document.querySelector(`#roomGuideRail [data-guide-step="${n}"]`)?.click(), i);
    await p.waitForTimeout(120);
    room.push(await p.evaluate(() => {
      const img = document.querySelector('#roomGuideDetail .guide__media img');
      const btn = document.querySelector('#roomGuideDetail .btn');
      const copy = document.querySelector('#roomGuideDetail .guide__copy');
      return {
        file: img?.getAttribute('src')?.split('/').pop(),
        ok: !!img && (img.offsetParent === null || (img.complete && img.naturalWidth > 0)),
        copyToBtn: Math.round(btn.getBoundingClientRect().top - copy.getBoundingClientRect().bottom),
        leftDelta: Math.abs(Math.round(btn.getBoundingClientRect().left - copy.getBoundingClientRect().left)),
        btnH: Math.round(btn.getBoundingClientRect().height),
      };
    }));
  }
  room.forEach((r, i) => {
    if (r.file !== roomImages[i] || !r.ok || r.copyToBtn < 8 || r.leftDelta > 2 || r.btnH < 48) failures.push({ width, roomStep: i + 1, r });
  });

  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow !== 0 || errors.length) failures.push({ width, overflow, errors });
  console.log(JSON.stringify({ width, site, room, overflow }));
  await ctx.close();
}
console.log('GUIDE_IMAGE_FAILURES', failures.length);
if (failures.length) console.log(JSON.stringify(failures.slice(0, 8), null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
