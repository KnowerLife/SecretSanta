// Мелкие DOM- и строковые утилиты без состояния приложения.

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
function uid(prefix = 'id') { return prefix + '_' + Math.random().toString(36).slice(2, 10); }
function makeCode() { const part = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(2, 6) || 'AB12'; return 'SANTA-' + part; }
function escapeHtml(str = '') { return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function b64urlEncode(str) {
  try { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  catch { return ''; }
}
function b64urlDecode(str) {
  try { const s = String(str).replace(/-/g, '+').replace(/_/g, '/'); return decodeURIComponent(escape(atob(s))); }
  catch { return ''; }
}
function quickPersonalUrl(santa, recipient) {
  const url = new URL(location.href);
  url.hash = 'quick?gift=' + encodeURIComponent(b64urlEncode(JSON.stringify({ s: santa, r: recipient })));
  return url.toString();
}
function parseHashParams() {
  const raw = location.hash.replace('#', '');
  return new URLSearchParams(raw.split('?')[1] || '');
}
function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { $, $$, uid, makeCode, escapeHtml, b64urlEncode, b64urlDecode, quickPersonalUrl, parseHashParams, downloadText };
