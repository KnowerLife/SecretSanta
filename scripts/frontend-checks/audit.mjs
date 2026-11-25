import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true });
const out = {};

function contrast(rgb1, rgb2) {
  const lum = (s) => {
    const m = s.match(/\\d+/g);
    if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = lum(rgb1), b = lum(rgb2);
  if (a === null || b === null) return null;
  return +(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
}

for (const theme of ['winter', 'midnight', 'cozy']) {
  for (const vp of [{ w: 1440, h: 900, name: 'desktop' }, { w: 390, h: 844, name: 'mobile' }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'ru-RU' });
    await ctx.addInitScript(({ theme }) => {
      localStorage.setItem('secret-santa-theme', theme);
      localStorage.setItem('secret-santa-lang', 'ru');
    }, { theme });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?audit=${theme}-${vp.name}#home`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(document.getAnimations()
        .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
        .map(a => a.finished.catch(() => {})));
    });
    const key = `${theme}-${vp.name}`;
    out[key] = {};

    const collect = async (view) => {
      if (view === 'dashboard') {
        await page.evaluate(() => document.querySelector('.nav a[data-nav="home"]')?.click());
        await page.waitForFunction(() => document.querySelector('#view-home')?.classList.contains('active'));
        await page.locator('#demoBtn').click();
        await page.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
      } else {
        await page.evaluate((v) => document.querySelector(`.nav a[data-nav="${v}"]`)?.click(), view);
        await page.waitForFunction((v) => document.querySelector(`#view-${v}`)?.classList.contains('active'), view);
      }
      return await page.evaluate(({ view }) => {
        const de = document.documentElement;
        const active = document.querySelector('.view.active');
        const visible = (el) => {
          const s = getComputedStyle(el), r = el.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        };
        const selectors = 'button, a, input, select, textarea, [role="button"], [tabindex="0"]';
        const small = [];
        const noLabel = [];
        for (const el of active.querySelectorAll(selectors)) {
          if (!visible(el)) continue;
          const r = el.getBoundingClientRect();
          const tag = el.tagName.toLowerCase();
          const text = (el.innerText || el.value || '').replace(/\\s+/g, ' ').trim();
          const iconOnly = !text && (tag === 'button' || el.getAttribute('role') === 'button');
          const aria = el.getAttribute('aria-label') || el.getAttribute('title');
          const lab = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
          if (r.height < 40) small.push({ tag, id: el.id || null, cls: el.className?.toString().slice(0, 50), text: text.slice(0, 28), h: Math.round(r.height), w: Math.round(r.width) });
          if (iconOnly && !aria) noLabel.push({ tag, id: el.id || null, cls: el.className?.toString().slice(0, 50), html: el.outerHTML.slice(0, 120) });
          if ((tag === 'input' || tag === 'select' || tag === 'textarea') && !aria && !lab) noLabel.push({ tag, id: el.id || null, cls: el.className?.toString().slice(0, 50) });
        }
        const textNodes = Array.from(active.querySelectorAll('p, span, small, strong, li, label, h1, h2, h3, button, a')).filter(visible).slice(0, 400);
        const lowContrast = [];
        for (const el of textNodes) {
          if (!el.childNodes.length) continue;
          const hasOwnText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
          if (!hasOwnText) continue;
          const s = getComputedStyle(el);
          let bgEl = el, bg = 'rgba(0, 0, 0, 0)';
          while (bgEl && bg === 'rgba(0, 0, 0, 0)') { bg = getComputedStyle(bgEl).backgroundColor; bgEl = bgEl.parentElement; }
          lowContrast.push({ sel: el.tagName + (el.id ? '#' + el.id : ''), text: el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 34), color: s.color, bg, fontSize: s.fontSize });
        }
        return {
          active: active.id,
          overflowX: de.scrollWidth > de.clientWidth + 1,
          scrollW: de.scrollWidth,
          clientW: de.clientWidth,
          small: small.slice(0, 25),
          smallCount: small.length,
          noLabel: noLabel.slice(0, 15),
          noLabelCount: noLabel.length,
          lowContrast: lowContrast.slice(0, 20),
          lowContrastCount: lowContrast.length,
        };
      }, { view }).then((r) => {
        const seen = new Set();
        r.lowContrast = r.lowContrast.filter((x) => {
          const ratio = contrast(x.color, x.bg);
          x.ratio = ratio;
          return ratio !== null && ratio < 4.5 && parseFloat(x.fontSize) < 24 && !seen.has(x.color + x.bg) && (seen.add(x.color + x.bg), true);
        }).slice(0, 20);
        r.lowContrastCount = r.lowContrast.length;
        return r;
      });
    };

    for (const v of ['home', 'create', 'join', 'quick', 'dashboard']) out[key][v] = await collect(v);
    await ctx.close();
  }
}

console.log(JSON.stringify(out, null, 2));
await browser.close();

const auditBad = [];
for (const [key, themes] of Object.entries(out)) {
  for (const [theme, views] of Object.entries(themes)) {
    for (const [view, r] of Object.entries(views)) {
      if (r.overflowX || r.smallCount || r.noLabelCount || r.lowContrastCount) auditBad.push({ key, theme, view });
    }
  }
}
console.log('AUDIT_BAD', auditBad.length);
if (auditBad.length) process.exitCode = 1;
