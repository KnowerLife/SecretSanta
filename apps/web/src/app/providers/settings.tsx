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
  // это исключает рассинхронизацию гидратации.
  const [locale, setLocale] = useState<Locale>('ru');
  const [theme, setTheme] = useState<ThemeName>('winter');

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_KEY);
    if (storedLocale === 'ru' || storedLocale === 'en') setLocale(storedLocale);
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    if (THEMES.includes(storedTheme as ThemeName)) setTheme(storedTheme as ThemeName);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.cookie = `ss_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
    window.localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.cookie = `ss_theme=${theme}; path=/; max-age=31536000; samesite=lax`;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const value = useMemo<Settings>(
    () => ({ locale, theme, setLocale, setTheme }),
    [locale, theme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
