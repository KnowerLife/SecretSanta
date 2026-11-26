import { useEffect } from 'react';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import mantineCoreStyles from '@mantine/core/styles.css?url';
import mantineNotificationsStyles from '@mantine/notifications/styles.css?url';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { I18N } from '@secret-santa/shared/i18n-data';
import { AppProviders } from '../app/providers/AppProviders.tsx';
import { useSettings } from '../app/providers/settings.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';
import { ServiceWorkerRegistrar } from '../shared/pwa/ServiceWorkerRegistrar.tsx';
import { SiteFooter } from '../widgets/SiteFooter.tsx';
import { SiteHeader } from '../widgets/SiteHeader.tsx';
import '../app/styles/global.css';

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
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icon-192.svg' },
    ],
  }),
  notFoundComponent: NotFoundPage,
  component: RootComponent,
});

function RootComponent() {
  return (
    <AppProviders>
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
        <div className="site-shell">{children}</div>
        <Scripts />
      </body>
    </html>
  );
}
