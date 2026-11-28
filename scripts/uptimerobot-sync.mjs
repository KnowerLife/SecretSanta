#!/usr/bin/env node
/**
 * Idempotent UptimeRobot monitor provisioning for the SecretSanta showcase.
 *
 * Requires UPTIMEROBOT_API_KEY (read/write API key). Without a key the script
 * is a no-op so it is safe to run in CI. MONITOR_API_URL is optional: when set,
 * an /api/health monitor is created in addition to the Pages monitor.
 *
 * See docs/OBSERVABILITY.md for the manual equivalent.
 */

const API_ROOT = 'https://api.uptimerobot.com/v2';
const PAGES_URL = 'https://knowerlife.github.io/SecretSanta/';
const PAGES_NAME = '[SecretSanta] Pages showcase';
const API_NAME = '[SecretSanta] API health';
const INTERVAL_SECONDS = 300;
const TIMEOUT_SECONDS = 30;

export function buildDesiredMonitors({ pagesUrl = PAGES_URL, apiUrl = '' } = {}) {
  const monitors = [
    { friendly_name: PAGES_NAME, url: pagesUrl, type: 2 },
  ];
  if (apiUrl.trim()) {
    const base = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
    monitors.push({
      friendly_name: API_NAME,
      url: new URL('api/health', base).toString(),
      type: 2,
    });
  }
  return monitors.map((monitor) => ({ ...monitor, interval: INTERVAL_SECONDS, timeout: TIMEOUT_SECONDS }));
}

export function missingMonitors(desired, existing) {
  const urls = new Set(existing.map((m) => m.url?.replace(/\/$/, '')));
  const names = new Set(existing.map((m) => m.friendly_name));
  return desired.filter(
    (m) => !names.has(m.friendly_name) && !urls.has(m.url.replace(/\/$/, '')),
  );
}

async function callUptimeRobot(apiKey, action, fields) {
  const body = new URLSearchParams({ api_key: apiKey, format: 'json', ...fields });
  const response = await fetch(`${API_ROOT}/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.status !== 1) {
    throw new Error(`${action} failed: ${payload.error?.message ?? payload.error ?? `HTTP ${response.status}`}`);
  }
  return payload;
}

export async function syncMonitors({
  apiKey = process.env.UPTIMEROBOT_API_KEY,
  apiUrl = process.env.MONITOR_API_URL,
  dryRun = process.env.DRY_RUN === '1',
  log = console.log,
} = {}) {
  if (!apiKey) {
    log('UPTIMEROBOT_API_KEY is not set; skipping monitor sync.');
    return { created: 0, skipped: true };
  }

  const desired = buildDesiredMonitors({ apiUrl });
  const existingPayload = await callUptimeRobot(apiKey, 'getMonitors', {
    logs: '0',
    limit: '100',
    offset: '0',
  });
  const toCreate = missingMonitors(desired, existingPayload.monitors ?? []);

  if (toCreate.length === 0) {
    log('All SecretSanta monitors already exist.');
    return { created: 0 };
  }

  if (dryRun) {
    for (const monitor of toCreate) log(`[dry-run] would create ${monitor.friendly_name} -> ${monitor.url}`);
    return { created: 0, dryRun: true };
  }

  let created = 0;
  for (const monitor of toCreate) {
    await callUptimeRobot(apiKey, 'createMonitor', {
      type: String(monitor.type),
      friendly_name: monitor.friendly_name,
      url: monitor.url,
      interval: String(monitor.interval),
      timeout: String(monitor.timeout),
    });
    created += 1;
    log(`created ${monitor.friendly_name} -> ${monitor.url}`);
  }
  return { created };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await syncMonitors();
  } catch (error) {
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
  }
}
