import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const out = {};
for (const lang of ['ru', 'en']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: lang === 'ru' ? 'ru-RU' : 'en-US' });
  await ctx.addInitScript(l => {
    localStorage.setItem('secret-santa-lang', l);
    localStorage.setItem('secret-santa-theme', 'winter');
  }, lang);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:8080/?ip=${lang}${Date.now()}#home`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const initial = await p.evaluate(() => ({
    footerVisible: !!document.querySelector('#installCard').offsetParent,
    hint: document.querySelector('#installHint').textContent.trim(),
    headerHidden: document.querySelector('#installBtn').classList.contains('hidden'),
    button: document.querySelector('#installFooterBtn').textContent.trim(),
    buttonH: Math.round(document.querySelector('#installFooterBtn').getBoundingClientRect().height),
  }));
  await p.evaluate(() => {
    const ev = new Event('beforeinstallprompt', { cancelable: true });
    let prompted = 0;
    ev.prompt = () => { prompted += 1; };
    Object.defineProperty(ev, 'userChoice', { value: Promise.resolve({ outcome: 'dismissed' }) });
    window.__prompted = () => prompted;
    window.dispatchEvent(ev);
  });
  const ready = await p.evaluate(() => ({
    hint: document.querySelector('#installHint').textContent.trim(),
    headerHidden: document.querySelector('#installBtn').classList.contains('hidden'),
  }));
  await p.locator('#installFooterBtn').click();
  await p.waitForTimeout(80);
  const prompted = await p.evaluate(() => window.__prompted());
  await p.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  const installed = await p.evaluate(() => ({
    hint: document.querySelector('#installHint').textContent.trim(),
    footerHidden: document.querySelector('#installFooterBtn').classList.contains('hidden'),
    headerHidden: document.querySelector('#installBtn').classList.contains('hidden'),
  }));
  out[lang] = { initial, ready, prompted, installed, errors };
  await ctx.close();
}
console.log(JSON.stringify(out, null, 2));
await b.close();

const installBad = [];
for (const [lang, r] of Object.entries(out)) {
  const bad = (cond, name) => { if (!cond) installBad.push(`${lang}:${name}`); };
  bad(r.initial.footerVisible && r.initial.headerHidden, 'initial state');
  bad(r.initial.hint.length > 0 && r.initial.button.length > 0, 'initial copy');
  bad(r.initial.buttonH >= 44, 'touch target');
  bad(!r.ready.headerHidden && r.ready.hint !== r.initial.hint, 'ready state');
  bad(r.prompted === 1, 'install prompt');
  bad(r.installed.footerHidden && r.installed.headerHidden && r.installed.hint.length > 0, 'installed state');
  bad((r.errors || []).length === 0, 'errors');
}
console.log('INSTALL_BAD', installBad.length, installBad.join(','));
if (installBad.length) process.exitCode = 1;
