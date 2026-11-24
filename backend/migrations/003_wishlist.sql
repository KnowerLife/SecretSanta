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
