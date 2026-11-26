/**
 * Schema snapshot used only by the v68 -> v69 migration tests.
 * The legacy backend is no longer part of this repository, so the fixture
 * is kept here to make the tests self-contained.
 */
export const V68_SCHEMA_SQL = `PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'classic',
  budget_min INTEGER NOT NULL DEFAULT 0,
  budget_max INTEGER NOT NULL DEFAULT 0,
  event_date TEXT,
  theme TEXT,
  organizer_user_id TEXT,
  organizer_member_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organizer_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS room_members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant',
  join_token_hash TEXT,
  gift_status TEXT NOT NULL DEFAULT 'none',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exclusions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  member_a_id TEXT NOT NULL,
  member_b_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(room_id, member_a_id, member_b_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_a_id) REFERENCES room_members(id) ON DELETE CASCADE,
  FOREIGN KEY (member_b_id) REFERENCES room_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS draw_runs (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  created_by_member_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  algorithm_version TEXT NOT NULL DEFAULT 'v1',
  meta_json TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_member_id) REFERENCES room_members(id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  draw_run_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  santa_member_id TEXT NOT NULL,
  recipient_member_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(draw_run_id, santa_member_id),
  FOREIGN KEY (draw_run_id) REFERENCES draw_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (santa_member_id) REFERENCES room_members(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_member_id) REFERENCES room_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  type TEXT NOT NULL,
  actor_member_id TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_member_id) REFERENCES room_members(id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  member_id TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES room_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_assignments_room_santa ON assignments(room_id, santa_member_id);
CREATE INDEX IF NOT EXISTS idx_room_events_room_created ON room_events(room_id, created_at);

PRAGMA foreign_keys = ON;

-- Invite/member access tokens for stronger identity binding
CREATE TABLE IF NOT EXISTS room_invites (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  role TEXT NOT NULL DEFAULT 'participant', -- participant|organizer
  created_by_member_id TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_member_id) REFERENCES room_members(id)
);

CREATE TABLE IF NOT EXISTS member_access_tokens (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES room_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY, -- jti
  room_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  user_id TEXT,
  token_type TEXT NOT NULL DEFAULT 'bearer',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  revoked_at TEXT,
  revoked_reason TEXT,
  last_seen_at TEXT,
  user_agent TEXT,
  ip_hint TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES room_members(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notification/reminder delivery tracking
CREATE TABLE IF NOT EXISTS notification_jobs (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  member_id TEXT,
  channel TEXT NOT NULL, -- push|email
  kind TEXT NOT NULL, -- reminder|draw|custom
  payload_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|sent|failed|cancelled
  scheduled_at TEXT,
  run_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES room_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_room_invites_room ON room_invites(room_id);
CREATE INDEX IF NOT EXISTS idx_member_access_tokens_member ON member_access_tokens(member_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_member ON auth_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_sched ON notification_jobs(status, scheduled_at);

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES room_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wishlist_room_member ON wishlist_items(room_id, member_id);

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  draw_run_id TEXT,
  from_member_id TEXT NOT NULL,
  to_member_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- to_recipient | to_santa
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (from_member_id) REFERENCES room_members(id) ON DELETE CASCADE,
  FOREIGN KEY (to_member_id) REFERENCES room_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_room_pair ON messages(room_id, from_member_id, to_member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_room_to ON messages(room_id, to_member_id, created_at);

PRAGMA foreign_keys = ON;

ALTER TABLE room_members ADD COLUMN address TEXT;
ALTER TABLE room_members ADD COLUMN profile_note TEXT;
ALTER TABLE room_members ADD COLUMN anti_wishlist TEXT;

PRAGMA foreign_keys = ON;

ALTER TABLE room_members ADD COLUMN size TEXT;
ALTER TABLE room_members ADD COLUMN links TEXT;
ALTER TABLE room_members ADD COLUMN allergies TEXT;
`;
