PRAGMA foreign_keys = ON;

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
