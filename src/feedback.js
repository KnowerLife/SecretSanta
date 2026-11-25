import { $ } from './utils.js?v=68';
import { t } from './i18n.js?v=68';

// Уведомления и модальное подтверждение действий.
function toast(msg) {
  const layer = $('#toastLayer'); if (!layer) return;
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  layer.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, 2400);
}
function setNotice(msg) { const n = $('#dashNotice'); if (!n) return; if (msg) { n.textContent = msg; n.classList.remove('hidden'); } else { n.textContent = ''; n.classList.add('hidden'); } }
let confirmCb = null;
let lastFocusBeforeModal = null;
function openConfirm(text, cb) {
  $('#confirmText').textContent = text;
  confirmCb = cb;
  lastFocusBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const modal = $('#confirmModal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  const ok = $('#confirmOkBtn');
  if (ok) ok.focus();
}
function closeConfirm() {
  confirmCb = null;
  const modal = $('#confirmModal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  if (lastFocusBeforeModal) {
    lastFocusBeforeModal.focus();
    lastFocusBeforeModal = null;
  }
}

function confirmOk() {
  const cb = confirmCb;
  closeConfirm();
  if (cb) cb();
}

export { toast, setNotice, openConfirm, closeConfirm, confirmOk };
