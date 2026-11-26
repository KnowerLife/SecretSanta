import { z } from 'zod';

/** Публичные контракты API v69. Используются и клиентом, и сервером. */

export const roomThemeSchema = z.enum(['winter', 'midnight', 'cozy']);

export const createRoomSchema = z.object({
  name: z.string().min(1).max(120),
  organizerName: z.string().min(1).max(80),
  eventDate: z.string().min(1).max(40),
  budgetMin: z.number().int().min(0).default(0),
  budgetMax: z.number().int().min(0).default(0),
  memberNames: z.array(z.string().min(1).max(80)).max(100).optional(),
  theme: roomThemeSchema.default('winter'),
});

export const createDemoSchema = z.object({
  memberNames: z.array(z.string().min(1).max(80)).min(2).max(12).optional(),
});

export const memberSchema = z.object({
  name: z.string().min(1).max(80),
});

export const groupSchema = z.object({
  name: z.string().min(1).max(80),
  memberIds: z.array(z.string().min(1)).min(2).max(100),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({ p256dh: z.string(), auth: z.string() }).optional(),
  roomCode: z.string().min(4).max(32).optional(),
  memberId: z.string().optional(),
});

export const joinRoomSchema = z.object({
  code: z.string().min(4).max(32),
  name: z.string().min(1).max(80).optional(),
  inviteToken: z.string().optional(),
  memberToken: z.string().optional(),
});

export const drawSchema = z.object({
  exclusions: z.array(z.tuple([z.string(), z.string()])).optional(),
});

export const exclusionSchema = z.object({
  memberA: z.string().min(1),
  memberB: z.string().min(1),
  groupName: z.string().max(80).optional(),
});

export const wishlistSchema = z.object({
  text: z.string().min(1).max(500),
});

export const giftStatusSchema = z.object({
  status: z.enum(['none', 'idea', 'bought', 'done']),
});

export const profileSchema = z.object({
  address: z.string().max(300).optional(),
  note: z.string().max(800).optional(),
  antiWishlist: z.string().max(500).optional(),
  size: z.string().max(80).optional(),
  links: z.string().max(500).optional(),
  allergies: z.string().max(300).optional(),
});

export const messageSchema = z.object({
  channel: z.enum(['to_recipient', 'to_santa']),
  text: z.string().min(1).max(1000),
});

export const inviteSchema = z.object({
  role: z.enum(['participant', 'organizer']).default('participant'),
  label: z.string().max(120).optional(),
  maxUses: z.number().int().min(1).max(100).default(10),
  expiresAt: z.string().max(40).optional(),
});

export const notificationSchema = z.object({
  channel: z.enum(['push', 'email']).default('push'),
  kind: z.enum(['reminder', 'draw', 'message']).default('reminder'),
  payload: z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.string().max(40).optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type CreateDemoInput = z.infer<typeof createDemoSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type MemberInput = z.infer<typeof memberSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type RoomTheme = z.infer<typeof roomThemeSchema>;

/** Идентификатор, полученный из токена v68 через таблицу соответствий. */
export interface LegacyIdentity {
  kind: 'session' | 'invite' | 'member';
  roomId: string;
  memberId?: string;
  sessionId?: string;
}

export interface RoomMemberView {
  id: string;
  name: string;
  role: 'organizer' | 'participant';
  giftStatus: 'none' | 'idea' | 'bought' | 'done';
  wishlist: Array<{ id: string; text: string }>;
  profile: Record<string, string>;
}

export interface RoomView {
  code: string;
  name: string;
  eventDate: string | null;
  theme: RoomTheme;
  demo: boolean;
  budgetMin: number;
  budgetMax: number;
  status: string;
  members: RoomMemberView[];
  exclusions: Array<{ memberA: string; memberB: string; groupName: string | null }>;
  drawRunId: string | null;
  ready: { members: number; wishlists: number; gifts: number };
}

export interface AssignmentView {
  drawn: boolean;
  recipient: {
    id: string;
    name: string;
    wishlist: string[];
    profile: Record<string, string>;
  } | null;
}

export interface ActivityView {
  id: string;
  type: string;
  actor: string | null;
  actorName: string | null;
  payload: unknown;
  createdAt: string;
}

export interface SessionView {
  id: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string | null;
  userAgent: string | null;
  revoked: boolean;
  current: boolean;
}

export interface MessageView {
  id: string;
  channel: 'to_recipient' | 'to_santa';
  text: string;
  fromMe: boolean;
  createdAt: string;
  pending?: boolean;
}

export interface LocalMember extends RoomMemberView {
  token: string;
}

export interface LocalRoom extends RoomView {
  members: LocalMember[];
  meId: string;
  assignment: Record<string, string>;
  messages: Array<MessageView & { id: string; authorId: string }>;
  activity: ActivityView[];
  dirty: boolean;
}

/** Версионированное состояние локальной игры в localStorage. */
export interface LocalGameState {
  version: 1;
  rooms: LocalRoom[];
  updatedAt: string;
}
