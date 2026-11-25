import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const results = [];
for (const lang of ['ru', 'en']) {
  const ctx = await browser.newContext({ locale: lang === 'ru' ? 'ru-RU' : 'en-US' });
  await ctx.addInitScript((l) => localStorage.setItem('secret-santa-lang', l), lang);
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:8080/?i18n=${lang}#home`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.getElementById('demoBtn').click());
  await page.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
  await page.evaluate(() => document.querySelector('.nav a[data-nav="quick"]')?.click());
  const r = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('[data-i18n],[data-i18n-placeholder],[data-i18n-aria-label],[data-tpl]')) {
      const key = el.dataset.i18n || el.dataset.i18nPlaceholder || el.dataset.i18nAriaLabel || el.dataset.tpl;
      const val = el.dataset.i18n ? el.textContent : el.dataset.i18nPlaceholder ? el.getAttribute('placeholder') : el.dataset.i18nAriaLabel ? el.getAttribute('aria-label') : el.textContent;
      if (!val || val === key || /^[a-z]+\.[a-z]/i.test(val.trim())) bad.push({ key, val: (val || '').trim().slice(0, 40) });
    }
    return { lang: document.documentElement.lang, bad: bad.slice(0, 20), count: bad.length, total: document.querySelectorAll('[data-i18n],[data-i18n-placeholder],[data-i18n-aria-label],[data-tpl]').length };
  });
  results.push(r);
  console.log(lang, JSON.stringify(r));
  await ctx.close();
}
await browser.close();
const bad = results.filter(r => r.count !== 0 || r.total !== 325);
console.log('I18N_BAD', bad.length, 'TOTAL', results.reduce((n, r) => n + r.total, 0));
if (bad.length) process.exitCode = 1;
