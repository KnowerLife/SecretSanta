import json
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models
from ..core.config import settings
from ..core.security import hash_token, new_id, sign_token
from ..services.realtime import publish_sync
from .authz import auth_member

router = APIRouter(prefix="/rooms", tags=["access"])


@router.post("/{code}/invites")
def create_invite(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = auth_member(db, room, authorization)
    if member.role != "organizer": raise HTTPException(403, detail="organizer_required")
    secret = new_id("invite")
    inv = models.RoomInvite(id=new_id("rinv"), room_id=room.id, token_hash=hash_token(secret), label=body.get("label"), role=(body.get("role") or "participant"), created_by_member_id=member.id, max_uses=body.get("maxUses"))
    db.add(inv); db.commit()
    return {"ok": True, "invite": {"id": inv.id, "role": inv.role, "token": secret}}


@router.post("/{code}/member-tokens")
def create_member_token(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = auth_member(db, room, authorization)
    target_member_id = body.get("memberId") or member.id
    if target_member_id != member.id and member.role != "organizer":
        raise HTTPException(403, detail="forbidden")
    target = db.get(models.RoomMember, target_member_id)
    if not target or target.room_id != room.id:
        raise HTTPException(404, detail="member_not_found")
    secret = new_id("mkey")
    tok = models.MemberAccessToken(id=new_id("mtok"), room_id=room.id, member_id=target.id, token_hash=hash_token(secret), label=body.get("label") or "manual")
    db.add(tok); db.commit()
    return {"ok": True, "memberToken": {"id": tok.id, "memberId": target.id, "token": secret}}


@router.get("/{code}/sessions")
def list_sessions(code: str, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = auth_member(db, room, authorization)
    rows = db.query(models.AuthSession).filter_by(room_id=room.id, member_id=member.id).order_by(models.AuthSession.created_at.desc()).all()
    return {"ok": True, "sessions": [{"id": s.id, "created_at": s.created_at.isoformat() if s.created_at else None, "expires_at": s.expires_at.isoformat() if s.expires_at else None, "revoked_at": s.revoked_at.isoformat() if s.revoked_at else None, "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None, "user_agent": s.user_agent} for s in rows]}


@router.post("/{code}/sessions/revoke")
def revoke_sessions(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, payload = auth_member(db, room, authorization)
    now = datetime.utcnow()
    sid = body.get("sessionId")
    all_for = bool(body.get("allForMember")) or body.get("scope") == "all"
    if sid:
        sess = db.get(models.AuthSession, sid)
        if not sess or sess.room_id != room.id: raise HTTPException(404, detail="session_not_found")
        if sess.member_id != member.id and member.role != "organizer": raise HTTPException(403, detail="forbidden")
        sess.revoked_at = now; sess.revoked_reason = body.get("reason") or "revoked"
    elif all_for:
        target_member_id = body.get("memberId") or member.id
        if target_member_id != member.id and member.role != "organizer": raise HTTPException(403, detail="forbidden")
        q = db.query(models.AuthSession).filter_by(room_id=room.id, member_id=target_member_id).filter(models.AuthSession.revoked_at.is_(None))
        for s in q.all(): s.revoked_at = now; s.revoked_reason = body.get("reason") or "revoked_all"
    else:
        cur = payload.get("sid")
        if not cur: raise HTTPException(400, detail="session_not_identified")
        sess = db.get(models.AuthSession, cur)
        if sess: sess.revoked_at = now; sess.revoked_reason = body.get("reason") or "logout"
    db.commit()
    return {"ok": True}


@router.post("/{code}/exclusions")
def add_exclusion(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = auth_member(db, room, authorization)
    if member.role != "organizer": raise HTTPException(403, detail="organizer_required")
    a = body.get("a"); b = body.get("b")
    if not a or not b or a == b: raise HTTPException(400, detail="invalid_exclusion")
    ids = {m.id for m in db.query(models.RoomMember).filter_by(room_id=room.id).all()}
    if a not in ids or b not in ids: raise HTTPException(400, detail="unknown_member")
    x,y = sorted([a,b])
    exists = db.query(models.Exclusion).filter_by(room_id=room.id, member_a_id=x, member_b_id=y).first()
    if not exists:
        db.add(models.Exclusion(id=new_id("ex"), room_id=room.id, member_a_id=x, member_b_id=y))
        payload = {}
        evt = models.RoomEvent(id=new_id("evt"), room_id=room.id, type="room.exclusion_added", actor_member_id=member.id, payload_json=json.dumps(payload))
        db.add(evt)
        db.commit()
        data = {"roomCode": room.code, "eventDbId": evt.id}
        publish_sync(settings.redis_url, room.code, {"id": evt.id, "type": evt.type, "data": data, "ts": int(datetime.utcnow().timestamp() * 1000)})
    return {"ok": True}
