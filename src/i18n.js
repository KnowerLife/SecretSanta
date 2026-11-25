import { I18N } from './i18n-data.js?v=68';
import { $, $$ } from './utils.js?v=68';
import { renderSiteGuide } from './guides.js?v=68';
import { updateNavHint } from './router.js?v=68';
import { updateOfflineUI } from './offline.js?v=68';
import { renderDashboard } from './room.js?v=68';
import { renderQuickResult } from './quick.js?v=68';

// Переводы, текущий язык и применение локализации.
const LANG_KEY = 'secret-santa-lang';
let lang = localStorage.getItem(LANG_KEY) || 'ru';
function t(key, vars = {}) {
  const dict = I18N[lang] || I18N.ru;
  let str = dict[key] ?? I18N.ru[key] ?? key;
  Object.keys(vars).forEach(k => { str = str.replaceAll(`{${k}}`, vars[k]); });
  return str;
}
function locale() { return lang === 'en' ? 'en-US' : 'ru-RU'; }
function applyLang(nextLang) {
  if (nextLang) lang = nextLang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang === 'en' ? 'en' : 'ru';
  document.title = t('meta.title');
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', t('meta.desc'));
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-placeholder]').forEach(el => { el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)); });
  $$('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
  renderSiteGuide();
  updateNavHint();
  const langBtn = $('#langToggle');
  if (langBtn) { langBtn.textContent = t('nav.lang'); langBtn.setAttribute('aria-label', t('nav.langAria')); }
  const installBtn = $('#installBtn');
  if (installBtn) {
    installBtn.setAttribute('aria-label', t('nav.installAria'));
    installBtn.title = t('nav.installAria');
  }
  updateOfflineUI();
  renderDashboard();
  renderQuickResult();
  document.dispatchEvent(new CustomEvent('secret-santa:lang'));
}

export function getLang() { return lang; }

export { t, locale, applyLang };
