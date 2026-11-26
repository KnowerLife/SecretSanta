import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { t } from '@secret-santa/shared/i18n';
import type { Locale } from '@secret-santa/shared/i18n-data';
import { useSettings } from './settings.tsx';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

const I18nContext = createContext<{ locale: Locale; t: Translate } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { locale } = useSettings();
  const value = useMemo(
    () => ({ locale, t: ((key, params) => t(locale, key, params)) as Translate }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): { locale: Locale; t: Translate } {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
