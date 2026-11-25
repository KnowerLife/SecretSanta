PRAGMA foreign_keys = ON;

ALTER TABLE room_members ADD COLUMN size TEXT;
ALTER TABLE room_members ADD COLUMN links TEXT;
ALTER TABLE room_members ADD COLUMN allergies TEXT;
