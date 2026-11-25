import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport:{width:1440,height:900}, reducedMotion:'reduce' });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8080/?rm='+Date.now()+'#home',{waitUntil:'networkidle'});
const r = await p.evaluate(() => ({
  snow: getComputedStyle(document.querySelector('.page-bg__snow')).animationDuration,
  window: getComputedStyle(document.querySelector('.hero-preview__window')).animationDuration,
  card: getComputedStyle(document.querySelector('.mode-card')).animationDuration,
  scroll: getComputedStyle(document.documentElement).scrollBehavior,
}));
console.log(r);
await b.close();
const bad = ['snow', 'window', 'card'].some(k => parseFloat(r[k]) > 0.01) || r.scroll !== 'auto';
console.log('REDUCED_BAD', bad ? 1 : 0);
if (bad) process.exitCode = 1;
