import { useEffect } from 'react';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import mantineCoreStyles from '@mantine/core/styles.css?url';
import mantineNotificationsStyles from '@mantine/notifications/styles.css?url';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { I18N } from '@secret-santa/shared/i18n-data';
import { AppProviders } from '../app/providers/AppProviders.tsx';
import { useSettings } from '../app/providers/settings.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';
import { PrivacyAnalytics } from '../shared/Analytics.tsx';
import { webReporter } from '../shared/observability.ts';
import { ServiceWorkerRegistrar } from '../shared/pwa/ServiceWorkerRegistrar.tsx';
import { assetPath } from '../shared/base.ts';
import { FestiveSky } from '../shared/ui/FestiveDecor.tsx';
import { SiteFooter } from '../widgets/SiteFooter.tsx';
import { SiteHeader } from '../widgets/SiteHeader.tsx';
import '../app/styles/global.css';
import '../app/styles/motion.css';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: I18N.ru['meta.title'] ?? 'Тайный Санта' },
      {
        name: 'description',
        content: I18N.ru['meta.desc'] ?? 'Честная жеребьёвка подарков.',
      },
      { name: 'theme-color', content: '#2F6FB0' },
    ],
    links: [
      // Mantine styles MUST be first: route-level and component styles override them.
      { rel: 'stylesheet', href: mantineCoreStyles },
      { rel: 'stylesheet', href: mantineNotificationsStyles },
      // Тот же шрифт, что и в легаси-вёрстке: сохраняем знакомую ритмику текста.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
      },
      { rel: 'icon', type: 'image/svg+xml', href: assetPath('favicon.svg') },
      { rel: 'manifest', href: assetPath('manifest.webmanifest') },
      { rel: 'apple-touch-icon', href: assetPath('icon-192.svg') },
    ],
  }),
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
  onError: (error) => webReporter.captureException(error, { source: 'tanstack-router' }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <AppProviders>
      <PrivacyAnalytics />
      <RootDocument>
        <SiteHeader />
        <main id="main">
          <Outlet />
        </main>
        <SiteFooter />
        <ServiceWorkerRegistrar />
      </RootDocument>
    </AppProviders>
  );
}

function RouteErrorPage({ error, reset }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="container dashboard">
      <div className="empty-state">
        <h1>Что-то пошло не так / Something went wrong</h1>
        <p>{message}</p>
        <button className="btn btn--primary" type="button" onClick={reset}>
          Повторить / Retry
        </button>
      </div>
    </div>
  );
}

const THEME_COLORS = { winter: '#f4f9ff', midnight: '#0e1c39', cozy: '#fff8f2' } as const;

function RootDocument({ children }: { children: React.ReactNode }) {
  const { locale, theme } = useSettings();

  // Цвет панели браузера следует активной теме, а не фиксированному winter.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);

  return (
    <html
      {...mantineHtmlProps}
      lang={locale}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript forceColorScheme={theme === 'midnight' ? 'dark' : 'light'} />
        <HeadContent />
      </head>
      <body>
        <div className="site-shell" id="top">
          <FestiveSky />
          {children}
        </div>
        <Scripts />
      </body>
    </html>
  );
}
