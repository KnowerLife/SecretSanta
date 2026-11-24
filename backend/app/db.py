import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BASE_DIR / 'data' / 'app.db'
MIGRATIONS_DIR = BASE_DIR / 'migrations'


def get_db_path() -> Path:
    p = os.environ.get('SECRET_SANTA_DB_PATH')
    return Path(p).expanduser().resolve() if p else DEFAULT_DB_PATH


def connect() -> sqlite3.Connection:
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))"
    )
    applied = {row['name'] for row in conn.execute('SELECT name FROM schema_migrations').fetchall()}
    for path in sorted(MIGRATIONS_DIR.glob('*.sql')):
        if path.name in applied:
            continue
        sql = path.read_text(encoding='utf-8')
        conn.executescript(sql)
        conn.execute('INSERT INTO schema_migrations(name) VALUES (?)', (path.name,))
    conn.commit()


@contextmanager
def db_conn():
    conn = connect()
    try:
        init_db(conn)
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row):
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}


def rows_to_dicts(rows):
    return [row_to_dict(r) for r in rows]


def json_dumps(data):
    return json.dumps(data, ensure_ascii=False, separators=(',', ':'))


def json_loads(value, default=None):
    if value is None:
        return default
    try:
        return json.loads(value)
    except Exception:
        return default
