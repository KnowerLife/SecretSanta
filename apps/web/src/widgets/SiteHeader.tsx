import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useI18n } from '../app/providers/i18n.tsx';
import { useSettings } from '../app/providers/settings.tsx';

type InstallEvent = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: string }>;
};

const THEME_ORDER = ['winter', 'midnight', 'cozy'] as const;

export function SiteHeader() {
  const { t } = useI18n();
  const { locale, setLocale, theme, setTheme } = useSettings();
  const { pathname } = useLocation();
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/create', label: t('nav.create') },
    { to: '/quick-draw', label: t('nav.quick') },
    { to: '/join', label: t('nav.join') },
  ] as const;

  const install = async () => {
    if (!installEvent?.prompt) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        {t('skip')}
      </a>
      <div className="container site-header__inner">
        <Link className="brand" to="/" aria-label={t('brand.aria')}>
          <span className="brand__mark" aria-hidden="true">
            ❄
          </span>
          <span>
            <span className="brand__word">Тайный </span>
            <span className="brand__word brand__word--accent">Санта</span>
          </span>
        </Link>

        <nav className="nav" aria-label={t('nav.aria')}>
          {links.map((link) => (
            <Link
              key={link.to}
              className="nav__link"
              to={link.to}
              data-active={pathname === link.to}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav__controls">
          <button
            type="button"
            className="icon-button"
            onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
            aria-label={t('nav.langAria')}
            title={t('nav.langAria')}
          >
            {t('nav.lang')}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              const index = THEME_ORDER.indexOf(theme as (typeof THEME_ORDER)[number]);
              setTheme(THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? 'winter');
            }}
            aria-label={t('theme.switch')}
            title={t(theme === 'winter' ? 'theme.winter' : theme === 'midnight' ? 'theme.midnight' : 'theme.cozy')}
          >
            {theme === 'winter' ? '❄' : theme === 'midnight' ? '☾' : '☕'}
          </button>
          {installEvent && (
            <button
              type="button"
              className="icon-button"
              onClick={install}
              aria-label={t('nav.installAria')}
              title={t('nav.installAria')}
            >
              ↓
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
