from datetime import datetime
from fastapi import Header, HTTPException
from sqlalchemy.orm import Session
from ..core.security import verify_token
from ..db import models


def auth_member(db: Session, room: models.Room, authorization: str | None):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, detail="auth_required")
    token = authorization.split(" ", 1)[1].strip()
    payload = verify_token(token)
    if not payload or payload.get("room_id") != room.id:
        raise HTTPException(401, detail="invalid_token")
    sid = payload.get("sid")
    if sid:
        sess = db.get(models.AuthSession, sid)
        if not sess or sess.room_id != room.id or sess.member_id != payload.get("member_id"):
            raise HTTPException(401, detail="session_invalid")
        if sess.revoked_at:
            raise HTTPException(401, detail="session_revoked")
        if sess.expires_at and sess.expires_at <= datetime.utcnow():
            raise HTTPException(401, detail="session_expired")
        sess.last_seen_at = datetime.utcnow()
    member = db.get(models.RoomMember, payload.get("member_id"))
    if not member or member.room_id != room.id:
        raise HTTPException(403, detail="forbidden")
    return member, payload
