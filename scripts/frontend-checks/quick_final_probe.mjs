import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const out = {};
for (const lang of ['ru', 'en']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: lang === 'ru' ? 'ru-RU' : 'en-US' });
  await ctx.addInitScript(l => {
    localStorage.setItem('secret-santa-lang', l);
    localStorage.setItem('secret-santa-theme', 'winter');
    localStorage.removeItem('secret-santa-simple-v1');
  }, lang);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:8080/?qfp=${lang}${Date.now()}#quick`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const empty = await p.evaluate(() => {
    const q = s => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), visible: !!e.offsetParent };
    };
    return {
      card: document.querySelector('#quickResultCard').className,
      emptyBlock: q('#quickEmpty'), media: q('.card-media--quick'),
      list: q('#quickResultList'), actions: q('.quick-actions'),
      scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
    };
  });
  const draws = [];
  for (const n of [3, 5, 11]) {
    await p.locator('#quickNames').fill(Array.from({ length: n }, (_, i) => `Участник ${i + 1}`).join('\n'));
    await p.locator('#quickDrawBtn').click();
    await p.waitForTimeout(120);
    draws.push(await p.evaluate(() => ({
      meta: document.querySelector('#quickResultMeta').textContent.trim(),
      rows: document.querySelectorAll('#quickResultList li').length,
      card: document.querySelector('#quickResultCard').className,
      emptyVisible: !!document.querySelector('#quickEmpty').offsetParent,
      mediaVisible: !!document.querySelector('.card-media--quick').offsetParent,
      imageOk: (() => { const i = document.querySelector('.card-media--quick img'); return !!i && i.complete && i.naturalWidth > 0; })(),
      scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
    })));
  }
  await p.goto(`http://127.0.0.1:8080/?qfp2=${lang}${Date.now()}#quick?gift=eyJzIjoiQW5uYSIsInIiOiJCaXJpcyJ9`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(200);
  const personal = await p.evaluate(() => ({
    card: !!document.querySelector('#quickPersonalCard') && !document.querySelector('#quickPersonalCard').classList.contains('hidden'),
    emptyVisible: !!document.querySelector('#quickEmpty')?.offsetParent,
    actionsVisible: !!document.querySelector('.quick-actions')?.offsetParent,
    recipient: document.querySelector('#quickPersonalRecipient')?.textContent,
  }));
  out[lang] = { empty, draws, personal, errors };
  await ctx.close();
}
console.log(JSON.stringify(out, null, 2));
await b.close();

const quickBad = [];
for (const [lang, r] of Object.entries(out)) {
  const bad = (cond, name) => { if (!cond) quickBad.push(`${lang}:${name}`); };
  bad(r.empty.scrollW === r.empty.clientW, 'empty overflow');
  bad(r.draws.length === 3, 'draw count');
  r.draws.forEach((d, i) => {
    const n = [3, 5, 11][i];
    bad(d.rows === n && d.meta.includes(String(n)), `draw ${n} rows`);
    bad(!d.emptyVisible && d.mediaVisible && d.imageOk, `draw ${n} visuals`);
    bad(d.scrollW === d.clientW, `draw ${n} overflow`);
  });
  bad(r.personal.card && !!r.personal.recipient, 'personal link');
  bad((r.errors || []).length === 0, 'errors');
}
console.log('QUICK_BAD', quickBad.length, quickBad.join(','));
if (quickBad.length) process.exitCode = 1;
