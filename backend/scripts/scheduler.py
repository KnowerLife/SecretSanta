#!/usr/bin/env python3
"""Simple reminder scheduler (foundation): enqueues notification_jobs for upcoming room events.
Intended to run periodically (cron). Production: replace with robust scheduler/queue (Celery/RQ/BullMQ/Temporal).
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.auth import new_id
from app.db import db_conn, json_dumps


def now_iso():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def enqueue_room_reminders(days_before=(3, 1, 0)):
    created = 0
    today = time.strftime('%Y-%m-%d', time.gmtime())
    with db_conn() as conn:
        rooms = conn.execute("SELECT * FROM rooms WHERE status='active' AND event_date IS NOT NULL").fetchall()
        for r in rooms:
            # naive date diff (YYYY-MM-DD)
            try:
                y,m,d = map(int, r['event_date'].split('-'))
                ey,em,ed = map(int, today.split('-'))
                import datetime
                delta = (datetime.date(y,m,d) - datetime.date(ey,em,ed)).days
            except Exception:
                continue
            if delta not in days_before:
                continue
            members = conn.execute('SELECT id FROM room_members WHERE room_id=?', (r['id'],)).fetchall()
            for m in members:
                kind = f"event_d{delta}"
                exists = conn.execute("SELECT 1 FROM notification_jobs WHERE room_id=? AND member_id=? AND kind=? AND date(created_at)=date('now')", (r['id'], m['id'], kind)).fetchone()
                if exists:
                    continue
                payload = {'title': 'Тайный Санта', 'body': f"Напоминание: до события {delta} дн." if delta>0 else 'Сегодня день вручения подарков!'}
                conn.execute('INSERT INTO notification_jobs(id,room_id,member_id,channel,kind,payload_json,status,scheduled_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
                             (new_id('job'), r['id'], m['id'], 'push', kind, json_dumps(payload), 'pending', None, now_iso(), now_iso()))
                created += 1
    return created


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--once', action='store_true', default=True)
    args = ap.parse_args()
    n = enqueue_room_reminders()
    print('enqueued', n)
