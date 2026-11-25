import { chromium } from 'playwright';
const files = [
  'hero-winter-scene.jpg', 'step-create-game.jpg', 'step-invite-friends.jpg', 'step-draw-gifts.jpg',
  'dashboard-empty.jpg', 'audience-remote.jpg', 'feature-anonymous-chat.jpg', 'privacy-who-sees.jpg',
  'gift-ideas.jpg', 'cta-celebration.jpg', 'chat-empty.jpg', 'quick-draw-success.jpg', 'social-cover.jpg',
  'mode-online.jpg', 'mode-quick.jpg', 'mode-demo.jpg', 'rules-fair-draw.jpg', 'testimonials-friends.jpg',
  'faq-help.jpg', 'create-game-head.jpg', 'join-game-head.jpg', 'quick-draw-head.jpg', 'recipient-waiting.jpg',
  'chat-waiting.jpg', 'profile-empty.jpg', 'wishlist-empty.jpg', 'invite-share.jpg', 'access-empty.jpg',
  'activity-empty.jpg',
  'guide-format.jpg', 'guide-prep.jpg',
  'guide-room-team.jpg', 'guide-room-wishes.jpg', 'guide-room-profile.jpg',
  'guide-room-draw.jpg', 'guide-room-gift.jpg',
];
const b = await chromium.launch({ headless: true });
const result = {};
for (const theme of ['winter', 'midnight', 'cozy']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ru-RU' });
  await ctx.addInitScript(t => {
    localStorage.setItem('secret-santa-theme', t);
    localStorage.setItem('secret-santa-lang', 'ru');
    localStorage.removeItem('secret-santa-simple-v1');
    localStorage.removeItem('secret-santa-chat-cache');
  }, theme);
  const p = await ctx.newPage();
  const bad = [];
  const seen = new Set();
  p.on('response', r => {
    const u = r.url();
    if (u.includes('/assets/images/')) {
      seen.add(u.split('/').pop());
      if (r.status() >= 400) bad.push(`${r.status()} ${u}`);
    }
  });
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:8080/?ifp=${theme}${Date.now()}#home`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => { const d = document.querySelector('#homeInfo'); if (d) d.open = true; });
  const pageHeight = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < pageHeight; y += 600) {
    await p.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y);
    await p.waitForTimeout(80);
  }
  await p.waitForTimeout(250);
  const direct = await p.evaluate(async list => {
    const out = {};
    await Promise.all(list.map(async f => {
      try {
        const r = await fetch(`assets/images/${f}`, { cache: 'reload' });
        out[f] = r.ok;
      } catch { out[f] = false; }
    }));
    return out;
  }, files);
  const cssArt = await p.evaluate(() => {
    const bg = sel => getComputedStyle(document.querySelector(sel), '::before').backgroundImage;
    return {
      audience: bg('.art-audience').includes('audience-remote.jpg'),
      ideas: bg('.art-ideas').includes('gift-ideas.jpg'),
      chat: bg('.art-chat').includes('feature-anonymous-chat.jpg'),
      privacy: bg('.art-privacy').includes('privacy-who-sees.jpg'),
      rules: bg('.art-rules').includes('rules-fair-draw.jpg'),
      testimonials: bg('.art-testimonials').includes('testimonials-friends.jpg'),
      faq: bg('.art-faq').includes('faq-help.jpg'),
    };
  });
  const domImages = [];
  const snap = async label => {
    const images = await p.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.src.includes('/assets/images/')).map(i => ({ f: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0 })));
    domImages.push({ label, images });
  };
  await snap('home');
  for (const [name, selector] of [['create', '.page-head.art-create'], ['join', '.page-head.art-join'], ['quick', '.section-head.art-quick']]) {
    await p.evaluate(n => {
      document.querySelector(`.nav a[data-nav="${n}"]`)?.click();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, name);
    await p.waitForTimeout(300);
    const cssOk = await p.evaluate(sel => {
      const el = document.querySelector(sel);
      return !!el && getComputedStyle(el, '::before').backgroundImage.includes('.jpg');
    }, selector);
    domImages.push({ label: name, cssOk });
  }
  await p.locator('#quickNames').fill('Анна\nБорис\nВика');
  await p.locator('#quickDrawBtn').click();
  await p.waitForTimeout(200);
  await snap('quick-drawn');
  await p.evaluate(() => document.querySelector('.nav a[data-nav="dashboard"]')?.click());
  await p.waitForTimeout(300);
  await snap('dashboard-empty');
  await p.evaluate(() => document.querySelector('#demoBtn')?.click());
  await p.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
  await p.waitForTimeout(600);
  await snap('dashboard-demo');
  const overflow = await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  result[theme] = {
    directBad: Object.entries(direct).filter(([, ok]) => !ok).map(([f]) => f),
    requested: [...seen].sort(),
    cssArt,
    domImages,
    bad, errors, overflow,
  };
  await ctx.close();
}
console.log(JSON.stringify(result, null, 2));
const badCount = Object.values(result).reduce((n, r) => n + r.directBad.length + r.bad.length + r.errors.length + (r.overflow.scrollW - r.overflow.clientW), 0);
const cssBad = Object.values(result).reduce((n, r) => n + Object.values(r.cssArt).filter(v => !v).length, 0);
console.log('IMAGE_FINAL_BAD', badCount, 'CSS_ART_BAD', cssBad);
await b.close();

if (badCount || cssBad) process.exitCode = 1;
