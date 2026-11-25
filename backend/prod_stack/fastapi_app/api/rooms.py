"""FastAPI routers scaffold mirroring foundation API contracts.
Implements key endpoints; extend with full validation/rate limiting/observability in production.
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models
from ..core.config import settings
from ..core.security import hash_token, new_id, new_room_code, sign_token, verify_token
from ..services.draw import build_exclusion_set, derangement_draw, validate_draw
from ..services.realtime import publish_sync

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


def _emit_room_event(db: Session, room: models.Room, *, etype: str, actor_member_id: str | None, payload: dict | None = None) -> models.RoomEvent:
    evt = models.RoomEvent(
        id=new_id("evt"),
        room_id=room.id,
        type=etype,
        actor_member_id=actor_member_id,
        payload_json=json.dumps(payload or {}, ensure_ascii=False),
    )
    db.add(evt)
    return evt


def _publish_event(room: models.Room, evt: models.RoomEvent, payload: dict | None = None) -> None:
    data = dict(payload or {})
    data.setdefault("roomCode", room.code)
    data["eventDbId"] = evt.id
    msg = {"id": evt.id, "type": evt.type, "data": data, "ts": int(datetime.utcnow().timestamp() * 1000)}
    publish_sync(settings.redis_url, room.code, msg)


def _event_payload(evt: models.RoomEvent) -> dict:
    try:
        payload = json.loads(evt.payload_json) if evt.payload_json else {}
    except (TypeError, ValueError):
        payload = {}
    return payload if isinstance(payload, dict) else {"value": payload}


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
    db.add_all([user, room, member, invite, session])
    payload = {"roomCode": code, "name": name}
    evt = _emit_room_event(db, room, etype="room.created", actor_member_id=member.id, payload=payload)
    db.commit()
    _publish_event(room, evt, payload)
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
    db.add_all([session, mat])
    payload = {"memberId": member.id, "name": member.name_snapshot or name}
    evt = _emit_room_event(db, room, etype="room.member_joined", actor_member_id=member.id, payload=payload)
    db.commit()
    _publish_event(room, evt, payload)
    return {"ok": True, "room": {"id": room.id, "code": room.code, "name": room.name, "mode": room.mode}, "member": {"id": member.id, "name": member.name_snapshot, "role": member.role}, "token": token, "sessionId": sid, "memberToken": member_secret, "joinMode": join_mode}


@router.get("/{code}")
def get_room(code: str, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    members = db.query(models.RoomMember).filter_by(room_id=room.id).order_by(models.RoomMember.created_at).all()
    exclusions = db.query(models.Exclusion).filter_by(room_id=room.id).all()
    wish_rows = db.query(models.WishlistItem).filter_by(room_id=room.id).order_by(models.WishlistItem.created_at).all() if hasattr(models, 'WishlistItem') else []
    wishes_by_member = {}
    for w in wish_rows:
        wishes_by_member.setdefault(w.member_id, []).append({"id": w.id, "text": w.text, "createdAt": w.created_at.isoformat() if w.created_at else None})
    draw = db.query(models.DrawRun).filter_by(room_id=room.id).order_by(models.DrawRun.created_at.desc()).first()
    return {
        "room": {"id": room.id, "code": room.code, "name": room.name, "mode": room.mode, "budgetMin": room.budget_min, "budgetMax": room.budget_max, "eventDate": room.event_date, "theme": room.theme, "status": room.status},
        "me": {"id": member.id, "name": member.name_snapshot, "role": member.role, "giftStatus": member.gift_status, "address": member.address or "", "profileNote": member.profile_note or "", "antiWishlist": member.anti_wishlist or "", "size": member.size or "", "links": member.links or "", "allergies": member.allergies or "", "wishlist": wishes_by_member.get(member.id, [])},
        "members": [{"id": m.id, "name": m.name_snapshot, "role": m.role, "giftStatus": m.gift_status, "address": m.address or "", "profileNote": m.profile_note or "", "antiWishlist": m.anti_wishlist or "", "size": m.size or "", "links": m.links or "", "allergies": m.allergies or "", "wishlist": wishes_by_member.get(m.id, [])} for m in members],
        "exclusions": [{"id": e.id, "a": e.member_a_id, "b": e.member_b_id} for e in exclusions],
        "draw": ({"id": draw.id, "createdAt": draw.created_at.isoformat() if draw.created_at else None, "mode": draw.mode} if draw else None),
    }


@router.get("/{code}/activity")
def room_activity(code: str, authorization: str | None = Header(None), limit: int = Query(20), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    if member.role != "organizer": raise HTTPException(403, detail="organizer_required")
    limit = max(1, min(50, limit))
    names = {m.id: m.name_snapshot for m in db.query(models.RoomMember).filter_by(room_id=room.id).all()}
    rows = (
        db.query(models.RoomEvent)
        .filter_by(room_id=room.id)
        .order_by(models.RoomEvent.created_at.desc(), models.RoomEvent.id.desc())
        .limit(limit)
        .all()
    )
    events = []
    for evt in rows:
        payload = _event_payload(evt)
        actor_id = evt.actor_member_id or payload.get("memberId")
        events.append({
            "id": evt.id,
            "type": evt.type,
            "createdAt": evt.created_at.isoformat() if evt.created_at else None,
            "actorId": actor_id,
            "actorName": names.get(actor_id, ""),
            "payload": payload,
        })
    return {"ok": True, "events": events}


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
    payload = {"memberCount": len(ids)}
    evt = _emit_room_event(db, room, etype="room.draw_completed", actor_member_id=member.id, payload=payload)
    db.commit()
    _publish_event(room, evt, payload)
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
    return {
        "drawn": True,
        "drawRunId": draw.id,
        "assignment": {
            "recipientMemberId": recv.id if recv else asn.recipient_member_id,
            "recipientName": recv.name_snapshot if recv else "Получатель",
            "recipientAddress": (recv.address or "") if recv else "",
            "recipientProfileNote": (recv.profile_note or "") if recv else "",
            "recipientAntiWishlist": (recv.anti_wishlist or "") if recv else "",
            "recipientSize": (recv.size or "") if recv else "",
            "recipientLinks": (recv.links or "") if recv else "",
            "recipientAllergies": (recv.allergies or "") if recv else "",
        },
    }


@router.post("/{code}/draw/reset")
def reset_draw(code: str, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    if member.role != "organizer": raise HTTPException(403, detail="organizer_required")
    draw = db.query(models.DrawRun).filter_by(room_id=room.id).order_by(models.DrawRun.created_at.desc()).first()
    if draw:
        db.query(models.Message).filter_by(draw_run_id=draw.id).delete()
        db.query(models.Assignment).filter_by(draw_run_id=draw.id).delete()
        db.delete(draw)
    payload = {}
    evt = _emit_room_event(db, room, etype="room.draw_reset", actor_member_id=member.id, payload=payload)
    db.commit()
    _publish_event(room, evt, payload)
    return {"ok": True}


@router.post("/{code}/wishlist")
def add_wishlist(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    text = (body.get("text") or "").strip()
    if not text: raise HTTPException(400, detail="text_required")
    if len(text) > 500: raise HTTPException(400, detail="text_too_long")
    item = models.WishlistItem(id=new_id("wish"), room_id=room.id, member_id=member.id, text=text)
    db.add(item)
    payload = {"memberId": member.id}
    evt = _emit_room_event(db, room, etype="room.wishlist_updated", actor_member_id=member.id, payload=payload)
    db.commit()
    _publish_event(room, evt, payload)
    return {"ok": True, "item": {"id": item.id, "text": item.text}}


@router.delete("/{code}/wishlist/{item_id}")
def delete_wishlist(code: str, item_id: str, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    item = db.get(models.WishlistItem, item_id)
    if not item or item.room_id != room.id: raise HTTPException(404, detail="wishlist_item_not_found")
    if item.member_id != member.id and member.role != "organizer": raise HTTPException(403, detail="forbidden")
    db.delete(item)
    payload = {"memberId": item.member_id}
    evt = _emit_room_event(db, room, etype="room.wishlist_updated", actor_member_id=member.id, payload=payload)
    db.commit()
    _publish_event(room, evt, payload)
    return {"ok": True}


@router.post("/{code}/gift-status")
def set_gift_status(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    status = (body.get("status") or "").strip()
    if status not in ("none", "idea", "bought", "done"): raise HTTPException(400, detail="invalid_status")
    member.gift_status = status
    payload = {"memberId": member.id, "giftStatus": status}
    evt = _emit_room_event(db, room, etype="room.gift_status_updated", actor_member_id=member.id, payload=payload)
    db.commit()
    _publish_event(room, evt, payload)
    return {"ok": True, "status": status}


@router.post("/{code}/profile")
def update_profile(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    address = (body.get("address") or "").strip()
    profile_note = (body.get("profileNote") or body.get("profile_note") or "").strip()
    anti_wishlist = (body.get("antiWishlist") or body.get("anti_wishlist") or "").strip()
    size = (body.get("size") or "").strip()
    links = (body.get("links") or "").strip()
    allergies = (body.get("allergies") or "").strip()
    if len(address) > 300: raise HTTPException(400, detail="address_too_long")
    if len(profile_note) > 800: raise HTTPException(400, detail="profile_note_too_long")
    if len(anti_wishlist) > 800: raise HTTPException(400, detail="anti_wishlist_too_long")
    if len(size) > 80: raise HTTPException(400, detail="size_too_long")
    if len(links) > 500: raise HTTPException(400, detail="links_too_long")
    if len(allergies) > 500: raise HTTPException(400, detail="allergies_too_long")
    member.address = address
    member.profile_note = profile_note
    member.anti_wishlist = anti_wishlist
    member.size = size
    member.links = links
    member.allergies = allergies
    payload = {"memberId": member.id}
    evt = _emit_room_event(db, room, etype="room.profile_updated", actor_member_id=member.id, payload=payload)
    db.commit()
    _publish_event(room, evt, payload)
    return {"ok": True, "profile": {"address": address, "profileNote": profile_note, "antiWishlist": anti_wishlist, "size": size, "links": links, "allergies": allergies}}


@router.post("/{code}/exclusions")
def add_exclusion(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    if member.role != "organizer": raise HTTPException(403, detail="organizer_required")
    a, b = body.get("a"), body.get("b")
    ids = {m.id for m in db.query(models.RoomMember).filter_by(room_id=room.id).all()}
    if not a or not b or a not in ids or b not in ids: raise HTTPException(400, detail="unknown_member")
    x, y = sorted([a, b])
    exists = db.query(models.Exclusion).filter_by(room_id=room.id, member_a_id=x, member_b_id=y).first()
    if not exists:
        db.add(models.Exclusion(id=new_id("ex"), room_id=room.id, member_a_id=x, member_b_id=y))
        payload = {"a": x, "b": y}
        group_name = (body.get("groupName") or "").strip()
        if group_name:
            payload["groupName"] = group_name
        evt = _emit_room_event(db, room, etype="room.exclusion_added", actor_member_id=member.id, payload=payload)
        db.commit()
        _publish_event(room, evt, payload)
    return {"ok": True}


@router.delete("/{code}/exclusions/{a}/{b}")
def delete_exclusion(code: str, a: str, b: str, authorization: str | None = Header(None), group_name: str | None = Query(None, alias="groupName"), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    if member.role != "organizer": raise HTTPException(403, detail="organizer_required")
    if db.query(models.DrawRun).filter_by(room_id=room.id).first(): raise HTTPException(409, detail="draw_already_run")
    x, y = sorted([a, b])
    db.query(models.Exclusion).filter_by(room_id=room.id, member_a_id=x, member_b_id=y).delete(synchronize_session=False)
    payload = {"a": x, "b": y}
    if group_name and group_name.strip():
        payload["groupName"] = group_name.strip()
    evt = _emit_room_event(db, room, etype="room.exclusion_removed", actor_member_id=member.id, payload=payload)
    db.commit()
    _publish_event(room, evt, payload)
    return {"ok": True}


def _resolve_message_peer(db: Session, room: models.Room, member: models.RoomMember, channel: str):
    draw = db.query(models.DrawRun).filter_by(room_id=room.id).order_by(models.DrawRun.created_at.desc()).first()
    if not draw:
        raise HTTPException(409, detail="draw_required")
    channel = channel if channel in ("to_recipient", "to_santa") else "to_recipient"
    if channel == "to_recipient":
        asn = db.query(models.Assignment).filter_by(draw_run_id=draw.id, santa_member_id=member.id).first()
        if not asn:
            raise HTTPException(404, detail="assignment_not_found")
        peer_id = asn.recipient_member_id
    else:
        asn = db.query(models.Assignment).filter_by(draw_run_id=draw.id, recipient_member_id=member.id).first()
        if not asn:
            raise HTTPException(404, detail="assignment_not_found")
        peer_id = asn.santa_member_id
    peer = db.get(models.RoomMember, peer_id)
    if not peer or peer.room_id != room.id:
        raise HTTPException(404, detail="peer_not_found")
    return draw, peer, channel


@router.get("/{code}/messages")
def get_messages(code: str, channel: str = Query("to_recipient"), authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    draw, peer, channel = _resolve_message_peer(db, room, member, channel)
    rows = (
        db.query(models.Message)
        .filter(
            models.Message.room_id == room.id,
            models.Message.draw_run_id == draw.id,
            ((models.Message.from_member_id == member.id) & (models.Message.to_member_id == peer.id)) |
            ((models.Message.from_member_id == peer.id) & (models.Message.to_member_id == member.id)),
        )
        .order_by(models.Message.created_at.asc(), models.Message.id.asc())
        .limit(200)
        .all()
    )
    msgs = [{"id": r.id, "fromMe": r.from_member_id == member.id, "text": r.text, "createdAt": r.created_at.isoformat() if r.created_at else None, "channel": r.channel} for r in rows]
    return {"ok": True, "channel": channel, "messages": msgs}


@router.post("/{code}/messages")
def send_message(code: str, body: dict, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    member, _ = _auth_member(db, room, authorization)
    text = (body.get("text") or "").strip()
    channel = (body.get("channel") or "to_recipient").strip()
    if not text: raise HTTPException(400, detail="text_required")
    if len(text) > 1000: raise HTTPException(400, detail="text_too_long")
    draw, peer, channel = _resolve_message_peer(db, room, member, channel)
    msg = models.Message(id=new_id("msg"), room_id=room.id, draw_run_id=draw.id, from_member_id=member.id, to_member_id=peer.id, channel=channel, text=text)
    db.add(msg)
    payload = {"messageId": msg.id, "toMemberId": peer.id}
    evt = _emit_room_event(db, room, etype="room.message", actor_member_id=member.id, payload=payload)
    db.commit()
    db.refresh(msg)
    _publish_event(room, evt, payload)
    return {"ok": True, "message": {"id": msg.id, "fromMe": True, "text": msg.text, "createdAt": msg.created_at.isoformat() if msg.created_at else None, "channel": msg.channel}}
