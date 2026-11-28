import { createErrorReporter } from '@secret-santa/shared/observability';

/** Runtime DSN for the Hono API. Disabled unless SENTRY_DSN is set. */
export const apiReporter = createErrorReporter({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
  release: process.env.APP_VERSION ?? 'v9.5.0',
});
