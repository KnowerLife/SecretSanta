import { $ } from './utils.js?v=68';
import { t } from './i18n.js?v=68';

// Три темы интерфейса и переключение между ними.
const THEME_KEY = 'secret-santa-theme';
const THEMES = ['winter', 'midnight', 'cozy'];
let theme = localStorage.getItem(THEME_KEY) || 'winter';
if (!THEMES.includes(theme)) theme = 'winter';
function applyTheme(nextTheme) {
  if (nextTheme && THEMES.includes(nextTheme)) theme = nextTheme;
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', theme === 'winter' ? '#a3cefd' : theme === 'midnight' ? '#0b1630' : '#f3d9c2');
  const btn = $('#themeToggle');
  if (btn) {
    const icon = theme === 'winter' ? 'i-moon' : theme === 'midnight' ? 'i-sun' : 'i-snowflake';
    btn.innerHTML = `<svg class="card-icon" aria-hidden="true"><use href="#${icon}"></use></svg>`;
    btn.setAttribute('aria-label', t('theme.switch'));
    btn.title = t('theme.' + theme);
  }
}
function cycleTheme() { const i = THEMES.indexOf(theme); applyTheme(THEMES[(i + 1) % THEMES.length]); }

export { applyTheme, cycleTheme };
