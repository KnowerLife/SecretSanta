import assert from 'node:assert/strict';
import test from 'node:test';

Object.assign(globalThis, {
  window: { location: { origin: 'http://127.0.0.1:3000' } },
});

const { buildPairsCsv, decodePair, encodePair, hasDuplicateNames, personalUrl } = await import(
  './pairs.ts'
);

test('персональная ссылка содержит ровно одну пару и не раскрывает остальные', () => {
  const pair = { santa: 'Аня', recipient: 'Борис' };
  const token = encodePair(pair);
  assert.deepEqual(decodePair(token), pair);
  const url = new URL(personalUrl(pair));
  assert.equal(url.pathname, '/quick-draw');
  assert.equal(url.searchParams.get('gift'), token);
  assert.equal(decodePair(url.searchParams.get('gift') ?? '')?.recipient, 'Борис');
  assert.equal(url.searchParams.get('gift')?.includes('Вика'), false);
  assert.equal(decodePair('not-a-token'), null);
});

test('проверка дубликатов регистронезависима в RU и EN', () => {
  assert.equal(hasDuplicateNames(['Аня', 'аня']), true);
  assert.equal(hasDuplicateNames(['Ann', 'ANN']), true);
  assert.equal(hasDuplicateNames(['Аня', 'Борис']), false);
});

test('CSV использует кириллический заголовок v68 и экранирует кавычки', () => {
  const csv = buildPairsCsv([{ santa: 'А"ня', recipient: 'Борис' }]);
  assert.match(csv, /^\uFEFFСанта,Получатель\n/);
  assert.match(csv, /"А""ня","Борис"/);
});
