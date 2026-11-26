ALTER TABLE rooms ADD COLUMN demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE auth_sessions ADD COLUMN last_seen_at TEXT;

CREATE TABLE IF NOT EXISTS legacy_token_map (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  old_hash TEXT NOT NULL UNIQUE,
  room_id TEXT,
  member_id TEXT,
  session_id TEXT,
  new_token TEXT,
  created_at TEXT NOT NULL
);
