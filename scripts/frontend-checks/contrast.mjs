import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });

function parse(c) {
  const m = (c || '').match(/[\d.]+/g);
  if (!m) return null;
  return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
}
function blend(fg, bg) {
  if (!fg) return bg;
  if (!bg) return fg;
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}
function lum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function ratio(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const results = {};
for (const theme of ['winter', 'midnight', 'cozy']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ru-RU' });
  await ctx.addInitScript((t) => { localStorage.setItem('secret-santa-theme', t); localStorage.setItem('secret-santa-lang', 'ru'); }, theme);
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:8080/?contrast=${theme}#home`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.getElementById('demoBtn').click());
  await page.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations()
      .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
      .map(a => a.finished.catch(() => {})));
  });
  const raw = await page.evaluate(() => {
    const visible = (el) => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.1 && r.width > 0 && r.height > 0;
    };
    const items = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const direct = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!direct) continue;
      const s = getComputedStyle(el);
      const chain = [];
      let p = el;
      while (p) { chain.push(getComputedStyle(p).backgroundColor); p = p.parentElement; }
      items.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
        text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 45),
        color: s.color,
        font: parseFloat(s.fontSize),
        weight: parseInt(s.fontWeight, 10),
        chain,
      });
    }
    return items;
  });
  const bad = [];
  for (const x of raw) {
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = x.chain.length - 1; i >= 0; i--) bg = blend(parse(x.chain[i]), bg);
    const fg = blend(parse(x.color), bg);
    const large = x.font >= 24 || (x.font >= 18.66 && x.weight >= 700);
    const need = large ? 3 : 4.5;
    const r = ratio(fg, bg);
    if (r < need) bad.push({ sel: x.sel, text: x.text, ratio: +r.toFixed(2), need, color: x.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, font: x.font });
  }
  const seen = new Set();
  results[theme] = bad.filter(x => { const k = x.color + x.bg; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 30);
  results[theme + '_count'] = bad.length;
  await ctx.close();
}
console.log(JSON.stringify(results, null, 2));
await browser.close();

// Since v68 all themes must have zero contrast warnings.
const contrastBaseline = { winter: 0, midnight: 0, cozy: 0 };
const contrastBad = Object.keys(contrastBaseline).filter(t => results[t + '_count'] > contrastBaseline[t]);
console.log('CONTRAST_REGRESSIONS', contrastBad.length, contrastBad.join(','));
if (contrastBad.length) process.exitCode = 1;
