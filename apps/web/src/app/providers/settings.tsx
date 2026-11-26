import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Locale } from '@secret-santa/shared/i18n-data';
import type { ThemeName } from '@secret-santa/art';

type Settings = {
  locale: Locale;
  theme: ThemeName;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeName) => void;
};

const SettingsContext = createContext<Settings | null>(null);

const LOCALE_KEY = 'ss:v69:locale';
const THEME_KEY = 'ss:v69:theme';
const THEMES: ThemeName[] = ['winter', 'midnight', 'cozy'];

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Сервер и первый клиентский рендер используют значения по умолчанию:
  // это исключает рассинхронизацию гидратации. Пока восстановление не
  // произошло, сохранённые значения НЕ перезаписываются дефолтными.
  const [settings, setSettings] = useState<{
    locale: Locale;
    theme: ThemeName;
    hydrated: boolean;
  }>({ locale: 'ru', theme: 'winter', hydrated: false });

  useEffect(() => {
    setSettings((current) => {
      if (current.hydrated) return current;
      const storedLocale = window.localStorage.getItem(LOCALE_KEY);
      const storedTheme = window.localStorage.getItem(THEME_KEY);
      return {
        locale: storedLocale === 'ru' || storedLocale === 'en' ? storedLocale : current.locale,
        theme: THEMES.includes(storedTheme as ThemeName)
          ? (storedTheme as ThemeName)
          : current.theme,
        hydrated: true,
      };
    });
  }, []);

  useEffect(() => {
    if (!settings.hydrated) return;
    document.documentElement.lang = settings.locale;
    document.documentElement.dataset.theme = settings.theme;
    document.cookie = `ss_locale=${settings.locale}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `ss_theme=${settings.theme}; path=/; max-age=31536000; samesite=lax`;
    window.localStorage.setItem(LOCALE_KEY, settings.locale);
    window.localStorage.setItem(THEME_KEY, settings.theme);
  }, [settings]);

  const value = useMemo<Settings>(
    () => ({
      locale: settings.locale,
      theme: settings.theme,
      setLocale: (locale) =>
        setSettings((current) => ({ ...current, locale, hydrated: true })),
      setTheme: (theme) => setSettings((current) => ({ ...current, theme, hydrated: true })),
    }),
    [settings.locale, settings.theme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
