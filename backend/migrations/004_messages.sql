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
