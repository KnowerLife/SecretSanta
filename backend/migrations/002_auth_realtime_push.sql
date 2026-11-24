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
