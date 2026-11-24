import json
from typing import AsyncIterator, Optional

# Redis pub/sub abstraction for horizontal scaling.
# Durable replay source of truth remains room_events in DB.

try:
    import redis.asyncio as redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None


class RealtimeBus:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._redis = None

    async def connect(self):
        if redis and self._redis is None:
            self._redis = redis.from_url(self.redis_url, decode_responses=True)
        return self

    async def publish(self, room_code: str, event: dict):
        if not self._redis:
            return
        await self._redis.publish(f"room:{room_code}", json.dumps(event, ensure_ascii=False))

    async def subscribe(self, room_code: str) -> AsyncIterator[dict]:
        if not self._redis:
            if False:
                yield {}
            return
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(f"room:{room_code}")
        try:
            async for msg in pubsub.listen():
                if msg.get("type") != "message":
                    continue
                try:
                    yield json.loads(msg.get("data") or "{}")
                except Exception:
                    continue
        finally:
            try:
                await pubsub.unsubscribe(f"room:{room_code}")
                await pubsub.close()
            except Exception:
                pass
