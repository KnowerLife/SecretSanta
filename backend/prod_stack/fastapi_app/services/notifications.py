import json
import os
import smtplib
from email.message import EmailMessage
from sqlalchemy.orm import Session
from ..db.models import NotificationJob, PushSubscription
from ..core.config import settings

try:
    from pywebpush import webpush  # type: ignore
except Exception:  # pragma: no cover
    webpush = None


def send_email(to_email: str, subject: str, body: str):
    if not settings.smtp_host or not settings.smtp_from:
        return {"ok": False, "reason": "smtp_not_configured"}
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as s:
        s.starttls()
        if settings.smtp_user:
            s.login(settings.smtp_user, settings.smtp_password or "")
        s.send_message(msg)
    return {"ok": True}


def send_push(subscription: dict, payload: dict):
    if not (settings.vapid_public_key and settings.vapid_private_key):
        return {"ok": False, "reason": "vapid_not_configured"}
    if not webpush:
        return {"ok": False, "reason": "pywebpush_not_installed"}
    webpush(
        subscription_info=subscription,
        data=json.dumps(payload, ensure_ascii=False),
        vapid_private_key=settings.vapid_private_key,
        vapid_claims={"sub": settings.vapid_subject},
    )
    return {"ok": True}


def process_notification_job(db: Session, job: NotificationJob):
    payload = json.loads(job.payload_json or "{}")
    results = []
    if job.channel == "push":
        q = db.query(PushSubscription)
        if job.room_id:
            q = q.filter(PushSubscription.room_id == job.room_id)
        if job.member_id:
            q = q.filter(PushSubscription.member_id == job.member_id)
        for s in q.all():
            sub = {"endpoint": s.endpoint, "keys": {"p256dh": s.p256dh, "auth": s.auth}}
            try:
                results.append(send_push(sub, payload))
            except Exception as e:
                results.append({"ok": False, "error": str(e)})
        ok = any(r.get("ok") for r in results) if results else False
        job.status = "sent" if ok else "failed"
        job.last_error = None if ok else json.dumps(results, ensure_ascii=False)
    elif job.channel == "email":
        # expects payload.to + payload.subject/body; integrate user email lookup in service layer
        to = payload.get("to")
        if not to:
            job.status = "failed"; job.last_error = "missing_recipient"
        else:
            try:
                res = send_email(to, payload.get("subject") or "Secret Santa", payload.get("body") or "")
                job.status = "sent" if res.get("ok") else "failed"
                job.last_error = None if res.get("ok") else res.get("reason")
            except Exception as e:
                job.status = "failed"; job.last_error = str(e)
    else:
        job.status = "failed"; job.last_error = "unsupported_channel"
    return job
