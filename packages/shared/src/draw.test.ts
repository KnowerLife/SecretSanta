import assert from 'node:assert/strict';
import test from 'node:test';
import { drawAssignments, isValidDraw } from './draw.ts';

test('базовая жеребьёвка не создаёт самоназначений', () => {
  const pairs = drawAssignments(['a', 'b', 'c', 'd']);
  assert.ok(pairs);
  assert.equal(pairs.length, 4);
  assert.ok(isValidDraw(pairs));
  assert.equal(new Set(pairs.map((pair) => pair.santa)).size, 4);
  assert.equal(new Set(pairs.map((pair) => pair.recipient)).size, 4);
});

test('исключения учитываются в обе стороны', () => {
  for (let i = 0; i < 40; i += 1) {
    const pairs = drawAssignments(['a', 'b', 'c', 'd'], [
      ['a', 'b'],
      ['c', 'd'],
    ]);
    assert.ok(pairs);
    for (const pair of pairs) {
      assert.notEqual(`${pair.santa}:${pair.recipient}`, 'a:b');
      assert.notEqual(`${pair.santa}:${pair.recipient}`, 'c:d');
    }
  }
});

test('невозможная конфигурация возвращает null', () => {
  assert.equal(drawAssignments(['a', 'b'], [['a', 'b'], ['b', 'a']]), null);
  assert.equal(drawAssignments(['a']), null);
  assert.equal(drawAssignments([], []), null);
});

test('валидатор отклоняет дубликаты и самоназначения', () => {
  assert.equal(isValidDraw([{ santa: 'a', recipient: 'a' }]), false);
  assert.equal(
    isValidDraw([
      { santa: 'a', recipient: 'b' },
      { santa: 'a', recipient: 'c' },
    ]),
    false,
  );
});
