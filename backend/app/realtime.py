import json
import queue
import threading
import time
from collections import defaultdict
from typing import Dict, List, Optional


class RoomEventBus:
    """In-memory pub/sub for SSE. Suitable for single-process dev foundation.
    For production scaling, replace/augment with Redis pub/sub or Kafka/NATS while
    keeping room_events as the durable source of truth for offsets/replay.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._subs: Dict[str, List[queue.Queue]] = defaultdict(list)

    def subscribe(self, room_code: str) -> queue.Queue:
        q = queue.Queue(maxsize=200)
        with self._lock:
            self._subs[room_code].append(q)
        return q

    def unsubscribe(self, room_code: str, q: queue.Queue) -> None:
        with self._lock:
            arr = self._subs.get(room_code, [])
            self._subs[room_code] = [x for x in arr if x is not q]
            if not self._subs[room_code]:
                self._subs.pop(room_code, None)

    def publish(self, room_code: str, event_type: str, data: dict, event_id: Optional[str] = None) -> None:
        payload = {
            'id': event_id,
            'type': event_type,
            'data': data,
            'ts': int(time.time() * 1000),
        }
        with self._lock:
            subs = list(self._subs.get(room_code, []))
        for q in subs:
            try:
                q.put_nowait(payload)
            except queue.Full:
                try:
                    q.get_nowait()
                except Exception:
                    pass
                try:
                    q.put_nowait(payload)
                except Exception:
                    pass


bus = RoomEventBus()


def format_sse(event: dict) -> str:
    body = json.dumps(event, ensure_ascii=False, separators=(',', ':'))
    lines = []
    if event.get('id'):
        lines.append(f"id: {event['id']}")
    lines.append(f"event: {event.get('type','message')}")
    lines.append(f"data: {body}")
    return "\n".join(lines) + "\n\n"
