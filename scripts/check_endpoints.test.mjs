import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTargets, checkHtml } from './check_endpoints.mjs';

test('buildTargets covers showcase routes, room stub and optional API', () => {
  const targets = buildTargets('https://example.org/SecretSanta/', 'https://api.example.org');
  assert.deepEqual(
    targets.map((t) => t.name),
    ['/', '/create', '/join', '/quick-draw', '/room/DEMO123', '/api/health'],
  );
  assert.equal(targets[0].url, 'https://example.org/SecretSanta/');
  assert.equal(targets[1].url, 'https://example.org/SecretSanta/create/');
  assert.equal(targets[4].allowNotFound, true);
  assert.equal(targets[5].url, 'https://api.example.org/api/health');
});

test('buildTargets normalizes a base URL without trailing slash', () => {
  const [root] = buildTargets('https://example.org/SecretSanta');
  assert.equal(root.url, 'https://example.org/SecretSanta/');
});

test('buildTargets skips API when no API URL is configured', () => {
  const targets = buildTargets('https://example.org/SecretSanta/');
  assert.equal(targets.some((t) => t.kind === 'api'), false);
});

test('checkHtml validates language, landmarks, title and footer link', () => {
  const good = `<!doctype html><html lang="ru"><head><title>Тайный Санта</title></head><body><main id="main"></main><footer><a href="https://github.com/KnowerLife/SecretSanta">repo</a></footer></body></html>`;
  assert.deepEqual(checkHtml(good, '/'), []);

  const bad = '<html><body><div>no landmarks</div></body></html>';
  assert.deepEqual(checkHtml(bad, '/'), [
    'html lang is missing or not ru/en',
    'title is missing',
    'main landmark is missing',
    'repository link is missing from the footer',
  ]);
});

test('checkHtml does not require the footer link on inner routes', () => {
  const page = '<html lang="en"><head><title>Draw</title></head><body><main></main></body></html>';
  assert.deepEqual(checkHtml(page, '/quick-draw'), []);
});
