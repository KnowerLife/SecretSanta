/** Чистый алгоритм жеребьёвки, общий для API и быстрого режима. */

export interface DrawPair {
  santa: string;
  recipient: string;
}

export type Exclusion = readonly [string, string];

const MAX_ATTEMPTS = 1500;

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Проверяет перестановку: нет самоназначений и запретных пар. */
export function isValidDraw(
  pairs: readonly DrawPair[],
  exclusions: readonly Exclusion[] = [],
): boolean {
  if (pairs.length < 2) return false;

  const santas = new Set<string>();
  const recipients = new Set<string>();
  const forbidden = new Set(exclusions.map(([a, b]) => `${a}\u0000${b}`));

  for (const { santa, recipient } of pairs) {
    if (!santa || !recipient || santa === recipient) return false;
    if (santas.has(santa) || recipients.has(recipient)) return false;
    if (forbidden.has(`${santa}\u0000${recipient}`)) return false;
    santas.add(santa);
    recipients.add(recipient);
  }

  return santas.size === recipients.size && santas.size === pairs.length;
}

/**
 * Возвращает честную перестановку или null, если исключения делают её невозможной.
 * Каждый участник ровно один раз дарит и ровно один раз получает.
 */
export function drawAssignments(
  participantIds: readonly string[],
  exclusions: readonly Exclusion[] = [],
): DrawPair[] | null {
  const ids = [...new Set(participantIds.filter(Boolean))];
  if (ids.length < 2) return null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const recipients = shuffled(ids);
    const pairs = ids.map((santa, index) => ({ santa, recipient: recipients[index]! }));
    if (isValidDraw(pairs, exclusions)) return pairs;
  }

  return null;
}
