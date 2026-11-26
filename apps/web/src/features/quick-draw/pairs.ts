/** Чистые помощники быстрой жеребьёвки: персональные ссылки, CSV и проверка имён. */

import type { DrawPair } from '@secret-santa/shared/draw';

export interface PersonalPair {
  santa: string;
  recipient: string;
}

/** Stable, self-contained token: it carries exactly one pair and nothing else. */
export function encodePair(pair: PersonalPair): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ s: pair.santa, r: pair.recipient }));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodePair(value: string): PersonalPair | null {
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { s?: unknown; r?: unknown };
    if (typeof parsed.s !== 'string' || typeof parsed.r !== 'string') return null;
    return { santa: parsed.s, recipient: parsed.r };
  } catch {
    return null;
  }
}

export function personalUrl(pair: PersonalPair): string {
  const url = new URL('/quick-draw', window.location.origin);
  url.searchParams.set('gift', encodePair(pair));
  return url.toString();
}

/** Names differing only by case are duplicates in both RU and EN. */
export function hasDuplicateNames(names: readonly string[]): boolean {
  const normalized = names.map((name) => name.toLocaleLowerCase());
  return new Set(normalized).size !== normalized.length;
}

/** Cyrillic header, matching the v68 export. */
export function buildPairsCsv(pairs: readonly DrawPair[]): string {
  const rows = pairs.map(
    (pair) => `"${pair.santa.replaceAll('"', '""')}","${pair.recipient.replaceAll('"', '""')}"`,
  );
  return `\uFEFFСанта,Получатель\n${rows.join('\n')}`;
}
