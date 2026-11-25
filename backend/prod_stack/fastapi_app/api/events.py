import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..core.config import settings
from ..db import models
from ..db.session import get_db
from ..services.realtime import RealtimeBus
from .authz import auth_member

router = APIRouter(prefix="/rooms", tags=["events"])
bus = RealtimeBus(settings.redis_url)


def _event_payload(evt: models.RoomEvent, room_code: str):
    try:
        payload = json.loads(evt.payload_json) if evt.payload_json else {}
    except Exception:
        payload = {}
    if not isinstance(payload, dict):
        payload = {"value": payload}
    payload.setdefault("roomCode", room_code)
    payload["eventDbId"] = evt.id
    return payload


@router.get("/{code}/events")
async def room_events(
    code: str,
    request: Request,
    authorization: str | None = Header(None),
    token: str | None = None,
    lastEventId: str | None = None,
    db: Session = Depends(get_db),
):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room:
        raise HTTPException(404, detail="room_not_found")
    authz = authorization or (f"Bearer {token}" if token else None)
    auth_member(db, room, authz)

    replay = []
    if lastEventId:
        last = db.query(models.RoomEvent).filter_by(id=lastEventId, room_id=room.id).first()
        if last:
            replay = (
                db.query(models.RoomEvent)
                .filter(models.RoomEvent.room_id == room.id)
                .filter(
                    (models.RoomEvent.created_at > last.created_at)
                    | ((models.RoomEvent.created_at == last.created_at) & (models.RoomEvent.id > last.id))
                )
                .order_by(models.RoomEvent.created_at.asc(), models.RoomEvent.id.asc())
                .limit(200)
                .all()
            )

    async def event_stream():
        yield f"event: connected\ndata: {json.dumps({'type':'connected','data':{'roomCode':room.code}}, ensure_ascii=False)}\n\n"
        for evt in replay:
            payload = _event_payload(evt, room.code)
            msg = {"type": evt.type, "data": payload, "ts": int((evt.created_at or datetime.utcnow()).timestamp() * 1000)}
            yield f"id: {evt.id}\nevent: {evt.type}\ndata: {json.dumps(msg, ensure_ascii=False)}\n\n"
        try:
            await bus.connect()
            if bus._redis:
                async for msg in bus.subscribe(room.code):
                    if await request.is_disconnected():
                        break
                    payload = json.dumps(msg, ensure_ascii=False)
                    et = msg.get("type", "message")
                    eid = msg.get("id")
                    prefix = f"id: {eid}\n" if eid else ""
                    yield f"{prefix}event: {et}\ndata: {payload}\n\n"
                return
        except Exception:
            pass
        while True:
            if await request.is_disconnected():
                break
            yield ": ping\n\n"
            await asyncio.sleep(15)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
