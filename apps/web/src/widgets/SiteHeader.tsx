import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useI18n } from '../app/providers/i18n.tsx';
import { useSettings } from '../app/providers/settings.tsx';
import { tokenKey } from '../shared/api/client.ts';
import { LocalSyncPrompt } from '../features/local-play/LocalSyncPrompt.tsx';
import './pwa-install.css';

type InstallEvent = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: string }>;
};

export type PwaInstallStatus = 'installed' | 'ready' | 'ios' | 'generic';

export interface PwaInstallState {
  installed: boolean;
  canInstall: boolean;
  isIos: boolean;
  status: PwaInstallStatus;
  hintKey: string;
  locale: string;
  promptInstall: () => Promise<void>;
}

const PWA_INSTALLED_KEY = 'ss:v69:pwa-installed';
const THEME_ORDER = ['winter', 'midnight', 'cozy'] as const;
const TOKEN_PREFIX = tokenKey('');

/** Находит комнату с активной сессией, не раскрывая сам токен. */
function storedRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(TOKEN_PREFIX) && window.localStorage.getItem(key)) {
      return key.slice(TOKEN_PREFIX.length);
    }
  }
  return null;
}

export function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform ?? '';
  return /iPad|iPhone|iPod/.test(platform) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(PWA_INSTALLED_KEY) === '1') return true;
  } catch {
    // Приватный режим может запретить доступ к хранилищу.
  }
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const query = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)').matches : false;
  return standalone || query;
}

function markInstalled(): void {
  try {
    window.localStorage.setItem(PWA_INSTALLED_KEY, '1');
  } catch {
    // Не критично: состояние уже обновлено в React.
  }
}

/** Подсказки установки PWA. Зависит от locale, поэтому обновляется при смене языка. */
export function usePwaInstall(): PwaInstallState {
  const { locale } = useI18n();
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(detectInstalled);
  const isIos = detectIos();

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => {
      markInstalled();
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installEvent?.prompt) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice?.catch(() => ({ outcome: 'dismissed' }));
    setInstallEvent(null);
    if (choice?.outcome === 'accepted') {
      markInstalled();
      setInstalled(true);
    }
  }, [installEvent]);

  const status: PwaInstallStatus = installed
    ? 'installed'
    : installEvent
      ? 'ready'
      : isIos
        ? 'ios'
        : 'generic';
  const hintKey = status === 'installed'
    ? 'install.done'
    : status === 'ready'
      ? 'install.ready'
      : status === 'ios'
        ? 'install.ios'
        : 'install.generic';

  return {
    installed,
    canInstall: Boolean(installEvent) && !installed,
    isIos,
    status,
    hintKey,
    locale,
    promptInstall,
  };
}

export function SiteHeader() {
  const { t } = useI18n();
  const { locale, setLocale, theme, setTheme } = useSettings();
  const { pathname } = useLocation();
  const install = usePwaInstall();
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    setRoomCode(storedRoomCode());
  }, [pathname]);

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/create', label: t('nav.create') },
    { to: '/quick-draw', label: t('nav.quick') },
    { to: '/join', label: t('nav.join') },
  ] as const;

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
          <span dangerouslySetInnerHTML={{ __html: t('brand.name') }} />
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
          {roomCode && (
            <Link
              className="nav__link nav__link--pill"
              to="/room/$code"
              params={{ code: roomCode }}
              data-active={pathname.startsWith('/room/')}
            >
              {t('nav.dashboard')}
            </Link>
          )}
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
          {install.installed ? (
            <span className="install-pill" role="status" aria-label={t('install.done')} title={t('install.done')}>
              ✓
            </span>
          ) : install.canInstall ? (
            <button
              type="button"
              className="icon-button"
              onClick={() => void install.promptInstall()}
              aria-label={t('nav.installAria')}
              title={t('nav.installAria')}
            >
              ↓
            </button>
          ) : null}
        </div>
      </div>
      <div className="container">
        <p className="install-hint install-hint--header">{t(install.hintKey)}</p>
      </div>
      <LocalSyncPrompt />
    </header>
  );
}
