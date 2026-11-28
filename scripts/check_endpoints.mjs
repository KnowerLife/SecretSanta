#!/usr/bin/env node
/**
 * Provider-agnostic smoke/synthetic checks for the static Pages showcase and
 * the optional Hono API. Used by .github/workflows/synthetic-checks.yml and by
 * the UptimeRobot/Checkly setup described in docs/OBSERVABILITY.md.
 *
 * No third-party dependencies: Node.js 22+ fetch is enough.
 */

const DEFAULT_PAGES_URL = 'https://knowerlife.github.io/SecretSanta/';
const SHOWCASE_ROUTES = ['', 'create/', 'join/', 'quick-draw/'];
const ROOM_ROUTE = 'room/DEMO123/';
const REQUEST_TIMEOUT_MS = 10_000;

export function buildTargets(pagesUrl = DEFAULT_PAGES_URL, apiUrl = '') {
  const base = new URL(pagesUrl.endsWith('/') ? pagesUrl : `${pagesUrl}/`);
  const pages = [...SHOWCASE_ROUTES, ROOM_ROUTE].map((route) => ({
    name: route ? `/${route.replace(/\/$/, '')}` : '/',
    url: new URL(route, base).toString(),
    kind: 'pages',
    allowNotFound: route === ROOM_ROUTE,
  }));

  const targets = pages;
  if (apiUrl.trim()) {
    const api = new URL(apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
    targets.push({
      name: '/api/health',
      url: new URL('api/health', api).toString(),
      kind: 'api',
      allowNotFound: false,
    });
  }
  return targets;
}

export function checkHtml(html, name) {
  const problems = [];
  if (!/<html\b[^>]*\blang\s*=\s*["'](ru|en)["']/i.test(html)) {
    problems.push('html lang is missing or not ru/en');
  }
  if (!/<title>[\s\S]*?<\/title>/i.test(html)) {
    problems.push('title is missing');
  }
  if (!/<main\b/i.test(html)) {
    problems.push('main landmark is missing');
  }
  if (name === '/' && !/github\.com\/KnowerLife\/SecretSanta/i.test(html)) {
    problems.push('repository link is missing from the footer');
  }
  return problems;
}

async function request(target) {
  const response = await fetch(target.url, {
    headers: { accept: target.kind === 'api' ? 'application/json' : 'text/html' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    redirect: 'follow',
  });
  const body = await response.text();
  const problems = [];

  if (target.kind === 'api') {
    if (!response.ok) problems.push(`HTTP ${response.status}`);
    try {
      const payload = JSON.parse(body);
      if (payload.ok !== true) problems.push('health payload has ok !== true');
    } catch {
      problems.push('health response is not JSON');
    }
    return problems;
  }

  const notFoundOk = target.allowNotFound && response.status === 404;
  if (!response.ok && !notFoundOk) problems.push(`HTTP ${response.status}`);
  if (!/<html\b/i.test(body)) problems.push('response is not HTML');
  problems.push(...checkHtml(body, target.name));
  return problems;
}

export async function runChecks({ pagesUrl, apiUrl, log = console.log } = {}) {
  const pages = pagesUrl || process.env.PAGES_URL || process.env.PAGES_BASE_URL;
  const api = apiUrl ?? process.env.API_URL ?? process.env.MONITOR_API_URL;
  const targets = buildTargets(pages, api);
  let failed = 0;

  for (const target of targets) {
    try {
      const problems = await request(target);
      if (problems.length === 0) {
        log(`ok   ${target.name} ${target.url}`);
      } else {
        failed += 1;
        log(`FAIL ${target.name} ${target.url}: ${problems.join('; ')}`);
      }
    } catch (error) {
      failed += 1;
      log(`FAIL ${target.name} ${target.url}: ${error?.message ?? String(error)}`);
    }
  }

  log(`${targets.length - failed}/${targets.length} checks passed`);
  return failed === 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = await runChecks();
  process.exitCode = ok ? 0 : 1;
}
