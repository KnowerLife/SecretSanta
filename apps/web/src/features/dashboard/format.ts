import type { Locale } from '@secret-santa/shared/i18n-data';

const INTL_LOCALE: Record<Locale, string> = { ru: 'ru-RU', en: 'en-US' };

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(dateOnly ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: string | null, locale: Locale): string {
  const date = parseDateOnly(value);
  if (!date) return '';
  return date.toLocaleDateString(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Целое число дней до события: 0 — сегодня, отрицательное — прошлое. */
export function daysUntil(value: string | null): number | null {
  const target = parseDateOnly(value);
  if (!target) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
}

export function formatTime(value: string | null | undefined, locale: Locale): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
