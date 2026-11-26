/**
 * Версионированное состояние локальной игры в localStorage.
 *
 * Приватность: в `room.assignment` хранится только пара текущего участника
 * `assignment[room.meId]`. Полная таблица пар никогда не попадает в хранилище.
 */

import { drawAssignments } from '@secret-santa/shared/draw';
import type {
  ActivityView,
  CreateRoomInput,
  JoinRoomInput,
  LocalGameState,
  LocalMember,
  LocalRoom,
  MessageView,
  RoomMemberView,
  RoomTheme,
  RoomView,
} from '@secret-santa/shared/contracts';
import { apiError, rememberRoom, roomToken } from './http.ts';

export const LOCAL_STATE_KEY = 'ss:v69:local-state';
export const LOCAL_OUTBOX_KEY = 'ss:v69:local-outbox';
export const LOCAL_STATE_VERSION = 1 as const;

export interface LocalOutboxEntry {
  id: string;
  path: string;
  method: string;
  body: unknown;
  code: string;
  token: string | null;
  createdAt: string;
}

const THEMES: RoomTheme[] = ['winter', 'midnight', 'cozy'];
const STATUSES = ['none', 'idea', 'bought', 'done'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

export function newRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'L';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)] ?? 'A';
  }
  return code;
}

function localToken(kind: 'sess' | 'mem' | 'invite', code: string, memberId: string): string {
  return `local.${kind}.${code}.${memberId}.${Math.random().toString(36).slice(2, 10)}`;
}

function normaliseMember(raw: LocalMember): LocalMember {
  const id = String(raw?.id ?? '');
  const wishlist = Array.isArray(raw?.wishlist)
    ? raw.wishlist.filter((item) => item && typeof item.text === 'string').map((item) => ({ id: String(item.id ?? newId('wish')), text: String(item.text) }))
    : [];
  const profile: Record<string, string> = {};
  if (isRecord(raw?.profile)) {
    for (const [key, value] of Object.entries(raw.profile)) {
      if (typeof value === 'string') profile[key] = value;
    }
  }
  return {
    id,
    name: String(raw?.name ?? ''),
    role: raw?.role === 'organizer' ? 'organizer' : 'participant',
    giftStatus: STATUSES.includes(raw?.giftStatus) ? raw.giftStatus : 'none',
    wishlist,
    profile,
    token: String(raw?.token ?? localToken('mem', '', id)),
  };
}

function normaliseRoom(raw: LocalRoom): LocalRoom {
  const meId = String(raw?.meId ?? '');
  // При чтении выкидываем всё, кроме пары текущего участника, даже если хранилище повреждено.
  const assignment: Record<string, string> = {};
  const stored = isRecord(raw?.assignment) ? raw.assignment : {};
  if (meId && typeof stored[meId] === 'string') assignment[meId] = stored[meId] as string;

  const members = Array.isArray(raw?.members) ? raw.members.map(normaliseMember) : [];
  const messages = Array.isArray(raw?.messages) ? raw.messages : [];
  const room: LocalRoom = {
    code: String(raw?.code ?? '').toUpperCase(),
    name: String(raw?.name ?? ''),
    eventDate: typeof raw?.eventDate === 'string' ? raw.eventDate : null,
    theme: THEMES.includes(raw?.theme) ? raw.theme : 'winter',
    demo: Boolean(raw?.demo),
    budgetMin: Number(raw?.budgetMin ?? 0) || 0,
    budgetMax: Number(raw?.budgetMax ?? 0) || 0,
    status: String(raw?.status ?? 'active'),
    members,
    exclusions: Array.isArray(raw?.exclusions)
      ? raw.exclusions.map((item) => ({
          memberA: String(item.memberA ?? ''),
          memberB: String(item.memberB ?? ''),
          groupName: typeof item.groupName === 'string' ? item.groupName : null,
        }))
      : [],
    drawRunId: typeof raw?.drawRunId === 'string' ? raw.drawRunId : null,
    ready: {
      members: members.length,
      wishlists: members.reduce((sum, member) => sum + member.wishlist.length, 0),
      gifts: members.filter((member) => member.giftStatus !== 'none').length,
    },
    meId,
    assignment,
    messages,
    activity: Array.isArray(raw?.activity) ? raw.activity : [],
    dirty: Boolean(raw?.dirty),
  };
  return room;
}

export function emptyLocalState(): LocalGameState {
  return { version: LOCAL_STATE_VERSION, rooms: [], updatedAt: new Date().toISOString() };
}

export function readLocalState(): LocalGameState {
  if (typeof window === 'undefined') return emptyLocalState();
  try {
    const raw = window.localStorage.getItem(LOCAL_STATE_KEY);
    if (!raw) return emptyLocalState();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== LOCAL_STATE_VERSION || !Array.isArray(parsed.rooms)) {
      return emptyLocalState();
    }
    return {
      version: LOCAL_STATE_VERSION,
      rooms: parsed.rooms
        .filter((room): room is LocalRoom => isRecord(room) && typeof room.code === 'string' && Array.isArray(room.members))
        .map((room) => normaliseRoom(room as LocalRoom)),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return emptyLocalState();
  }
}

export function writeLocalState(state: LocalGameState): LocalGameState {
  const next: LocalGameState = {
    version: LOCAL_STATE_VERSION,
    rooms: state.rooms.map((room) => normaliseRoom(room)),
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(next));
    } catch {
      // Переполнение хранилища не должно ломать игру: состояние остаётся в памяти вызова.
    }
  }
  return next;
}

export function seedLocalState(): LocalGameState {
  const state = readLocalState();
  return writeLocalState(state);
}

export function resetLocalState(): LocalGameState {
  if (typeof window !== 'undefined') window.localStorage.removeItem(LOCAL_STATE_KEY);
  return emptyLocalState();
}

export function findLocalRoom(code: string): LocalRoom | undefined {
  const key = code.trim().toUpperCase();
  return readLocalState().rooms.find((room) => room.code === key);
}

export function requireLocalRoom(code: string): LocalRoom {
  const room = findLocalRoom(code);
  if (!room) throw apiError('room_not_found', 404, 'room_not_found');
  return room;
}

function upsertLocalRoom(room: LocalRoom): LocalRoom {
  const saved = normaliseRoom(room);
  const state = readLocalState();
  const index = state.rooms.findIndex((item) => item.code === saved.code);
  const rooms = [...state.rooms];
  if (index >= 0) rooms[index] = saved;
  else rooms.push(saved);
  writeLocalState({ ...state, rooms });
  return saved;
}

function markDirty(room: LocalRoom): void {
  room.dirty = true;
}

function appendActivity(room: LocalRoom, type: string, payload: unknown = {}, actor: string | null = null): void {
  const actorName = actor ? room.members.find((member) => member.id === actor)?.name ?? null : null;
  const event: ActivityView = {
    id: newId('evt'),
    type,
    actor,
    actorName,
    payload,
    createdAt: new Date().toISOString(),
  };
  room.activity = [event, ...room.activity].slice(0, 50);
}

function publicRoomView(room: LocalRoom): RoomView {
  const members: RoomMemberView[] = room.members.map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    giftStatus: member.giftStatus,
    wishlist: member.wishlist.map((item) => ({ id: item.id, text: item.text })),
    profile: { ...member.profile },
  }));
  return {
    code: room.code,
    name: room.name,
    eventDate: room.eventDate,
    theme: room.theme,
    demo: room.demo,
    budgetMin: room.budgetMin,
    budgetMax: room.budgetMax,
    status: room.status,
    members,
    exclusions: room.exclusions.map((item) => ({ ...item })),
    drawRunId: room.drawRunId,
    ready: {
      members: members.length,
      wishlists: members.reduce((sum, member) => sum + member.wishlist.length, 0),
      gifts: members.filter((member) => member.giftStatus !== 'none').length,
    },
  };
}

function meMember(room: LocalRoom): LocalMember {
  const member = room.members.find((item) => item.id === room.meId);
  if (!member) throw apiError('unauthorized', 401, 'unauthorized');
  return member;
}

function asTheme(value: unknown): RoomTheme {
  return THEMES.includes(value as RoomTheme) ? (value as RoomTheme) : 'winter';
}

interface CreatedLocalRoom {
  ok: boolean;
  code: string;
  token: string;
  sessionId: string;
  inviteToken: string;
  memberToken: string;
  room: RoomView;
}

export function createLocalRoom(input: Partial<CreateRoomInput> & { demo?: boolean } = {}): CreatedLocalRoom {
  let code = newRoomCode();
  while (findLocalRoom(code)) code = newRoomCode();

  const organizerId = newId('mem');
  const sessionId = newId('sess');
  const organizerToken = localToken('mem', code, organizerId);
  const organizer: LocalMember = {
    id: organizerId,
    name: String(input.organizerName ?? 'Организатор'),
    role: 'organizer',
    giftStatus: 'none',
    wishlist: [],
    profile: {},
    token: organizerToken,
  };
  const seen = new Set([organizer.name.trim().toLowerCase()]);
  const members = [organizer];
  for (const rawName of input.memberNames ?? []) {
    const name = String(rawName ?? '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key) || members.length >= 100) continue;
    seen.add(key);
    const id = newId('mem');
    members.push({
      id,
      name,
      role: 'participant',
      giftStatus: 'none',
      wishlist: [],
      profile: {},
      token: localToken('mem', code, id),
    });
  }

  const room: LocalRoom = {
    code,
    name: String(input.name ?? 'Локальная игра'),
    eventDate: typeof input.eventDate === 'string' && input.eventDate ? input.eventDate : null,
    theme: asTheme(input.theme),
    demo: Boolean(input.demo),
    budgetMin: Number(input.budgetMin ?? 0) || 0,
    budgetMax: Number(input.budgetMax ?? 0) || 0,
    status: 'active',
    members,
    exclusions: [],
    drawRunId: null,
    ready: { members: members.length, wishlists: 0, gifts: 0 },
    meId: organizerId,
    assignment: {},
    messages: [],
    activity: [],
    dirty: true,
  };
  appendActivity(room, 'room.created', { code, name: room.name }, organizerId);

  if (input.demo) {
    const pairs = drawAssignments(members.map((member) => member.id), []);
    if (pairs) {
      room.drawRunId = newId('run');
      const mine = pairs.find((pair) => pair.santa === room.meId);
      if (mine) room.assignment[room.meId] = mine.recipient;
      appendActivity(room, 'room.drawn', { runId: room.drawRunId, pairs: pairs.length }, organizerId);
    }
  }

  upsertLocalRoom(room);
  const sessionToken = localToken('sess', code, organizerId);
  const inviteToken = localToken('invite', code, '');
  rememberRoom(code, sessionToken, organizerToken);
  return {
    ok: true,
    code,
    token: sessionToken,
    sessionId,
    inviteToken,
    memberToken: organizerToken,
    room: publicRoomView(room),
  };
}

export function joinLocalRoom(input: Partial<JoinRoomInput> = {}): {
  ok: boolean;
  token: string;
  sessionId: string;
  memberToken: string;
  joinMode: string;
  room: RoomView;
} {
  const room = requireLocalRoom(String(input.code ?? ''));
  const requestedName = typeof input.name === 'string' ? input.name.trim() : '';
  const candidateToken = input.memberToken ?? roomToken(room.code);
  let member = room.members.find((item) => item.token && item.token === candidateToken);
  if (!member && requestedName) {
    member = room.members.find((item) => item.name.toLowerCase() === requestedName.toLowerCase());
  }
  let joinMode = member ? 'member' : 'invite';
  if (!member && requestedName) {
    const id = newId('mem');
    member = {
      id,
      name: requestedName,
      role: 'participant',
      giftStatus: 'none',
      wishlist: [],
      profile: {},
      token: localToken('mem', room.code, id),
    };
    room.members.push(member);
    joinMode = 'invite';
  }
  if (!member) throw apiError('join_not_allowed', 403, 'join_not_allowed');

  room.meId = member.id;
  // Новый участник не должен видеть пару предыдущего: храним только его назначение (которое пока неизвестно).
  room.assignment = {};
  appendActivity(room, 'room.member_joined', { name: member.name, memberId: member.id }, member.id);
  markDirty(room);

  const sessionId = newId('sess');
  const sessionToken = localToken('sess', room.code, member.id);
  rememberRoom(room.code, sessionToken, member.token);
  const saved = upsertLocalRoom(room);
  return {
    ok: true,
    token: sessionToken,
    sessionId,
    memberToken: member.token,
    joinMode,
    room: publicRoomView(saved),
  };
}

export function drawLocalRoom(code: string, requested: Array<[string, string]> = []): {
  ok: boolean;
  drawRunId: string;
  pairs: number;
} {
  const room = requireLocalRoom(code);
  if (meMember(room).role !== 'organizer') throw apiError('organizer_only', 403, 'organizer_only');

  const ids = room.members.map((member) => member.id);
  const known = new Set(ids);
  const exclusions: Array<[string, string]> = room.exclusions
    .map((item) => [item.memberA, item.memberB] as [string, string])
    .concat(requested)
    .filter(([a, b]) => known.has(a) && known.has(b));

  const pairs = drawAssignments(ids, exclusions);
  if (!pairs) throw apiError('draw_impossible', 409, 'draw_impossible');

  const drawRunId = newId('run');
  room.drawRunId = drawRunId;
  const mine = pairs.find((pair) => pair.santa === room.meId);
  room.assignment = mine ? { [room.meId]: mine.recipient } : {};
  room.messages = [];
  appendActivity(room, 'room.drawn', { runId: drawRunId, pairs: pairs.length }, room.meId);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true, drawRunId, pairs: pairs.length };
}

export function resetLocalDraw(code: string): { ok: boolean } {
  const room = requireLocalRoom(code);
  if (meMember(room).role !== 'organizer') throw apiError('organizer_only', 403, 'organizer_only');
  const runId = room.drawRunId;
  room.drawRunId = null;
  room.assignment = {};
  room.messages = [];
  appendActivity(room, 'room.draw_reset', { runId }, room.meId);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true };
}

export function addLocalExclusion(
  code: string,
  body: { memberA?: string; memberB?: string; groupName?: string },
): { ok: boolean } {
  const room = requireLocalRoom(code);
  if (meMember(room).role !== 'organizer') throw apiError('organizer_only', 403, 'organizer_only');
  const a = String(body.memberA ?? '');
  const b = String(body.memberB ?? '');
  const ids = room.members.map((member) => member.id);
  if (!a || !b || a === b || !ids.includes(a) || !ids.includes(b)) {
    throw apiError('invalid_input', 400, 'invalid_input');
  }
  const [memberA, memberB] = [a, b].sort();
  if (!room.exclusions.some((item) => item.memberA === memberA && item.memberB === memberB)) {
    room.exclusions.push({ memberA, memberB, groupName: body.groupName ?? null });
  }
  appendActivity(room, 'room.exclusion_added', { a: memberA, b: memberB, groupName: body.groupName ?? null }, room.meId);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true };
}

export function removeLocalExclusion(code: string, a: string, b: string): { ok: boolean } {
  const room = requireLocalRoom(code);
  if (meMember(room).role !== 'organizer') throw apiError('organizer_only', 403, 'organizer_only');
  const [memberA, memberB] = [a, b].sort();
  room.exclusions = room.exclusions.filter((item) => !(item.memberA === memberA && item.memberB === memberB));
  appendActivity(room, 'room.exclusion_removed', { a: memberA, b: memberB }, room.meId);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true };
}

export function addLocalGroup(code: string, body: { name?: string; memberIds?: string[] }): {
  ok: boolean;
  name: string;
  pairs: number;
} {
  const room = requireLocalRoom(code);
  if (meMember(room).role !== 'organizer') throw apiError('organizer_only', 403, 'organizer_only');
  const name = String(body.name ?? '').trim();
  const ids = [...new Set(body.memberIds ?? [])];
  const known = new Set(room.members.map((member) => member.id));
  if (!name || ids.length < 2 || ids.some((id) => !known.has(id))) {
    throw apiError('invalid_input', 400, 'invalid_input');
  }
  let pairs = 0;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const [memberA, memberB] = [ids[i]!, ids[j]!].sort();
      if (!room.exclusions.some((item) => item.memberA === memberA && item.memberB === memberB)) {
        room.exclusions.push({ memberA, memberB, groupName: name });
      }
      pairs += 1;
    }
  }
  appendActivity(room, 'room.group_added', { name, pairs }, room.meId);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true, name, pairs };
}

export function removeLocalGroup(code: string, name: string): { ok: boolean } {
  const room = requireLocalRoom(code);
  if (meMember(room).role !== 'organizer') throw apiError('organizer_only', 403, 'organizer_only');
  room.exclusions = room.exclusions.filter((item) => item.groupName !== name);
  appendActivity(room, 'room.group_removed', { name }, room.meId);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true };
}

export function addLocalMember(code: string, name: string): { ok: boolean; memberId: string } {
  const room = requireLocalRoom(code);
  if (meMember(room).role !== 'organizer') throw apiError('organizer_only', 403, 'organizer_only');
  const trimmed = name.trim();
  if (!trimmed || room.members.some((member) => member.name.toLowerCase() === trimmed.toLowerCase())) {
    throw apiError('member_exists', 409, 'member_exists');
  }
  const id = newId('mem');
  room.members.push({
    id,
    name: trimmed,
    role: 'participant',
    giftStatus: 'none',
    wishlist: [],
    profile: {},
    token: localToken('mem', room.code, id),
  });
  appendActivity(room, 'room.member_added', { name: trimmed, memberId: id }, room.meId);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true, memberId: id };
}

export function removeLocalMember(code: string, id: string): { ok: boolean } {
  const room = requireLocalRoom(code);
  const me = meMember(room);
  if (me.role !== 'organizer') throw apiError('organizer_only', 403, 'organizer_only');
  if (id === room.members.find((member) => member.role === 'organizer')?.id) {
    throw apiError('organizer_protected', 409, 'organizer_protected');
  }
  if (!room.members.some((member) => member.id === id)) throw apiError('member_not_found', 404, 'member_not_found');
  room.members = room.members.filter((member) => member.id !== id);
  room.exclusions = room.exclusions.filter((item) => item.memberA !== id && item.memberB !== id);
  room.drawRunId = null;
  room.assignment = {};
  room.messages = [];
  appendActivity(room, 'room.member_removed', { memberId: id }, me.id);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true };
}

export function addLocalWishlist(code: string, text: string): { ok: boolean; id: string } {
  const room = requireLocalRoom(code);
  const member = meMember(room);
  const trimmed = text.trim();
  if (!trimmed) throw apiError('invalid_input', 400, 'invalid_input');
  const id = newId('wish');
  member.wishlist.push({ id, text: trimmed });
  appendActivity(room, 'room.wishlist_updated', { memberId: member.id }, member.id);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true, id };
}

export function removeLocalWishlist(code: string, id: string): { ok: boolean } {
  const room = requireLocalRoom(code);
  const member = meMember(room);
  member.wishlist = member.wishlist.filter((item) => item.id !== id);
  appendActivity(room, 'room.wishlist_updated', { memberId: member.id }, member.id);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true };
}

export function setLocalGiftStatus(code: string, status: string): { ok: boolean } {
  const room = requireLocalRoom(code);
  const member = meMember(room);
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    throw apiError('invalid_input', 400, 'invalid_input');
  }
  member.giftStatus = status as (typeof STATUSES)[number];
  appendActivity(room, 'room.gift_status', { status }, member.id);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true };
}

export function setLocalProfile(code: string, patch: Record<string, string>): { ok: boolean; profile: Record<string, string> } {
  const room = requireLocalRoom(code);
  const member = meMember(room);
  member.profile = { ...member.profile, ...patch };
  appendActivity(room, 'room.profile_updated', { fields: Object.keys(patch) }, member.id);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true, profile: { ...member.profile } };
}

export function readLocalMessages(code: string): { messages: MessageView[] } {
  const room = requireLocalRoom(code);
  return { messages: room.messages.map((message) => ({ ...message, fromMe: message.authorId === room.meId })) };
}

export function postLocalMessage(code: string, body: { channel?: string; text?: string }): { ok: boolean; id: string } {
  const room = requireLocalRoom(code);
  const member = meMember(room);
  const text = String(body.text ?? '').trim();
  const channel = body.channel === 'to_santa' ? 'to_santa' : body.channel === 'to_recipient' ? 'to_recipient' : null;
  if (!text || !channel) throw apiError('invalid_input', 400, 'invalid_input');
  if (!room.drawRunId || !room.assignment[room.meId]) throw apiError('draw_required', 409, 'draw_required');

  const id = newId('msg');
  room.messages.push({
    id,
    channel,
    text,
    fromMe: true,
    createdAt: new Date().toISOString(),
    authorId: member.id,
  });
  appendActivity(room, 'room.message', { channel, id }, member.id);
  markDirty(room);
  upsertLocalRoom(room);
  return { ok: true, id };
}

export function readLocalActivity(code: string, limit = 20): { activity: ActivityView[] } {
  const room = requireLocalRoom(code);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  return { activity: room.activity.slice(0, safeLimit).map((event) => ({ ...event })) };
}

export function localAssignment(code: string): {
  drawn: boolean;
  recipient: { id: string; name: string; wishlist: string[]; profile: Record<string, string> } | null;
} {
  const room = requireLocalRoom(code);
  const recipientId = room.assignment[room.meId];
  if (!room.drawRunId || !recipientId) return { drawn: false, recipient: null };
  const recipient = room.members.find((member) => member.id === recipientId);
  if (!recipient) return { drawn: false, recipient: null };
  return {
    drawn: true,
    recipient: {
      id: recipient.id,
      name: recipient.name,
      wishlist: recipient.wishlist.map((item) => item.text),
      profile: { ...recipient.profile },
    },
  };
}

export function localRoomView(code: string): { room: RoomView; me: { id: string; name: string; role: string; giftStatus: string } } {
  const room = requireLocalRoom(code);
  const member = meMember(room);
  return {
    room: publicRoomView(room),
    me: { id: member.id, name: member.name, role: member.role, giftStatus: member.giftStatus },
  };
}

export function localInvite(code: string): { ok: boolean; inviteToken: string } {
  const room = requireLocalRoom(code);
  return { ok: true, inviteToken: localToken('invite', room.code, '') };
}

export function localSessions(code: string): {
  sessions: Array<{ id: string; createdAt: string; expiresAt: string; lastSeenAt: string | null; userAgent: string | null; revoked: boolean; current: boolean }>;
} {
  const room = requireLocalRoom(code);
  const token = roomToken(room.code) ?? '';
  const createdAt = new Date().toISOString();
  return {
    sessions: [{
      id: token,
      createdAt,
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      lastSeenAt: createdAt,
      userAgent: null,
      revoked: false,
      current: true,
    }],
  };
}

/** Bootstrap для локальной комнаты — call-site может использовать его, если серверный bootstrap недоступен. */
export function getLocalRoomBootstrap(code: string): {
  ok: boolean;
  room: RoomView;
  me: { id: string; name: string; role: string; giftStatus: string };
  assignment: ReturnType<typeof localAssignment>;
  messages: MessageView[];
} | null {
  try {
    const view = localRoomView(code);
    return {
      ok: true,
      room: view.room,
      me: view.me,
      assignment: localAssignment(code),
      messages: readLocalMessages(code).messages,
    };
  } catch {
    return null;
  }
}

export function dirtyRoomCodes(): string[] {
  return readLocalState().rooms.filter((room) => room.dirty).map((room) => room.code);
}

export function hasDirtyRooms(): boolean {
  return dirtyRoomCodes().length > 0;
}

export function markRoomsClean(): void {
  const state = readLocalState();
  if (!state.rooms.some((room) => room.dirty)) return;
  writeLocalState({ ...state, rooms: state.rooms.map((room) => ({ ...room, dirty: false })) });
}

export function readOutbox(): LocalOutboxEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_OUTBOX_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is LocalOutboxEntry => isRecord(item) && typeof item.path === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeOutbox(entries: LocalOutboxEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_OUTBOX_KEY, JSON.stringify(entries));
  } catch {
    // Игнорируем переполнение — локальная игра продолжает работать.
  }
}

export function appendOutbox(entry: Omit<LocalOutboxEntry, 'id' | 'createdAt'>): void {
  const record: LocalOutboxEntry = {
    ...entry,
    id: newId('out'),
    createdAt: new Date().toISOString(),
  };
  writeOutbox([...readOutbox(), record]);
}

export function clearOutbox(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(LOCAL_OUTBOX_KEY);
}
