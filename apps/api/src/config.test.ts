import assert from 'node:assert/strict';
import test from 'node:test';
import { assertProductionSecret, DEV_SECRET, isStrongSecret, signingSecret } from './config.ts';

test('в production слабый секрет запрещён', () => {
  const weak = [
    undefined,
    '',
    DEV_SECRET,
    'replace-with-a-random-secret',
    'short-secret',
    'x'.repeat(31),
  ];
  for (const value of weak) {
    assert.throws(
      () => assertProductionSecret({ NODE_ENV: 'production', SECRET_SANTA_SECRET: value }),
      /SECRET_SANTA_SECRET/,
    );
  }
});

test('в production принимается длинный уникальный секрет', () => {
  const secret = 'k'.repeat(48);
  assert.equal(isStrongSecret(secret), true);
  assert.doesNotThrow(() =>
    assertProductionSecret({ NODE_ENV: 'production', SECRET_SANTA_SECRET: secret }),
  );
  assert.equal(signingSecret({ SECRET_SANTA_SECRET: secret }), secret);
});

test('вне production сохраняется прежний тестовый режим', () => {
  assert.doesNotThrow(() => assertProductionSecret({ NODE_ENV: 'test' }));
  assert.equal(signingSecret({}), DEV_SECRET);
  assert.equal(isStrongSecret(DEV_SECRET), false);
});
