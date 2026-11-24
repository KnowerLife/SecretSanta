"""Queue/worker scaffold for notification_jobs.
Supports RQ/Celery integration patterns; includes a simple polling runner as fallback.
"""
import json
import time
from datetime import datetime
from sqlalchemy.orm import Session
from ..db.session import SessionLocal
from ..db.models import NotificationJob, PushSubscription
from ..services.notifications import process_notification_job


def process_pending_jobs(limit: int = 50) -> int:
    db: Session = SessionLocal()
    n = 0
    try:
        jobs = db.query(NotificationJob).filter(NotificationJob.status == 'pending').order_by(NotificationJob.created_at.asc()).limit(limit).all()
        for job in jobs:
            job.status = 'processing'; job.attempts = (job.attempts or 0) + 1; job.updated_at = datetime.utcnow()
            db.commit(); db.refresh(job)
            try:
                process_notification_job(db, job)
                job.run_at = datetime.utcnow()
            except Exception as e:
                job.status = 'failed'; job.last_error = str(e)
            job.updated_at = datetime.utcnow()
            db.commit()
            n += 1
    finally:
        db.close()
    return n


# RQ example (if rq installed):
# from rq import Worker, Queue, Connection
# def enqueue_job(redis_conn, job_id): Queue('notifications', connection=redis_conn).enqueue(process_pending_jobs)

# Celery example (if celery installed):
# from celery import Celery
# celery = Celery('secretsanta', broker=settings.redis_url, backend=settings.redis_url)
# @celery.task
# def run_notifications_batch(): return process_pending_jobs()

if __name__ == '__main__':
    while True:
        processed = process_pending_jobs()
        if processed:
            print('processed', processed)
        time.sleep(30)
