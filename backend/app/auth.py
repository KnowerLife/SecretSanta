import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Optional

SECRET = os.environ.get('SECRET_SANTA_SECRET', 'dev-insecure-change-me')
TOKEN_TTL_SECONDS = int(os.environ.get('SECRET_SANTA_TOKEN_TTL', '604800'))  # 7 days


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b'=').decode('ascii')


def _b64url_decode(data: str) -> bytes:
    pad = '=' * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def sign_token(payload: dict) -> str:
    body = dict(payload)
    body.setdefault('iat', int(time.time()))
    body.setdefault('exp', int(time.time()) + TOKEN_TTL_SECONDS)
    raw = json.dumps(body, separators=(',', ':'), sort_keys=True).encode('utf-8')
    msg = _b64url_encode(raw)
    sig = hmac.new(SECRET.encode('utf-8'), msg.encode('ascii'), hashlib.sha256).digest()
    return f'{msg}.{_b64url_encode(sig)}'


def verify_token(token: str) -> Optional[dict]:
    try:
        msg, sig = token.split('.', 1)
        expected = hmac.new(SECRET.encode('utf-8'), msg.encode('ascii'), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url_encode(expected), sig):
            return None
        payload = json.loads(_b64url_decode(msg).decode('utf-8'))
        if int(payload.get('exp', 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def parse_bearer(header_value: Optional[str]) -> Optional[str]:
    if not header_value:
        return None
    parts = header_value.split(' ', 1)
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    return parts[1].strip() or None


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"


def new_room_code() -> str:
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return 'SANTA-' + ''.join(secrets.choice(alphabet) for _ in range(4))
