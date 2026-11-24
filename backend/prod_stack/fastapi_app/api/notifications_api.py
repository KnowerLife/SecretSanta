import json
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models
from ..core.security import new_id
from ..core.config import settings
from ..services.notifications import send_push
from .authz import auth_member

router = APIRouter(tags=["push"])


@router.get("/push/config")
def push_config():
    return {"enabled": bool(settings.vapid_public_key and settings.vapid_private_key), "publicKey": settings.vapid_public_key, "subject": settings.vapid_subject}


@router.post("/push/subscribe")
def push_subscribe(body: dict, db: Session = Depends(get_db)):
    sub = body.get("subscription") or {}
    endpoint = sub.get("endpoint")
    keys = sub.get("keys") or {}
    if not endpoint:
        raise HTTPException(400, detail="endpoint_required")
    room_id = None
    code = (body.get("roomCode") or "").upper() or None
    if code:
        room = db.query(models.Room).filter_by(code=code).first()
        room_id = room.id if room else None
    db.query(models.PushSubscription).filter_by(endpoint=endpoint).delete()
    db.add(models.PushSubscription(id=new_id("push"), room_id=room_id, member_id=body.get("memberId"), endpoint=endpoint, p256dh=keys.get("p256dh"), auth=keys.get("auth")))
    db.commit()
    return {"ok": True, "stored": True, "vapid": push_config()}


@router.post("/push/unsubscribe")
def push_unsubscribe(body: dict, db: Session = Depends(get_db)):
    endpoint = body.get("endpoint") or (body.get("subscription") or {}).get("endpoint")
    if not endpoint:
        raise HTTPException(400, detail="endpoint_required")
    db.query(models.PushSubscription).filter_by(endpoint=endpoint).delete()
    db.commit()
    return {"ok": True}


@router.post("/rooms/{code}/push/test")
def push_test(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = auth_member(db, room, authorization)
    subs = db.query(models.PushSubscription).filter((models.PushSubscription.room_id==room.id) | (models.PushSubscription.member_id==member.id)).all()
    results = []
    for s in subs:
        sub = {"endpoint": s.endpoint, "keys": {"p256dh": s.p256dh, "auth": s.auth}}
        try:
            results.append(send_push(sub, {"title": "Secret Santa", "body": body.get("message") or "Тест уведомления", "url": "/#dashboard"}))
        except Exception as e:
            results.append({"ok": False, "error": str(e)})
    return {"ok": True, "count": len(results), "results": results, "vapid": push_config()}


@router.post("/rooms/{code}/notifications")
def enqueue_notification(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = auth_member(db, room, authorization)
    target_member_id = body.get("memberId")
    if member.role != "organizer" and target_member_id not in (None, member.id):
        raise HTTPException(403, detail="forbidden")
    job = models.NotificationJob(id=new_id("job"), room_id=room.id, member_id=target_member_id, channel=body.get("channel") or "push", kind=body.get("kind") or "custom", payload_json=json.dumps(body.get("payload") or {}, ensure_ascii=False), status="pending")
    db.add(job); db.commit()
    return {"ok": True, "jobId": job.id, "status": "pending"}
