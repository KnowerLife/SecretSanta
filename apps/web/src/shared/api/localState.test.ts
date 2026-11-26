import assert from 'node:assert/strict';
import test from 'node:test';

class MemoryStorage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  dump(): Record<string, string> {
    return Object.fromEntries(this.data);
  }
}

const storage = new MemoryStorage();
Object.assign(globalThis, {
  window: { localStorage: storage, location: { origin: 'http://127.0.0.1:3000' } },
  document: { cookie: '' },
});

const {
  LOCAL_STATE_KEY,
  addLocalWishlist,
  createLocalRoom,
  drawLocalRoom,
  localAssignment,
  localRoomView,
  postLocalMessage,
  readLocalMessages,
  readLocalState,
  resetLocalDraw,
} = await import('./localState.ts');

function newRoom() {
  return createLocalRoom({
    name: 'Локальная проверка',
    organizerName: 'Аня',
    eventDate: '2027-01-01',
    memberNames: ['Борис', 'Вика', 'Галя'],
  });
}

test('локальное состояние переживает перезагрузку страницы', () => {
  const room = newRoom();
  const wish = addLocalWishlist(room.code, 'Книга про ёлку');
  assert.equal(wish.ok, true);
  drawLocalRoom(room.code);
  const message = postLocalMessage(room.code, { channel: 'to_recipient', text: 'Привет!' });
  assert.equal(message.ok, true);

  const before = storage.getItem(LOCAL_STATE_KEY);
  const reloaded = readLocalState();
  const saved = reloaded.rooms.find((item) => item.code === room.code);
  assert.ok(saved);
  assert.equal(saved!.name, 'Локальная проверка');
  const me = saved!.members.find((member) => member.id === saved!.meId);
  assert.equal(me?.wishlist.length, 1);
  assert.equal(readLocalMessages(room.code).messages.length, 1);
  assert.equal(storage.getItem(LOCAL_STATE_KEY), before);
});

test('жеребьёвка использует общий алгоритм и хранит только пару текущего участника', () => {
  const room = newRoom();
  const result = drawLocalRoom(room.code);
  assert.equal(result.pairs, 4);
  assert.ok(result.drawRunId);

  const parsed = JSON.parse(storage.getItem(LOCAL_STATE_KEY)!) as {
    rooms: Array<{ code: string; meId: string; assignment: Record<string, string> }>;
  };
  const saved = parsed.rooms.find((item) => item.code === room.code)!;
  assert.deepEqual(Object.keys(saved.assignment), [saved.meId]);

  const serialized = JSON.stringify(storage.dump());
  assert.equal(serialized.includes('"pairs":[{"santa"'), false);
  assert.equal(JSON.stringify(localRoomView(room.code).room).includes('assignment'), false);
  assert.ok(localAssignment(room.code).recipient?.name);
});

test('конфликтующие исключения делают локальную жеребьёвку невозможной', () => {
  const room = newRoom();
  const ids = room.room.members.map((member) => member.id);
  const allPairs: Array<[string, string]> = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) allPairs.push([ids[i]!, ids[j]!]);
  }
  assert.throws(
    () => drawLocalRoom(room.code, allPairs),
    (error: unknown) => (error as { code?: string }).code === 'draw_impossible',
  );
  assert.equal(localAssignment(room.code).drawn, false);
});

test('сброс жеребьёвки очищает назначение и чат', () => {
  const room = newRoom();
  drawLocalRoom(room.code);
  postLocalMessage(room.code, { channel: 'to_recipient', text: 'Привет!' });
  assert.equal(resetLocalDraw(room.code).ok, true);
  assert.equal(localAssignment(room.code).drawn, false);
  assert.equal(localRoomView(room.code).room.drawRunId, null);
  assert.equal(readLocalMessages(room.code).messages.length, 0);
});
