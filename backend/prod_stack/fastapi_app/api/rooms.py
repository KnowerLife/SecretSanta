"""FastAPI routers scaffold mirroring foundation API contracts.
Implements key endpoints; extend with full validation/rate limiting/observability in production.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models
from ..core.security import hash_token, new_id, new_room_code, sign_token, verify_token
from ..services.draw import build_exclusion_set, derangement_draw, validate_draw

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _auth_member(db: Session, room: models.Room, authorization: str | None):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, detail="auth_required")
    payload = verify_token(authorization.split(" ", 1)[1].strip())
    if not payload or payload.get("room_id") != room.id:
        raise HTTPException(401, detail="invalid_token")
    sid = payload.get("sid")
    if sid:
        sess = db.get(models.AuthSession, sid)
        if not sess or sess.revoked_at or (sess.expires_at and sess.expires_at <= datetime.utcnow()) or sess.member_id != payload.get("member_id"):
            raise HTTPException(401, detail="session_invalid")
        sess.last_seen_at = datetime.utcnow()
    member = db.get(models.RoomMember, payload.get("member_id"))
    if not member or member.room_id != room.id:
        raise HTTPException(403, detail="forbidden")
    return member, payload


@router.post("")
def create_room(body: dict, request: Request, db: Session = Depends(get_db)):
    name = (body.get("name") or "").strip()
    organizer_name = (body.get("organizerName") or "").strip()
    if not name or not organizer_name:
        raise HTTPException(400, detail="name_and_organizer_required")
    code = None
    for _ in range(20):
        c = new_room_code()
        if not db.query(models.Room).filter_by(code=c).first():
            code = c; break
    if not code:
        raise HTTPException(500, detail="code_generation_failed")
    user = models.User(id=new_id("usr"), name=organizer_name)
    room = models.Room(id=new_id("room"), code=code, name=name, mode=body.get("mode") or "classic",
                       budget_min=int(body.get("budgetMin") or 0), budget_max=int(body.get("budgetMax") or 0),
                       event_date=body.get("eventDate"), theme=body.get("theme"), organizer_user_id=user.id)
    member = models.RoomMember(id=new_id("mem"), room_id=room.id, user_id=user.id, name_snapshot=organizer_name, role="organizer")
    room.organizer_member_id = member.id
    invite_secret = new_id("invite")
    invite = models.RoomInvite(id=new_id("rinv"), room_id=room.id, token_hash=hash_token(invite_secret), label="default", role="participant", created_by_member_id=member.id)
    sid = new_id("sess")
    session = models.AuthSession(id=sid, room_id=room.id, member_id=member.id, user_id=user.id, user_agent=request.headers.get("user-agent"))
    token = sign_token({"sid": sid, "room_id": room.id, "member_id": member.id, "user_id": user.id, "role": "organizer"})
    db.add_all([user, room, member, invite, session]); db.commit()
    return {"ok": True, "room": {"id": room.id, "code": code, "name": name, "mode": room.mode}, "member": {"id": member.id, "name": organizer_name, "role": "organizer"}, "token": token, "sessionId": sid, "inviteToken": invite_secret}


@router.post("/join")
def join_room(body: dict, request: Request, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    code = (body.get("code") or "").upper().strip()
    room = db.query(models.Room).filter_by(code=code).first()
    if not room:
        raise HTTPException(404, detail="room_not_found")
    name = (body.get("name") or "").strip()
    invite_token = (body.get("inviteToken") or "").strip()
    member_token = (body.get("memberToken") or "").strip()
    member = None; join_mode = None
    if member_token:
        mt = db.query(models.MemberAccessToken).filter_by(room_id=room.id, token_hash=hash_token(member_token)).first()
        if not mt or mt.revoked_at or (mt.expires_at and mt.expires_at <= datetime.utcnow()):
            raise HTTPException(401, detail="invalid_member_token")
        member = db.get(models.RoomMember, mt.member_id); mt.last_used_at = datetime.utcnow(); join_mode = "member_token"
    elif invite_token:
        inv = db.query(models.RoomInvite).filter_by(room_id=room.id, token_hash=hash_token(invite_token)).first()
        if not inv or inv.revoked_at or (inv.expires_at and inv.expires_at <= datetime.utcnow()):
            raise HTTPException(401, detail="invalid_invite")
        if inv.max_uses is not None and inv.use_count >= inv.max_uses:
            raise HTTPException(401, detail="invite_exhausted")
        if not name:
            raise HTTPException(400, detail="name_required")
        # bind to existing authenticated member if present
        payload = verify_token(authorization.split(" ", 1)[1].strip()) if authorization and authorization.lower().startswith("bearer ") else None
        if payload and payload.get("room_id") == room.id:
            member = db.get(models.RoomMember, payload.get("member_id"))
        if member:
            member.name_snapshot = name; join_mode = "invite_existing_member"
        else:
            user = models.User(id=new_id("usr"), name=name)
            member = models.RoomMember(id=new_id("mem"), room_id=room.id, user_id=user.id, name_snapshot=name, role=inv.role or "participant")
            db.add_all([user, member]); join_mode = "invite_new_member"
        inv.use_count += 1
    else:
        if not name:
            raise HTTPException(400, detail="name_required")
        member = db.query(models.RoomMember).filter(models.RoomMember.room_id==room.id).all()
        member = next((m for m in member if (m.name_snapshot or "").lower()==name.lower()), None)
        if member:
            member.name_snapshot = name; join_mode = "legacy_name"
        else:
            user = models.User(id=new_id("usr"), name=name)
            member = models.RoomMember(id=new_id("mem"), room_id=room.id, user_id=user.id, name_snapshot=name, role="participant")
            db.add_all([user, member]); join_mode = "legacy_new"
    db.flush()
    sid = new_id("sess")
    session = models.AuthSession(id=sid, room_id=room.id, member_id=member.id, user_id=member.user_id, user_agent=request.headers.get("user-agent"))
    member_secret = new_id("mkey")
    mat = models.MemberAccessToken(id=new_id("mtok"), room_id=room.id, member_id=member.id, token_hash=hash_token(member_secret), label="auto")
    token = sign_token({"sid": sid, "room_id": room.id, "member_id": member.id, "user_id": member.user_id, "role": member.role})
    db.add_all([session, mat]); db.commit()
    return {"ok": True, "room": {"id": room.id, "code": room.code, "name": room.name, "mode": room.mode}, "member": {"id": member.id, "name": member.name_snapshot, "role": member.role}, "token": token, "sessionId": sid, "memberToken": member_secret, "joinMode": join_mode}


@router.get("/{code}")
def get_room(code: str, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    members = db.query(models.RoomMember).filter_by(room_id=room.id).order_by(models.RoomMember.created_at).all()
    exclusions = db.query(models.Exclusion).filter_by(room_id=room.id).all()
    draw = db.query(models.DrawRun).filter_by(room_id=room.id).order_by(models.DrawRun.created_at.desc()).first()
    return {
        "room": {"id": room.id, "code": room.code, "name": room.name, "mode": room.mode, "budgetMin": room.budget_min, "budgetMax": room.budget_max, "eventDate": room.event_date, "theme": room.theme, "status": room.status},
        "me": {"id": member.id, "name": member.name_snapshot, "role": member.role, "giftStatus": member.gift_status},
        "members": [{"id": m.id, "name": m.name_snapshot, "role": m.role, "giftStatus": m.gift_status} for m in members],
        "exclusions": [{"id": e.id, "a": e.member_a_id, "b": e.member_b_id} for e in exclusions],
        "draw": ({"id": draw.id, "createdAt": draw.created_at.isoformat() if draw.created_at else None, "mode": draw.mode} if draw else None),
    }


@router.post("/{code}/draw")
def run_draw(code: str, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    if member.role != "organizer": raise HTTPException(403, detail="organizer_required")
    members = db.query(models.RoomMember).filter_by(room_id=room.id).all()
    ids = [m.id for m in members]
    if len(ids) < 2: raise HTTPException(400, detail="not_enough_members")
    ex_rows = db.query(models.Exclusion).filter_by(room_id=room.id).all()
    ex = build_exclusion_set([(e.member_a_id, e.member_b_id) for e in ex_rows])
    asn = derangement_draw(ids, ex)
    if not asn or not validate_draw(ids, asn, ex): raise HTTPException(409, detail="draw_failed_constraints")
    draw = models.DrawRun(id=new_id("draw"), room_id=room.id, mode=room.mode, created_by_member_id=member.id)
    db.add(draw); db.flush()
    for s, r in asn.items():
        db.add(models.Assignment(id=new_id("asn"), draw_run_id=draw.id, room_id=room.id, santa_member_id=s, recipient_member_id=r))
    db.add(models.RoomEvent(id=new_id("evt"), room_id=room.id, type="room.draw_completed", actor_member_id=member.id, payload_json='{"memberCount":%d}' % len(ids)))
    db.commit()
    return {"ok": True, "drawRunId": draw.id, "memberCount": len(ids)}


@router.get("/{code}/assignment")
def my_assignment(code: str, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    draw = db.query(models.DrawRun).filter_by(room_id=room.id).order_by(models.DrawRun.created_at.desc()).first()
    if not draw: return {"drawn": False, "assignment": None}
    asn = db.query(models.Assignment).filter_by(draw_run_id=draw.id, santa_member_id=member.id).first()
    if not asn: return {"drawn": False, "assignment": None}
    recv = db.get(models.RoomMember, asn.recipient_member_id)
    return {"drawn": True, "drawRunId": draw.id, "assignment": {"recipientMemberId": recv.id if recv else asn.recipient_member_id, "recipientName": recv.name_snapshot if recv else "Получатель"}}
