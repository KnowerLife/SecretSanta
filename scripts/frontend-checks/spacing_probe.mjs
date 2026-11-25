import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const failures = [];
for (const width of [1440, 768, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'ru-RU' });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:8080/?spacing=${Date.now()}#home`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { localStorage.setItem('secret-santa-lang', 'ru'); localStorage.removeItem('secret-santa-simple-v1'); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.evaluate(() => document.fonts.ready);

  const info = await p.evaluate(() => {
    const summary = document.querySelector('#homeInfo > summary');
    const strong = summary.querySelector('strong').getBoundingClientRect();
    const small = summary.querySelector('small').getBoundingClientRect();
    const kicker = document.querySelector('#homeInfo .section-kicker').getBoundingClientRect();
    const faq = document.querySelector('.art-faq').closest('.section').getBoundingClientRect();
    return {
      titleSubGap: Math.round(small.top - strong.bottom),
      summaryToContent: Math.round(kicker.top - summary.getBoundingClientRect().bottom),
      disclosureToFaq: Math.round(faq.top - summary.closest('.snow-card').getBoundingClientRect().bottom),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (info.titleSubGap < 4 || info.summaryToContent < 12 || info.disclosureToFaq < 20 || info.overflow !== 0) failures.push({ width, info });

  await p.evaluate(() => document.querySelector('#demoBtn')?.click());
  await p.waitForFunction(() => (document.querySelector('#gameCodeLabel')?.textContent || '').includes('DEMO-SANTA'));
  await p.evaluate(() => document.querySelector('#drawBtn')?.click());
  await p.waitForTimeout(200);
  const room = await p.evaluate(() => {
    const detail = document.querySelector('#roomGuideDetail');
    const copy = detail.querySelector('.guide__copy').getBoundingClientRect();
    const btn = detail.querySelector('.btn').getBoundingClientRect();
    return {
      copyToBtn: Math.round(btn.top - copy.bottom),
      leftDelta: Math.abs(Math.round(btn.left - copy.left)),
      btnH: Math.round(btn.height),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (room.copyToBtn < 8 || room.leftDelta > 2 || room.btnH < 48 || room.overflow !== 0) failures.push({ width, room });

  console.log(JSON.stringify({ width, info, room }));
  await ctx.close();
}
console.log('SPACING_FAILURES', failures.length);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
