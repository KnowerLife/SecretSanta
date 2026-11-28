import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDesiredMonitors, missingMonitors } from './uptimerobot-sync.mjs';

test('buildDesiredMonitors always includes the Pages monitor', () => {
  const monitors = buildDesiredMonitors();
  assert.equal(monitors.length, 1);
  assert.equal(monitors[0].friendly_name, '[SecretSanta] Pages showcase');
  assert.equal(monitors[0].url, 'https://knowerlife.github.io/SecretSanta/');
  assert.equal(monitors[0].interval, 300);
});

test('buildDesiredMonitors adds the health monitor when an API URL is set', () => {
  const monitors = buildDesiredMonitors({ apiUrl: 'http://127.0.0.1:8787' });
  assert.equal(monitors.length, 2);
  assert.equal(monitors[1].url, 'http://127.0.0.1:8787/api/health');
});

test('missingMonitors is idempotent by name and by URL', () => {
  const desired = buildDesiredMonitors({ apiUrl: 'https://api.example.org' });
  const existing = [
    { friendly_name: '[SecretSanta] Pages showcase', url: 'https://knowerlife.github.io/SecretSanta' },
    { friendly_name: 'Something else', url: 'https://api.example.org/api/health/' },
  ];
  assert.deepEqual(missingMonitors(desired, existing), []);
});

test('missingMonitors returns only absent monitors', () => {
  const desired = buildDesiredMonitors({ apiUrl: 'https://api.example.org' });
  const missing = missingMonitors(desired, [{ friendly_name: 'other', url: 'https://other.example.org' }]);
  assert.deepEqual(missing.map((m) => m.friendly_name), [
    '[SecretSanta] Pages showcase',
    '[SecretSanta] API health',
  ]);
});
