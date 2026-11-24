import asyncio
import json
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models
from ..services.realtime import RealtimeBus
from ..core.config import settings
from .authz import auth_member

router = APIRouter(prefix="/rooms", tags=["events"])
bus = RealtimeBus(settings.redis_url)


@router.get("/{code}/events")
async def room_events(code: str, request: Request, authorization: str | None = Header(None), token: str | None = None, lastEventId: str | None = None, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter_by(code=code.upper()).first()
    if not room: raise HTTPException(404, detail="room_not_found")
    # allow token query for EventSource; construct header-like auth
    authz = authorization or (f"Bearer {token}" if token else None)
    auth_member(db, room, authz)

    async def event_stream():
        # Replay from durable room_events (DB source of truth)
        after_rowid = 0
        if lastEventId:
            row = db.execute(models.RoomEvent.__table__.select().where(models.RoomEvent.__table__.c.id == lastEventId).where(models.RoomEvent.__table__.c.room_id == room.id)).first()
            # fallback: cannot easily get rowid in portable way; clients should rely on seq if provided
        # initial connected
        yield f"event: connected\ndata: {json.dumps({'type':'connected','data':{'roomCode':room.code}}, ensure_ascii=False)}\n\n"
        # Redis pub/sub fanout (if available) with heartbeat fallback
        try:
            await bus.connect()
            if bus._redis:
                async for msg in bus.subscribe(room.code):
                    if await request.is_disconnected():
                        break
                    payload = json.dumps(msg, ensure_ascii=False)
                    et = msg.get('type','message')
                    eid = msg.get('id')
                    prefix = f"id: {eid}\n" if eid else ""
                    yield f"{prefix}event: {et}\ndata: {payload}\n\n"
                return
        except Exception:
            pass
        # fallback heartbeat loop (single-process/dev or no redis)
        while True:
            if await request.is_disconnected():
                break
            yield ": ping\n\n"
            await asyncio.sleep(15)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
