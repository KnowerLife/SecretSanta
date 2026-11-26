import { I18N } from './i18n-data.ts';
import type { Locale } from './i18n-data.ts';

export type { Locale } from './i18n-data.ts';

const PLACEHOLDER = /\{([^{}]+)\}/g;

/** Возвращает строку для локали с подстановкой `{name}` из params. */
export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = I18N[locale][key] ?? I18N.ru[key] ?? key;
  if (!params) return template;

  return template.replace(PLACEHOLDER, (match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) return match;
    return String(params[name]);
  });
}

/** Есть ли ключ именно в указанной локали (без fallback). */
export function hasKey(locale: Locale, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(I18N[locale], key);
}

/** Все ключи указанной локали. */
export function keys(locale: Locale): string[] {
  return Object.keys(I18N[locale]);
}

/** Отсортированные ключи, отсутствующие в одной из локалей. */
export function missingKeys(): string[] {
  const ruKeys = new Set(Object.keys(I18N.ru));
  const enKeys = new Set(Object.keys(I18N.en));
  const missing = [
    ...[...enKeys].filter((key) => !ruKeys.has(key)),
    ...[...ruKeys].filter((key) => !enKeys.has(key)),
  ];
  return [...new Set(missing)].sort();
}

/** Русские правила плюрализации для целых чисел. */
export function pluralRu(n: number): 'one' | 'few' | 'many' {
  if (!Number.isFinite(n)) return 'many';

  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  const last = abs % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return 'many';
  if (last === 1) return 'one';
  if (last >= 2 && last <= 4) return 'few';
  return 'many';
}

/** Ключ строки счётчика пар быстрой жеребьёвки для числа n. */
export function quickResultMetaKey(n: number): string {
  switch (pluralRu(n)) {
    case 'one':
      return 'quick.resultMetaOne';
    case 'few':
      return 'quick.resultMetaFew';
    default:
      return 'quick.resultMetaMany';
  }
}
