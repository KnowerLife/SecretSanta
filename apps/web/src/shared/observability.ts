import { createErrorReporter } from '@secret-santa/shared/observability';

const ENV = (import.meta as ImportMeta & { env?: Record<string, string> }).env ?? {};
const RUNTIME_ENV = typeof process === 'undefined' ? {} : process.env;

/** Build-time DSN for Pages; runtime DSN for the Docker SSR build. */
const DSN = ENV.VITE_SENTRY_DSN ?? RUNTIME_ENV.SENTRY_DSN;

export const webReporter = createErrorReporter({
  dsn: DSN,
  environment: ENV.VITE_SENTRY_ENVIRONMENT ?? RUNTIME_ENV.SENTRY_ENVIRONMENT ?? (ENV.DEV ? 'development' : 'production'),
  release: ENV.VITE_APP_VERSION ?? RUNTIME_ENV.APP_VERSION ?? 'v9.5.0',
});

if (typeof window !== 'undefined') {
  webReporter.installGlobalHandlers();
}
