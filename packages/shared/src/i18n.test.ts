import { test } from 'node:test';
import assert from 'node:assert/strict';

import { I18N } from './i18n-data.ts';
import {
  hasKey,
  keys,
  missingKeys,
  pluralRu,
  quickResultMetaKey,
  t,
} from './i18n.ts';

test('словарь содержит полный bilingual-набор ключей', () => {
  assert.ok(Object.keys(I18N.ru).length >= 450);
  assert.ok(Object.keys(I18N.en).length >= 450);
  assert.equal(Object.keys(I18N.ru).length, 458);
  assert.equal(Object.keys(I18N.en).length, 457);
  assert.equal(keys('ru').length, 458);
  assert.equal(keys('en').length, 457);
});

test('известные ключи разрешаются в обеих локалях', () => {
  for (const locale of ['ru', 'en'] as const) {
    assert.notEqual(t(locale, 'meta.title'), 'meta.title');
    assert.notEqual(t(locale, 'quick.personalHello'), 'quick.personalHello');
    assert.ok(hasKey(locale, 'brand.name'));
  }
  assert.match(I18N.ru['brand.name']!, /<span class="brand__word">/);
  assert.equal(t('ru', 'brand.name'), I18N.ru['brand.name']);
});

test('подстановка параметров заменяет плейсхолдеры', () => {
  assert.equal(t('ru', 'quick.personalHello', { name: 'Аня' }), 'Привет, Аня!');
  assert.equal(t('en', 'quick.personalHello', { name: 'Ann' }), 'Hi, Ann!');
  assert.equal(t('ru', 'quick.pair', { santa: 'A', recipient: 'B' }), 'A → B');
  assert.equal(t('ru', 'quick.resultMetaOne', { n: 1 }), '1 пара');
  assert.equal(t('ru', 'quick.resultMetaOne', {}), '{n} пара');
});

test('fallback: EN падает на RU, неизвестный ключ остаётся ключом', () => {
  assert.equal(t('en', 'quick.resultMetaFew', { n: 2 }), '2 пары');
  assert.equal(t('en', 'no.such.key'), 'no.such.key');
  assert.equal(hasKey('en', 'quick.resultMetaFew'), false);
});

test('missingKeys содержит только известный RU-плюральный ключ', () => {
  assert.deepEqual(missingKeys(), ['quick.resultMetaFew']);
});

test('pluralRu реализует русские правила плюрализации', () => {
  assert.equal(pluralRu(1), 'one');
  assert.equal(pluralRu(21), 'one');
  assert.equal(pluralRu(101), 'one');
  assert.equal(pluralRu(2), 'few');
  assert.equal(pluralRu(4), 'few');
  assert.equal(pluralRu(23), 'few');
  assert.equal(pluralRu(0), 'many');
  assert.equal(pluralRu(5), 'many');
  assert.equal(pluralRu(11), 'many');
  assert.equal(pluralRu(12), 'many');
  assert.equal(pluralRu(14), 'many');
  assert.equal(pluralRu(111), 'many');
  assert.equal(pluralRu(-1), 'one');
  assert.equal(pluralRu(-22), 'few');
});

test('quickResultMetaKey выбирает существующий ключ словаря', () => {
  assert.equal(quickResultMetaKey(1), 'quick.resultMetaOne');
  assert.equal(quickResultMetaKey(3), 'quick.resultMetaFew');
  assert.equal(quickResultMetaKey(11), 'quick.resultMetaMany');
  assert.ok(hasKey('ru', quickResultMetaKey(3)));
});
