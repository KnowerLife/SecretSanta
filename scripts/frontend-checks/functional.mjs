import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ru-RU', permissions: ['clipboard-read', 'clipboard-write'] });
await ctx.addInitScript(() => {
  localStorage.setItem('secret-santa-lang', 'ru');
  localStorage.setItem('secret-santa-theme', 'winter');
});
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404 (Not Found)')) errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(`${BASE}/?functional=2#home`, { waitUntil: 'domcontentloaded' });
const out = {};

const nav = async (v) => { await page.evaluate((x) => document.querySelector(`.nav a[data-nav="${x}"]`)?.click(), v); await page.waitForFunction((x) => document.querySelector(`#view-${x}`)?.classList.contains('active'), v); };

await nav('dashboard');
out.noGameVisible = await page.locator('#noGame').isVisible();

await nav('home');
await page.locator('#demoBtn').click();
await page.waitForFunction(() => document.querySelector('#view-dashboard')?.classList.contains('active'));
out.demoBadge = (await page.locator('#demoBadge').textContent()).trim();
out.code = (await page.locator('#gameCodeLabel').textContent()).trim();
out.checklist = (await page.locator('#gameChecklist').textContent()).replace(/\s+/g, ' ').trim().slice(0, 200);
out.progress = (await page.locator('#progressPct').textContent()).trim();

const wishBefore = await page.locator('#myWishlist li').count();
await page.fill('#wishText', 'Новая идея: книга');
await page.locator('#wishlistForm button[type="submit"]').click();
await page.waitForTimeout(200);
const wishAfter = await page.locator('#myWishlist li').count();
await page.locator('#myWishlist li').last().locator('[data-rm-wish]').click();
await page.waitForTimeout(200);
out.wishlist = { before: wishBefore, afterAdd: wishAfter, afterRemove: await page.locator('#myWishlist li').count() };

await page.locator('#inviteBtn').click();
await page.waitForTimeout(200);
out.invite = {
  text: (await page.locator('#inviteText').inputValue()).slice(0, 140),
  shareButtons: await page.locator('.invite-share button').allTextContents(),
};
out.copyInviteEnabled = await page.locator('#copyInviteBtn').isEnabled();

out.afterDraw = {
  drawBtn: (await page.locator('#drawBtn').textContent()).trim(),
  drawDisabled: await page.locator('#drawBtn').isDisabled(),
  assignment: (await page.locator('#myAssignment').textContent()).replace(/\s+/g, ' ').trim().slice(0, 80),
  revealVisible: await page.locator('#revealBtn').isVisible(),
};
if (await page.locator('#revealBtn').isVisible()) {
  await page.locator('#revealBtn').click();
  await page.waitForTimeout(200);
  out.assignmentAfterReveal = (await page.locator('#myAssignment').textContent()).replace(/\s+/g, ' ').trim().slice(0, 80);
}

await page.evaluate(() => document.querySelector('#chatTabRecipient')?.click());
out.chatNotice = (await page.locator('#chatNotice').textContent()).trim();
out.chatInputDisabled = await page.locator('#chatInput').isDisabled();
out.chatSendDisabled = await page.locator('#chatForm button[type="submit"]').isDisabled();
out.chatTemplates = await page.locator('[data-tpl]').count();
out.chatTemplatesDisabled = await page.locator('[data-tpl]').evaluateAll(els => els.every(e => e.disabled));

await nav('dashboard');
out.activity = (await page.locator('#activityList').textContent()).replace(/\s+/g, ' ').trim().slice(0, 200);

await nav('quick');
await page.fill('#quickNames', 'Аня\nБоря\nВитя\nГаля\nДима');
await page.locator('#quickDrawBtn').click();
await page.waitForFunction(() => document.querySelectorAll('#quickResultList li').length >= 5);
out.quick = {
  rows: await page.locator('#quickResultList li').count(),
  meta: (await page.locator('#quickResultMeta').textContent()).trim(),
  copyEnabled: await page.locator('#quickCopyBtn').isEnabled(),
  csvEnabled: await page.locator('#quickCsvBtn').isEnabled(),
  printEnabled: await page.locator('#quickPrintBtn').isEnabled(),
};
await page.locator('#quickPersonalCopyBtn').click({ force: true }).catch(() => {});
out.quickPersonalVisible = await page.locator('#quickPersonalCard').isVisible();
if (out.quickPersonalVisible) out.quickPersonal = (await page.locator('#quickPersonalRecipient').textContent()).trim();

await nav('join');
await page.fill('#joinCode', 'INVALID-CODE');
await page.fill('#joinName', 'Тест');
await page.locator('#joinForm button[type="submit"]').click();
await page.waitForTimeout(400);
out.joinError = (await page.locator('#joinError').textContent()).trim();

console.log(JSON.stringify({ out, errors }, null, 2));
await browser.close();

const failed = [];
const check = (ok, name) => { if (!ok) failed.push(name); };
check(out.noGameVisible, 'empty dashboard');
check(out.demoBadge.length > 0 && out.code === 'DEMO-SANTA', 'demo room');
check(out.wishlist.afterAdd === out.wishlist.before + 1 && out.wishlist.afterRemove === out.wishlist.before, 'wishlist add/remove');
check(out.invite.text.length > 40 && out.invite.shareButtons.length === 4 && out.copyInviteEnabled, 'invite');
check(out.afterDraw.drawDisabled && out.afterDraw.assignment.length > 0, 'draw');
check(out.chatTemplates === 4 && out.chatTemplatesDisabled && out.chatInputDisabled && out.chatSendDisabled, 'chat locked');
check(out.activity.length > 0, 'activity');
check(out.quick.rows === 5 && out.quick.meta.includes('5') && out.quick.copyEnabled && out.quick.csvEnabled && out.quick.printEnabled, 'quick draw');
check(out.joinError.length > 0, 'invalid join code');
check(errors.length === 0, 'console errors');
console.log('FUNCTIONAL_BAD', failed.length, failed.join(','));
if (failed.length) process.exitCode = 1;
