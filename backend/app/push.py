import json
import os
from typing import Dict, Optional


def vapid_public_config() -> Dict[str, Optional[str]]:
    return {
        'enabled': bool(os.environ.get('VAPID_PUBLIC_KEY') and os.environ.get('VAPID_PRIVATE_KEY')),
        'publicKey': os.environ.get('VAPID_PUBLIC_KEY'),
        'subject': os.environ.get('VAPID_SUBJECT', 'mailto:admin@example.com'),
    }


def send_web_push(subscription: dict, payload: dict) -> Dict[str, object]:
    """Send Web Push if pywebpush + VAPID are configured; otherwise return scaffold result."""
    config = vapid_public_config()
    if not config['enabled']:
        return {'ok': False, 'queued': False, 'reason': 'vapid_not_configured'}

    try:
        from pywebpush import webpush, WebPushException  # type: ignore
    except Exception:
        return {'ok': False, 'queued': False, 'reason': 'pywebpush_not_installed'}

    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=os.environ.get('VAPID_PRIVATE_KEY'),
            vapid_claims={"sub": config.get('subject') or 'mailto:admin@example.com'},
        )
        return {'ok': True, 'queued': False}
    except Exception as e:
        status = getattr(getattr(e, 'response', None), 'status_code', None)
        return {'ok': False, 'queued': False, 'reason': 'send_failed', 'status': status, 'error': str(e)}
