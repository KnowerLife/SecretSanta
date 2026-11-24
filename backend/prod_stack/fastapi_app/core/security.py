import base64
import hashlib
import hmac
import json
import secrets
import time
from ..core.config import settings


def b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def b64url_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def sign_token(payload: dict) -> str:
    body = dict(payload)
    body.setdefault("iat", int(time.time()))
    body.setdefault("exp", int(time.time()) + settings.token_ttl_seconds)
    msg = b64url_encode(json.dumps(body, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    sig = hmac.new(settings.secret_key.encode("utf-8"), msg.encode("ascii"), hashlib.sha256).digest()
    return f"{msg}.{b64url_encode(sig)}"


def verify_token(token: str):
    try:
        msg, sig = token.split(".", 1)
        expected = hmac.new(settings.secret_key.encode("utf-8"), msg.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(b64url_encode(expected), sig):
            return None
        payload = json.loads(b64url_decode(msg).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"


def new_room_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "SANTA-" + "".join(secrets.choice(alphabet) for _ in range(4))
