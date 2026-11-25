PRAGMA foreign_keys = ON;

ALTER TABLE room_members ADD COLUMN address TEXT;
ALTER TABLE room_members ADD COLUMN profile_note TEXT;
ALTER TABLE room_members ADD COLUMN anti_wishlist TEXT;
