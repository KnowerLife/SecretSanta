import { $, $$ } from './utils.js?v=68';
import { disconnectSSE, refreshDashboard, renderDashboard } from './room.js?v=68';

// Переключение видов и синхронизация hash-навигации.
const views = ['home', 'create', 'join', 'quick', 'dashboard'];
function navigate(view) {
  if (!views.includes(view)) view = 'home';
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  $$('[data-nav]').forEach(el => {
    const nav = el.dataset.nav || (el.getAttribute('href') || '').replace('#', '');
    const isCurrent = nav === view && el.closest('.nav');
    if (el.closest('.nav')) {
      el.classList.toggle('is-active', isCurrent);
      if (isCurrent) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    }
  });
  const hash = location.hash.replace('#', '').split('?')[0];
  if (hash !== view) location.hash = view;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  if (view !== 'dashboard') disconnectSSE();
  if (view === 'dashboard') { renderDashboard(); refreshDashboard(); }
}
function updateNavHint() {
  const wrap = $('.nav-wrap');
  const nav = wrap?.querySelector('.nav');
  if (!wrap || !nav) return;
  const overflow = nav.scrollWidth - nav.clientWidth;
  wrap.classList.toggle('is-scrollable', overflow > 4 && nav.scrollLeft < overflow - 4);
}

export { views, navigate, updateNavHint };
