#!/usr/bin/env python3
"""Process pending notification_jobs.
- push: sends via app.push.send_web_push (pywebpush+VAPID if configured)
- email: fallback hook (stdout/log placeholder). Integrate SMTP/provider in production.
Run periodically (cron/systemd timer) or as a long-running worker.
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import db_conn, json_loads, json_dumps
from app.push import send_web_push, vapid_public_config


def now_iso():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def process_once(limit=50):
    processed = 0
    with db_conn() as conn:
        jobs = conn.execute(
            "SELECT * FROM notification_jobs WHERE status='pending' AND (scheduled_at IS NULL OR scheduled_at <= ?) ORDER BY created_at LIMIT ?",
            (now_iso(), limit),
        ).fetchall()
        for job in jobs:
            processed += 1
            conn.execute("UPDATE notification_jobs SET status='processing', attempts=attempts+1, updated_at=? WHERE id=?", (now_iso(), job['id']))
            payload = json_loads(job['payload_json'], {}) or {}
            try:
                if job['channel'] == 'push':
                    subs = conn.execute('SELECT * FROM push_subscriptions WHERE room_id=?' + (' AND member_id=?' if job['member_id'] else ''), tuple([job['room_id']] + ([job['member_id']] if job['member_id'] else []))).fetchall()
                    results = []
                    for s in subs:
                        sub = {'endpoint': s['endpoint'], 'keys': {'p256dh': s['p256dh'], 'auth': s['auth']}}
                        results.append(send_web_push(sub, payload or {'title': 'Secret Santa', 'body': 'Напоминание'}))
                    ok = any(r.get('ok') for r in results) if results else False
                    status = 'sent' if ok else 'failed'
                    err = None if ok else json.dumps(results, ensure_ascii=False)
                    conn.execute("UPDATE notification_jobs SET status=?, last_error=?, run_at=?, updated_at=? WHERE id=?", (status, err, now_iso(), now_iso(), job['id']))
                elif job['channel'] == 'email':
                    # Email fallback hook: integrate SMTP/SendGrid/SES in production
                    print('[email-fallback]', job['id'], job['member_id'], json_dumps(payload))
                    conn.execute("UPDATE notification_jobs SET status='sent', run_at=?, updated_at=?, last_error=? WHERE id=?", (now_iso(), now_iso(), 'fallback_logged', job['id']))
                else:
                    conn.execute("UPDATE notification_jobs SET status='failed', last_error=?, updated_at=? WHERE id=?", ('unsupported_channel', now_iso(), job['id']))
            except Exception as e:
                conn.execute("UPDATE notification_jobs SET status='failed', last_error=?, updated_at=? WHERE id=?", (str(e), now_iso(), job['id']))
    return processed


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--once', action='store_true')
    ap.add_argument('--interval', type=int, default=30)
    ap.add_argument('--limit', type=int, default=50)
    args = ap.parse_args()
    print('vapid', vapid_public_config())
    while True:
        n = process_once(args.limit)
        if n:
            print('processed', n)
        if args.once:
            break
        time.sleep(args.interval)
