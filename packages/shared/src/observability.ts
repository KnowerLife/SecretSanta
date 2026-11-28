/**
 * Minimal Sentry-compatible error reporter.
 *
 * Uses the public Sentry envelope protocol over fetch, so it works with both
 * sentry.io and Sentry-SDK-compatible self-hosted services (Bugsink,
 * GlitchTip) without adding a vendor SDK to the browser bundle.
 *
 * Privacy rules are intentional:
 * - no cookies, localStorage or request headers are attached;
 * - room codes and query strings are never sent;
 * - reporting is disabled unless a DSN is configured.
 */

export type ErrorReporterConfig = {
  dsn?: string;
  environment?: string;
  release?: string;
  fetch?: typeof fetch;
};

export type ErrorReporter = {
  enabled: boolean;
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  installGlobalHandlers: () => (() => void) | undefined;
  flush: () => Promise<void>;
};

type DsnTarget = { endpoint: string; publicKey: string };

const GLOBAL_HANDLERS_KEY = '__secretSantaErrorHandlersInstalled';

function parseDsn(dsn: string | undefined): DsnTarget | null {
  if (!dsn?.trim()) return null;
  try {
    const url = new URL(dsn.trim());
    const publicKey = decodeURIComponent(url.username);
    const projectId = url.pathname.replace(/^\/+|\/+$/g, '');
    if (!publicKey || !projectId || !/^https?:$/.test(url.protocol)) return null;
    return {
      endpoint: `${url.origin}/api/${projectId}/envelope/`,
      publicKey,
    };
  } catch {
    return null;
  }
}

function safeLocation(): string | undefined {
  const location = (globalThis as { location?: { href?: string } }).location;
  if (!location?.href) return undefined;
  try {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    if (/^\/room(?:\/|$)/.test(url.pathname)) url.pathname = '/room/[redacted]';
    return url.toString();
  } catch {
    return undefined;
  }
}

function toError(error: unknown): { type: string; value: string; stack?: string } {
  if (error instanceof Error) {
    return { type: error.name || 'Error', value: error.message, stack: error.stack };
  }
  return { type: 'UnknownError', value: typeof error === 'string' ? error : JSON.stringify(error) };
}

function parseStack(stack: string | undefined) {
  if (!stack) return undefined;
  const frames = stack
    .split('\n')
    .slice(1, 21)
    .map((line) => {
      const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/);
      if (!match) return null;
      return {
        function: (match[1] ?? '<anonymous>').trim(),
        filename: match[2],
        lineno: Number(match[3]),
        colno: Number(match[4]),
      };
    })
    .filter((frame): frame is NonNullable<typeof frame> => frame !== null);
  return frames.length ? frames.reverse() : undefined;
}

export function createErrorReporter(config: ErrorReporterConfig): ErrorReporter {
  const target = parseDsn(config.dsn);
  const pending = new Set<Promise<unknown>>();
  const fetchFn = config.fetch ?? globalThis.fetch?.bind(globalThis);
  const enabled = Boolean(target && fetchFn);

  function captureException(error: unknown, context: Record<string, unknown> = {}) {
    if (!target || !fetchFn) return;

    const eventId = globalThis.crypto?.randomUUID?.().replace(/-/g, '') ?? '00000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const normalized = toError(error);
    const stacktrace = parseStack(normalized.stack);
    const url = safeLocation();

    const event = {
      event_id: eventId,
      timestamp,
      level: 'error',
      platform: 'javascript',
      environment: config.environment ?? 'production',
      release: config.release,
      exception: {
        values: [
          {
            type: normalized.type,
            value: normalized.value,
            stacktrace: stacktrace ? { frames: stacktrace } : undefined,
          },
        ],
      },
      extra: {
        ...context,
        ...(normalized.stack ? { raw_stack: normalized.stack } : {}),
      },
      ...(url ? { request: { url, method: 'GET' } } : {}),
    };

    const body = [
      JSON.stringify({ dsn: config.dsn, event_id: eventId, sent_at: timestamp }),
      JSON.stringify({ type: 'event', content_type: 'application/json' }),
      JSON.stringify(event),
      '',
    ].join('\n');

    const task = fetchFn(target.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body,
    })
      .catch(() => undefined)
      .finally(() => pending.delete(task));

    pending.add(task);
  }

  function installGlobalHandlers() {
    const browserWindow = (globalThis as { window?: unknown }).window;
    if (!enabled || !browserWindow) return undefined;

    type MinimalWindow = {
      addEventListener: (type: string, handler: (event: unknown) => void) => void;
      removeEventListener: (type: string, handler: (event: unknown) => void) => void;
    };
    const scope = browserWindow as MinimalWindow & Record<string, boolean>;
    if (scope[GLOBAL_HANDLERS_KEY]) return undefined;
    scope[GLOBAL_HANDLERS_KEY] = true;

    const onError = (event: unknown) => {
      const detail = event as { error?: unknown; message?: string };
      captureException(detail.error ?? detail.message, { source: 'window.onerror' });
    };
    const onRejection = (event: unknown) => {
      const detail = event as { reason?: unknown };
      captureException(detail.reason, { source: 'unhandledrejection' });
    };

    scope.addEventListener('error', onError);
    scope.addEventListener('unhandledrejection', onRejection);
    return () => {
      scope.removeEventListener('error', onError);
      scope.removeEventListener('unhandledrejection', onRejection);
      scope[GLOBAL_HANDLERS_KEY] = false;
    };
  }

  async function flush() {
    await Promise.allSettled([...pending]);
  }

  return { enabled, captureException, installGlobalHandlers, flush };
}
