import assert from 'node:assert/strict';
import test from 'node:test';

import { createErrorReporter } from './observability.ts';

const DSN = 'https://public-key@o123.ingest.sentry.io/456';

function stubFetch() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(null, { status: 200 });
  }) as typeof fetch;
  return { calls, fetchFn };
}

test('reporter is disabled without a DSN', async () => {
  const { calls, fetchFn } = stubFetch();
  const reporter = createErrorReporter({ fetch: fetchFn });
  assert.equal(reporter.enabled, false);
  reporter.captureException(new Error('ignored'));
  await reporter.flush();
  assert.equal(calls.length, 0);
});

test('reporter sends a Sentry envelope to the DSN project endpoint', async () => {
  const { calls, fetchFn } = stubFetch();
  const reporter = createErrorReporter({
    dsn: DSN,
    environment: 'test',
    release: 'v10.0.0',
    fetch: fetchFn,
  });

  assert.equal(reporter.enabled, true);
  reporter.captureException(new Error('boom'), { source: 'unit-test' });
  await reporter.flush();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://o123.ingest.sentry.io/api/456/envelope/');
  assert.equal(calls[0].init.method, 'POST');
  const [header, item, event] = String(calls[0].init.body).trim().split('\n');
  assert.equal(JSON.parse(header).dsn, DSN);
  assert.deepEqual(JSON.parse(item), { type: 'event', content_type: 'application/json' });
  assert.equal(JSON.parse(event).exception.values[0].value, 'boom');
  assert.equal(JSON.parse(event).extra.source, 'unit-test');
  const frames = JSON.parse(event).exception.values[0].stacktrace.frames;
  assert.ok(frames.length > 0);
  assert.ok(frames.some((frame: { filename: string }) => frame.filename.includes('observability.test.ts')));
});

test('invalid DSN disables reporting', () => {
  const reporter = createErrorReporter({ dsn: 'not-a-url', fetch: stubFetch().fetchFn });
  assert.equal(reporter.enabled, false);
});
