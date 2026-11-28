/**
 * Cookieless GoatCounter integration for the static Pages showcase only.
 *
 * No script is injected into the HTML shell: room deep links are served from
 * 404.html and must stay analytics-free. The script is created at runtime,
 * only on public showcase routes, and only when a site code is configured.
 */

import { BASE_PATH, PAGES_MODE } from './base.ts';

const ENV = (import.meta as ImportMeta & { env?: Record<string, string> }).env ?? {};
const CODE = (ENV.VITE_GOATCOUNTER_CODE ?? '').trim();
const SCRIPT_SRC = 'https://gc.zgo.at/count.js';

type GoatCounter = {
  no_onload?: boolean;
  count?: (vars: { path: string }) => void;
};

type GoatCounterWindow = Window & { goatcounter?: GoatCounter };

export const ANALYTICS_ENABLED = PAGES_MODE && /^[a-z0-9-]+$/i.test(CODE);

const pendingPaths: string[] = [];
let scriptStarted = false;

/** Returns a privacy-safe path, or null for routes that must never be tracked. */
export function analyticPath(pathname: string): string | null {
  const relative = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length)
    : pathname;
  const trimmed = relative.replace(/\/+$/, '');
  const clean = (trimmed.startsWith('/') ? trimmed : `/${trimmed}`) || '/';

  // Room codes and recipient data are private, even in the static showcase.
  if (clean === '/room' || clean.startsWith('/room/')) return null;

  return clean;
}

export function trackingAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { doNotTrack?: string };
  const win = window as Window & { doNotTrack?: string };
  return nav.doNotTrack !== '1' && win.doNotTrack !== '1';
}

function flushPending() {
  const counter = (window as GoatCounterWindow).goatcounter;
  if (typeof counter?.count !== 'function') return;
  while (pendingPaths.length) {
    const path = pendingPaths.shift();
    if (path) counter.count({ path });
  }
}

function injectScript() {
  if (scriptStarted || typeof document === 'undefined') return;
  scriptStarted = true;

  const target = window as GoatCounterWindow;
  target.goatcounter = { ...(target.goatcounter ?? {}), no_onload: true };

  if (document.querySelector('script[data-goatcounter]')) {
    flushPending();
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = SCRIPT_SRC;
  script.dataset.goatcounter = `https://${CODE}.goatcounter.com/count`;
  script.addEventListener('load', flushPending);
  document.head.appendChild(script);
}

export function trackPageview(pathname: string): void {
  if (!ANALYTICS_ENABLED || !trackingAllowed()) return;
  const path = analyticPath(pathname);
  if (!path) return;

  pendingPaths.push(path);
  injectScript();
  flushPending();
}
