export const DEV_SECRET = 'dev-insecure-change-me';
export const MIN_SECRET_LENGTH = 32;

const WEAK_SECRETS = new Set([
  DEV_SECRET,
  'change-me',
  'secret',
  'replace-with-a-random-secret',
  'replace-with-vapid-private-key',
]);

export type Env = NodeJS.ProcessEnv;

/** Единый источник секрета подписи для API, воркера и миграций. */
export function signingSecret(env: Env = process.env): string {
  return env.SECRET_SANTA_SECRET ?? DEV_SECRET;
}

export function isStrongSecret(value: string | undefined): boolean {
  return Boolean(value && value.length >= MIN_SECRET_LENGTH && !WEAK_SECRETS.has(value));
}

/** В production слабый секрет недопустим: процесс должен остановиться до старта сервера. */
export function assertProductionSecret(env: Env = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  const value = env.SECRET_SANTA_SECRET;
  if (isStrongSecret(value)) return;
  const reason = !value
    ? 'SECRET_SANTA_SECRET не задан'
    : `SECRET_SANTA_SECRET слишком слабый (нужно минимум ${MIN_SECRET_LENGTH} символов, не заглушка)`;
  throw new Error(`Недопустимая конфигурация production: ${reason}`);
}
