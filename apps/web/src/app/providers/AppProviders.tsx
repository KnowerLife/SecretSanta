import { useState } from 'react';
import type { ReactNode } from 'react';
import { MantineProvider, Notification, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider, useI18n } from './i18n.tsx';
import { SettingsProvider, useSettings } from './settings.tsx';

const palette = {
  winter: { primary: '#2F6FB0', secondary: '#C9433B', background: '#F7FBFF' },
  midnight: { primary: '#E7C37B', secondary: '#63BFAE', background: '#0C1D3B' },
  cozy: { primary: '#A95035', secondary: '#D6A03F', background: '#FFF8EF' },
} as const;

const makeTheme = (name: keyof typeof palette) => {
  const colors = palette[name];
  return createTheme({
    primaryColor: 'santaPrimary',
    primaryShade: name === 'midnight' ? 4 : 6,
    colors: {
      santaPrimary: [
        '#EAF3FC', '#CFE3F6', '#A5C8EC', '#79AAE0', '#508BD3', '#2F6FB0',
        '#265C93', '#1D4977', '#15375C', '#0D2746',
      ].map((color, index) =>
        index === 6 ? colors.primary : color,
      ) as [string, string, string, string, string, string, string, string, string, string],
      santaAccent: [
        '#FFF1EF', '#FFDDD8', '#FBB9B1', '#F39388', '#EA7569', colors.secondary,
        '#C9584F', '#A84740', '#883A34', '#672D29',
      ] as [string, string, string, string, string, string, string, string, string, string],
    },
    // Единая типографика с сайтом: диалоги и уведомления Mantine не выбиваются из Manrope.
    fontFamily:
      'Manrope, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    defaultRadius: 'md',
    headings: {
      fontFamily: 'Manrope, Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
      fontWeight: '800',
    },
  });
};

function Providers({ children }: { children: ReactNode }) {
  const { theme } = useSettings();
  const { t } = useI18n();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <MantineProvider
      theme={makeTheme(theme)}
      forceColorScheme={theme === 'midnight' ? 'dark' : 'light'}
      // React 19 требует precedence/href для динамических <style>; статические
      // переменные Мантина подключены ссылками в __root.tsx и global.css.
      withCssVariables={false}
      withGlobalClasses={false}
    >
      <Notifications
        autoClose={4000}
        position="top-right"
        limit={5}
        containerWidth={360}
        // Стандартная кнопка Mantine не имеет доступного имени — задаём его из словаря.
        renderNotification={({ id: _wrapperId, onClose, ...data }) => (
          <Notification
            {...data}
            onClose={() => onClose?.(data)}
            closeButtonProps={{ 'aria-label': t('toast.close') }}
          />
        )}
      />
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MantineProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <I18nProvider>
        <Providers>{children}</Providers>
      </I18nProvider>
    </SettingsProvider>
  );
}
