import { t, getLang } from './i18n.js?v=67';
import { $, $$, escapeHtml, b64urlDecode, quickPersonalUrl } from './utils.js?v=67';
import { toast } from './feedback.js?v=67';

// Быстрая жеребьёвка и персональные ссылки на пары.
let quickPairs = [];
function pairCountLabel(n) {
  if (getLang() === 'en') return t(n === 1 ? 'quick.resultMetaOne' : 'quick.resultMetaMany', { n });
  const mod10 = n % 10;
  const mod100 = n % 100;
  const key = (mod10 === 1 && mod100 !== 11) ? 'quick.resultMetaOne'
    : (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) ? 'quick.resultMetaFew'
    : 'quick.resultMetaMany';
  return t(key, { n });
}

function renderQuickResult() {
  const list = $('#quickResultList');
  const meta = $('#quickResultMeta');
  const card = $('#quickResultCard');
  const empty = $('#quickEmpty');
  const copyBtn = $('#quickCopyBtn');
  const csvBtn = $('#quickCsvBtn');
  const printBtn = $('#quickPrintBtn');
  if (!list) return;
  const hasPairs = quickPairs.length > 0;
  card?.classList.toggle('is-empty', !hasPairs);
  empty?.classList.toggle('hidden', hasPairs);
  if (!hasPairs) {
    list.innerHTML = '';
    if (meta) meta.textContent = '';
    if (copyBtn) copyBtn.disabled = true;
    if (csvBtn) csvBtn.disabled = true;
    if (printBtn) printBtn.disabled = true;
    return;
  }
  list.innerHTML = quickPairs.map((p, i) => `<li><span class="quick-pair"><strong>${escapeHtml(p.santa)}</strong><span class="quick-pair__arrow" aria-hidden="true">→</span><span>${escapeHtml(p.recipient)}</span></span><button class="link-btn quick-link" data-quick-link="${i}" type="button" title="${escapeHtml(t('quick.link'))}"><svg class="card-icon" aria-hidden="true"><use href="#i-link"></use></svg>${escapeHtml(t('quick.link'))}</button></li>`).join('');
  if (meta) meta.textContent = pairCountLabel(quickPairs.length);
  if (copyBtn) copyBtn.disabled = false;
  if (csvBtn) csvBtn.disabled = false;
  if (printBtn) printBtn.disabled = false;
  $$('[data-quick-link]').forEach(btn => btn.onclick = async () => {
    const p = quickPairs[Number(btn.dataset.quickLink)]; if (!p) return;
    const url = quickPersonalUrl(p.santa, p.recipient);
    try { await navigator.clipboard.writeText(url); toast(t('quick.linkCopied')); }
    catch { toast(url); }
  });
}

function hideQuickPersonal() {
  const card = $('#quickPersonalCard'); if (!card) return;
  card.classList.add('hidden');
  card.closest('.snow-card')?.classList.remove('quick-personal-mode');
}
function showQuickPersonal(giftParam) {
  const card = $('#quickPersonalCard'); if (!card) return;
  let data = null;
  try { data = JSON.parse(b64urlDecode(giftParam)); } catch { /* ignore */ }
  if (!data || !data.s || !data.r) return;
  $('#quickPersonalHello').textContent = t('quick.personalHello', { name: data.s });
  $('#quickPersonalRecipient').textContent = data.r;
  card.classList.remove('hidden');
  $('#quickResultList').closest('.snow-card').classList.add('quick-personal-mode');
  const copyBtn = $('#quickPersonalCopyBtn');
  if (copyBtn) copyBtn.onclick = async () => {
    const url = new URL(location.href); url.hash = 'quick?gift=' + encodeURIComponent(giftParam);
    try { await navigator.clipboard.writeText(url.toString()); toast(t('quick.linkCopied')); }
    catch { toast(url.toString()); }
  };
}

export function setQuickPairs(pairs) { quickPairs = pairs; }
export function getQuickPairs() { return quickPairs; }

export { renderQuickResult, hideQuickPersonal, showQuickPersonal };
