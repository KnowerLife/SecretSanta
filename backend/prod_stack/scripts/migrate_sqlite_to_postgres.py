#!/usr/bin/env python3
"""Data migration helper: copy foundation SQLite data into Postgres (SQLAlchemy models).
Usage:
  DATABASE_URL=postgresql+psycopg2://... SQLITE_PATH=../../data/app.db PYTHONPATH=.. python3 migrate_sqlite_to_postgres.py
"""
import os
import sqlite3
from datetime import datetime
from fastapi_app.db.session import SessionLocal
from fastapi_app.db import models

SQLITE_PATH = os.environ.get('SQLITE_PATH', os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'app.db')))

def parse_dt(v):
    if v is None: return None
    if isinstance(v, datetime): return v
    for fmt in ('%Y-%m-%dT%H:%M:%SZ','%Y-%m-%d %H:%M:%S','%Y-%m-%d'):
        try: return datetime.strptime(str(v), fmt)
        except Exception: pass
    try: return datetime.fromisoformat(str(v).replace('Z','+00:00')).replace(tzinfo=None)
    except Exception: return None

TABLE_MAP = [
    ('users', models.User, ['id','email','name','created_at']),
    ('rooms', models.Room, ['id','code','name','mode','budget_min','budget_max','event_date','theme','organizer_user_id','organizer_member_id','status','created_at']),
    ('room_members', models.RoomMember, ['id','room_id','user_id','name_snapshot','role','gift_status','created_at']),
    ('exclusions', models.Exclusion, ['id','room_id','member_a_id','member_b_id','created_at']),
    ('draw_runs', models.DrawRun, ['id','room_id','mode','created_by_member_id','created_at','algorithm_version','meta_json']),
    ('assignments', models.Assignment, ['id','draw_run_id','room_id','santa_member_id','recipient_member_id','created_at']),
    ('room_events', models.RoomEvent, ['id','room_id','type','actor_member_id','payload_json','created_at']),
    ('auth_sessions', models.AuthSession, ['id','room_id','member_id','user_id','token_type','created_at','expires_at','revoked_at','revoked_reason','last_seen_at','user_agent','ip_hint']),
    ('room_invites', models.RoomInvite, ['id','room_id','token_hash','label','role','created_by_member_id','expires_at','revoked_at','max_uses','use_count','created_at']),
    ('member_access_tokens', models.MemberAccessToken, ['id','room_id','member_id','token_hash','label','created_at','last_used_at','expires_at','revoked_at']),
    ('push_subscriptions', models.PushSubscription, ['id','room_id','member_id','endpoint','p256dh','auth','user_agent','created_at']),
    ('notification_jobs', models.NotificationJob, ['id','room_id','member_id','channel','kind','payload_json','status','scheduled_at','run_at','attempts','last_error','created_at','updated_at']),
]
DT_FIELDS = {'created_at','updated_at','expires_at','revoked_at','last_seen_at','scheduled_at','run_at','last_used_at'}

def copy_table(src, db, table, model, cols):
    try: rows = src.execute(f'SELECT * FROM {table}').fetchall()
    except Exception: return 0
    src_cols = rows[0].keys() if rows else []
    count = 0
    for r in rows:
        data = {}
        for c in cols:
            if c not in src_cols: continue
            v = r[c]
            if c in DT_FIELDS: v = parse_dt(v)
            data[c] = v
        if not data.get('id') or db.get(model, data['id']): continue
        db.add(model(**data)); count += 1
    db.commit(); return count

def main():
    src = sqlite3.connect(SQLITE_PATH); src.row_factory = sqlite3.Row
    db = SessionLocal()
    try:
        total = 0
        for table, model, cols in TABLE_MAP:
            n = copy_table(src, db, table, model, cols); print(table, n); total += n
        print('migrated_rows', total)
    finally:
        db.close(); src.close()

if __name__ == '__main__':
    main()
