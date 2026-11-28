import assert from 'node:assert/strict';
import test from 'node:test';

import { analyticPath } from './analytics.ts';

test('analyticPath normalizes public showcase routes', () => {
  assert.equal(analyticPath('/'), '/');
  assert.equal(analyticPath('/create/'), '/create');
  assert.equal(analyticPath('/join'), '/join');
  assert.equal(analyticPath('/quick-draw'), '/quick-draw');
});

test('analyticPath never returns room paths', () => {
  assert.equal(analyticPath('/room'), null);
  assert.equal(analyticPath('/room/ABC123'), null);
  assert.equal(analyticPath('/room/ABC123/'), null);
});
