import argparse
import json
import os
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .auth import hash_token, new_id, new_room_code, parse_bearer, sign_token, verify_token
from .db import db_conn, json_dumps, json_loads, row_to_dict, rows_to_dicts
from .draw import build_exclusion_set, derangement_draw, validate_draw
from .push import send_web_push, vapid_public_config
from .realtime import bus, format_sse

ALLOW_ORIGIN = os.environ.get('SECRET_SANTA_ALLOW_ORIGIN', '*')


class ApiError(Exception):
    def __init__(self, status, message, details=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.details = details


def now_iso():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def get_room_by_code(conn, code):
    return conn.execute('SELECT * FROM rooms WHERE code = ?', (code.upper(),)).fetchone()


def get_member(conn, room_id, member_id):
    return conn.execute('SELECT * FROM room_members WHERE id = ? AND room_id = ?', (member_id, room_id)).fetchone()


def require_auth_room_member(conn, handler, room_row):
    token = parse_bearer(handler.headers.get('Authorization'))
    payload = verify_token(token) if token else None
    if not payload:
        raise ApiError(HTTPStatus.UNAUTHORIZED, 'auth_required')
    if payload.get('room_id') != room_row['id']:
        raise ApiError(HTTPStatus.FORBIDDEN, 'forbidden')

    sid = payload.get('sid')
    if sid:
        sess = conn.execute('SELECT * FROM auth_sessions WHERE id=?', (sid,)).fetchone()
        if not sess or sess['room_id'] != room_row['id'] or sess['member_id'] != payload.get('member_id'):
            raise ApiError(HTTPStatus.UNAUTHORIZED, 'session_invalid')
        if sess['revoked_at']:
            raise ApiError(HTTPStatus.UNAUTHORIZED, 'session_revoked')
        if sess['expires_at'] and sess['expires_at'] <= now_iso():
            raise ApiError(HTTPStatus.UNAUTHORIZED, 'session_expired')
        conn.execute('UPDATE auth_sessions SET last_seen_at=? WHERE id=?', (now_iso(), sid))

    member = get_member(conn, room_row['id'], payload.get('member_id'))
    if not member:
        raise ApiError(HTTPStatus.FORBIDDEN, 'forbidden')
    return member, payload


def emit_room_event(conn, room, event_type, actor_member_id=None, payload=None):
    event_id = new_id('evt')
    conn.execute(
        'INSERT INTO room_events(id, room_id, type, actor_member_id, payload_json, created_at) VALUES (?,?,?,?,?,?)',
        (event_id, room['id'], event_type, actor_member_id, json_dumps(payload or {}), now_iso()),
    )
    row = conn.execute('SELECT rowid, * FROM room_events WHERE id=?', (event_id,)).fetchone()
    data = {'roomCode': room['code'], **(payload or {}), 'eventDbId': event_id}
    if row:
        data['seq'] = row['rowid']
    bus.publish(room['code'], event_type, data, event_id=event_id)
    return event_id


def safe_member_row(row):
    d = row_to_dict(row)
    return {
        'id': d['id'],
        'name': d['name_snapshot'],
        'role': d['role'],
        'giftStatus': d.get('gift_status') or 'none',
        'joinedAt': d.get('created_at'),
    }


def latest_draw(conn, room_id):
    return conn.execute('SELECT * FROM draw_runs WHERE room_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1', (room_id,)).fetchone()


def get_my_assignment(conn, room_id, member_id):
    draw = latest_draw(conn, room_id)
    if not draw:
        return None, None
    asn = conn.execute(
        'SELECT a.*, rm.name_snapshot AS recipient_name FROM assignments a JOIN room_members rm ON rm.id = a.recipient_member_id WHERE a.draw_run_id = ? AND a.santa_member_id = ?',
        (draw['id'], member_id),
    ).fetchone()
    return draw, asn


def create_session(conn, room_id, member_id, user_id, role, user_agent=None, ip_hint=None):
    sid = new_id('sess')
    # token TTL aligned with auth.sign_token; we store expires_at for revocation checks
    expires_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + int(os.environ.get('SECRET_SANTA_TOKEN_TTL', '604800'))))
    conn.execute(
        'INSERT INTO auth_sessions(id, room_id, member_id, user_id, token_type, created_at, expires_at, last_seen_at, user_agent, ip_hint) VALUES (?,?,?,?,?,?,?,?,?,?)',
        (sid, room_id, member_id, user_id, 'bearer', now_iso(), expires_at, now_iso(), user_agent, ip_hint)
    )
    token = sign_token({'sid': sid, 'room_id': room_id, 'member_id': member_id, 'user_id': user_id, 'role': role})
    return sid, token


class Handler(BaseHTTPRequestHandler):
    server_version = 'SecretSantaBackend/0.2'

    def _send_cors(self):
        self.send_header('Access-Control-Allow-Origin', ALLOW_ORIGIN)
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Last-Event-ID')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        self.send_header('Access-Control-Max-Age', '86400')

    def _send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self._send_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get('Content-Length') or '0')
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        try:
            return json.loads(raw.decode('utf-8'))
        except Exception:
            raise ApiError(HTTPStatus.BAD_REQUEST, 'invalid_json')

    def _route(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/') or '/'
        query = parse_qs(parsed.query)
        return path, query

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        try:
            path, query = self._route()
            if path == '/api/health':
                return self._send_json(200, {'ok': True, 'time': now_iso(), 'push': vapid_public_config(), 'version': '0.2'})
            if path == '/api/push/config':
                return self._send_json(200, vapid_public_config())

            parts = [p for p in path.split('/') if p]
            if len(parts) == 3 and parts[0] == 'api' and parts[1] == 'rooms':
                code = parts[2].upper()
                with db_conn() as conn:
                    room = get_room_by_code(conn, code)
                    if not room:
                        raise ApiError(404, 'room_not_found')
                    member, _ = require_auth_room_member(conn, self, room)
                    members = conn.execute('SELECT * FROM room_members WHERE room_id = ? ORDER BY created_at, rowid', (room['id'],)).fetchall()
                    exclusions = conn.execute('SELECT * FROM exclusions WHERE room_id = ?', (room['id'],)).fetchall()
                    wish_rows = conn.execute('SELECT id, member_id, text, created_at FROM wishlist_items WHERE room_id = ? ORDER BY created_at, rowid', (room['id'],)).fetchall()
                    wishes_by_member = {}
                    for w in wish_rows:
                        wishes_by_member.setdefault(w['member_id'], []).append({'id': w['id'], 'text': w['text'], 'createdAt': w['created_at']})
                    draw = latest_draw(conn, room['id'])
                    draw_info = None
                    if draw:
                        draw_info = {'id': draw['id'], 'createdAt': draw['created_at'], 'mode': draw['mode'], 'algorithm': draw['algorithm_version']}
                    member_rows = []
                    for m in members:
                        mr = safe_member_row(m)
                        mr['wishlist'] = wishes_by_member.get(m['id'], [])
                        member_rows.append(mr)
                    me_row = safe_member_row(member)
                    me_row['wishlist'] = wishes_by_member.get(member['id'], [])
                    return self._send_json(200, {
                        'room': {
                            'id': room['id'], 'code': room['code'], 'name': room['name'], 'mode': room['mode'],
                            'budgetMin': room['budget_min'], 'budgetMax': room['budget_max'], 'eventDate': room['event_date'],
                            'theme': room['theme'], 'status': room['status'], 'createdAt': room['created_at'],
                        },
                        'me': me_row,
                        'members': member_rows,
                        'exclusions': [{'id': e['id'], 'a': e['member_a_id'], 'b': e['member_b_id']} for e in exclusions],
                        'draw': draw_info,
                    })

            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'assignment':
                code = parts[2].upper()
                with db_conn() as conn:
                    room = get_room_by_code(conn, code)
                    if not room:
                        raise ApiError(404, 'room_not_found')
                    member, _ = require_auth_room_member(conn, self, room)
                    draw, asn = get_my_assignment(conn, room['id'], member['id'])
                    if not draw or not asn:
                        return self._send_json(200, {'drawn': False, 'assignment': None})
                    return self._send_json(200, {
                        'drawn': True,
                        'drawRunId': draw['id'],
                        'assignment': {
                            'recipientMemberId': asn['recipient_member_id'],
                            'recipientName': asn['recipient_name'],
                        }
                    })

            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'sessions':
                code = parts[2].upper()
                with db_conn() as conn:
                    room = get_room_by_code(conn, code)
                    if not room:
                        raise ApiError(404, 'room_not_found')
                    member, _ = require_auth_room_member(conn, self, room)
                    rows = conn.execute('SELECT id, created_at, expires_at, revoked_at, last_seen_at, user_agent FROM auth_sessions WHERE room_id=? AND member_id=? ORDER BY created_at DESC', (room['id'], member['id'])).fetchall()
                    return self._send_json(200, {'ok': True, 'sessions': rows_to_dicts(rows)})

            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'events':
                code = parts[2].upper()
                token = parse_bearer(self.headers.get('Authorization')) or (query.get('token') or [None])[0]
                payload = verify_token(token) if token else None
                with db_conn() as conn:
                    room = get_room_by_code(conn, code)
                    if not room:
                        raise ApiError(404, 'room_not_found')
                    if not payload:
                        raise ApiError(401, 'auth_required')
                    # validate session/member
                    require_auth_room_member(conn, self, room)
                last_event_id = self.headers.get('Last-Event-ID') or (query.get('lastEventId') or [None])[0]
                return self._handle_sse(room, last_event_id)

            raise ApiError(404, 'not_found')
        except ApiError as e:
            return self._send_json(e.status, {'ok': False, 'error': e.message, 'details': e.details})
        except Exception as e:
            return self._send_json(500, {'ok': False, 'error': 'internal_error', 'details': str(e)})

    def do_POST(self):
        try:
            path, _ = self._route()
            body = self._read_json()
            parts = [p for p in path.split('/') if p]

            if path == '/api/rooms':
                return self._create_room(body)
            if path == '/api/rooms/join':
                return self._join_room(body)
            if path == '/api/push/subscribe':
                return self._push_subscribe(body)
            if path == '/api/push/unsubscribe':
                return self._push_unsubscribe(body)

            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'draw':
                return self._run_draw(parts[2].upper(), body)
            if len(parts) == 5 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'draw' and parts[4] == 'reset':
                return self._reset_draw(parts[2].upper(), body)
            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'exclusions':
                return self._add_exclusion(parts[2].upper(), body)
            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'invites':
                return self._create_invite(parts[2].upper(), body)
            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'member-tokens':
                return self._create_member_token(parts[2].upper(), body)
            if len(parts) == 5 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'sessions' and parts[4] == 'revoke':
                return self._revoke_sessions(parts[2].upper(), body)
            if len(parts) == 5 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'push' and parts[4] == 'test':
                return self._push_test(parts[2].upper(), body)
            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'notifications':
                return self._enqueue_notification(parts[2].upper(), body)
            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'wishlist':
                return self._add_wishlist_item(parts[2].upper(), body)
            if len(parts) == 4 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'gift-status':
                return self._set_gift_status(parts[2].upper(), body)

            raise ApiError(404, 'not_found')
        except ApiError as e:
            return self._send_json(e.status, {'ok': False, 'error': e.message, 'details': e.details})
        except Exception as e:
            return self._send_json(500, {'ok': False, 'error': 'internal_error', 'details': str(e)})

    def do_DELETE(self):
        try:
            path, _ = self._route()
            parts = [p for p in path.split('/') if p]
            if len(parts) == 5 and parts[0] == 'api' and parts[1] == 'rooms' and parts[3] == 'wishlist':
                return self._delete_wishlist_item(parts[2].upper(), parts[4])
            raise ApiError(404, 'not_found')
        except ApiError as e:
            return self._send_json(e.status, {'ok': False, 'error': e.message, 'details': e.details})
        except Exception as e:
            return self._send_json(500, {'ok': False, 'error': 'internal_error', 'details': str(e)})

    def _create_room(self, body):
        name = (body.get('name') or '').strip()
        organizer_name = (body.get('organizerName') or '').strip()
        if not name or not organizer_name:
            raise ApiError(400, 'name_and_organizer_required')
        mode = (body.get('mode') or 'classic').strip() or 'classic'
        budget_min = int(body.get('budgetMin') or 0)
        budget_max = int(body.get('budgetMax') or 0)
        event_date = (body.get('eventDate') or '').strip() or None
        theme = (body.get('theme') or '').strip() or None
        if budget_max < budget_min:
            raise ApiError(400, 'invalid_budget')
        with db_conn() as conn:
            user_id = new_id('usr')
            room_id = new_id('room')
            member_id = new_id('mem')
            code = None
            for _ in range(20):
                candidate = new_room_code()
                if not get_room_by_code(conn, candidate):
                    code = candidate
                    break
            if not code:
                raise ApiError(500, 'code_generation_failed')
            conn.execute('INSERT INTO users(id,name,created_at) VALUES (?,?,?)', (user_id, organizer_name, now_iso()))
            conn.execute(
                'INSERT INTO rooms(id,code,name,mode,budget_min,budget_max,event_date,theme,organizer_user_id,organizer_member_id,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                (room_id, code, name, mode, budget_min, budget_max, event_date, theme, user_id, member_id, 'active', now_iso()),
            )
            conn.execute(
                'INSERT INTO room_members(id,room_id,user_id,name_snapshot,role,gift_status,created_at) VALUES (?,?,?,?,?,?,?)',
                (member_id, room_id, user_id, organizer_name, 'organizer', 'none', now_iso()),
            )
            # create default participant invite for sharing
            invite_secret = new_id('invite')
            conn.execute('INSERT INTO room_invites(id,room_id,token_hash,label,role,created_by_member_id,created_at) VALUES (?,?,?,?,?,?,?)',
                         (new_id('rinv'), room_id, hash_token(invite_secret), 'default', 'participant', member_id, now_iso()))
            room = get_room_by_code(conn, code)
            emit_room_event(conn, room, 'room.created', member_id, {'roomCode': code, 'name': name})
            sid, token = create_session(conn, room_id, member_id, user_id, 'organizer', self.headers.get('User-Agent'), self.client_address[0] if self.client_address else None)
            return self._send_json(201, {
                'ok': True,
                'room': {'id': room_id, 'code': code, 'name': name, 'mode': mode},
                'member': {'id': member_id, 'name': organizer_name, 'role': 'organizer'},
                'token': token,
                'sessionId': sid,
                'inviteToken': invite_secret,
            })

    def _resolve_join_identity(self, conn, room, body):
        # Priority: memberToken (resume) > inviteToken (new/linked join) > legacy name join
        member_token = (body.get('memberToken') or '').strip()
        invite_token = (body.get('inviteToken') or '').strip()
        name = (body.get('name') or '').strip()

        if member_token:
            mrow = conn.execute('SELECT * FROM member_access_tokens WHERE room_id=? AND token_hash=?', (room['id'], hash_token(member_token))).fetchone()
            if not mrow or mrow['revoked_at'] or (mrow['expires_at'] and mrow['expires_at'] <= now_iso()):
                raise ApiError(401, 'invalid_member_token')
            member = get_member(conn, room['id'], mrow['member_id'])
            if not member:
                raise ApiError(401, 'invalid_member_token')
            conn.execute('UPDATE member_access_tokens SET last_used_at=? WHERE id=?', (now_iso(), mrow['id']))
            return member, 'member_token'

        if invite_token:
            inv = conn.execute('SELECT * FROM room_invites WHERE room_id=? AND token_hash=?', (room['id'], hash_token(invite_token))).fetchone()
            if not inv or inv['revoked_at'] or (inv['expires_at'] and inv['expires_at'] <= now_iso()):
                raise ApiError(401, 'invalid_invite')
            if inv['max_uses'] is not None and int(inv['use_count'] or 0) >= int(inv['max_uses']):
                raise ApiError(401, 'invite_exhausted')
            if not name:
                raise ApiError(400, 'name_required')
            # If caller already has a bearer token for this room, bind to that member (prevents duplicate identities)
            bearer = parse_bearer(self.headers.get('Authorization'))
            payload = verify_token(bearer) if bearer else None
            if payload and payload.get('room_id') == room['id']:
                member = get_member(conn, room['id'], payload.get('member_id'))
                if member:
                    conn.execute('UPDATE room_members SET name_snapshot=? WHERE id=?', (name, member['id']))
                    conn.execute('UPDATE room_invites SET use_count = use_count + 1 WHERE id=?', (inv['id'],))
                    return member, 'invite_existing_member'
            user_id = new_id('usr')
            member_id = new_id('mem')
            role = inv['role'] or 'participant'
            conn.execute('INSERT INTO users(id,name,created_at) VALUES (?,?,?)', (user_id, name, now_iso()))
            conn.execute('INSERT INTO room_members(id,room_id,user_id,name_snapshot,role,gift_status,created_at) VALUES (?,?,?,?,?,?,?)',
                         (member_id, room['id'], user_id, name, role, 'none', now_iso()))
            conn.execute('UPDATE room_invites SET use_count = use_count + 1 WHERE id=?', (inv['id'],))
            emit_room_event(conn, room, 'room.member_joined', member_id, {'memberId': member_id, 'name': name})
            member = get_member(conn, room['id'], member_id)
            return member, 'invite_new_member'

        # Legacy fallback (compat): name-only join; kept for local/dev migration
        if not name:
            raise ApiError(400, 'name_required')
        existing = conn.execute('SELECT * FROM room_members WHERE room_id = ?', (room['id'],)).fetchall()
        match = None
        for m in existing:
            if (m['name_snapshot'] or '').strip().lower() == name.lower():
                match = m
                break
        if match:
            conn.execute('UPDATE room_members SET name_snapshot=? WHERE id=?', (name, match['id']))
            return match, 'legacy_name'
        user_id = new_id('usr')
        member_id = new_id('mem')
        conn.execute('INSERT INTO users(id,name,created_at) VALUES (?,?,?)', (user_id, name, now_iso()))
        conn.execute('INSERT INTO room_members(id,room_id,user_id,name_snapshot,role,gift_status,created_at) VALUES (?,?,?,?,?,?,?)',
                     (member_id, room['id'], user_id, name, 'participant', 'none', now_iso()))
        emit_room_event(conn, room, 'room.member_joined', member_id, {'memberId': member_id, 'name': name})
        member = get_member(conn, room['id'], member_id)
        return member, 'legacy_new'

    def _join_room(self, body):
        code = (body.get('code') or '').strip().upper()
        if not code:
            raise ApiError(400, 'code_required')
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, join_mode = self._resolve_join_identity(conn, room, body)
            sid, token = create_session(conn, room['id'], member['id'], member['user_id'], member['role'], self.headers.get('User-Agent'), self.client_address[0] if self.client_address else None)
            # issue a resumable member access token for stronger identity binding
            member_token_secret = new_id('mkey')
            conn.execute('INSERT INTO member_access_tokens(id,room_id,member_id,token_hash,label,created_at) VALUES (?,?,?,?,?,?)',
                         (new_id('mtok'), room['id'], member['id'], hash_token(member_token_secret), 'auto', now_iso()))
            return self._send_json(200, {
                'ok': True,
                'room': {'id': room['id'], 'code': room['code'], 'name': room['name'], 'mode': room['mode']},
                'member': safe_member_row(member),
                'token': token,
                'sessionId': sid,
                'memberToken': member_token_secret,
                'joinMode': join_mode,
            })

    def _create_invite(self, code, body):
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            if member['role'] != 'organizer':
                raise ApiError(403, 'organizer_required')
            role = (body.get('role') or 'participant')
            if role not in ('participant', 'organizer'):
                role = 'participant'
            secret = new_id('invite')
            inv_id = new_id('rinv')
            conn.execute('INSERT INTO room_invites(id,room_id,token_hash,label,role,created_by_member_id,max_uses,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
                         (inv_id, room['id'], hash_token(secret), body.get('label'), role, member['id'], body.get('maxUses'), body.get('expiresAt'), now_iso()))
            return self._send_json(201, {'ok': True, 'invite': {'id': inv_id, 'role': role, 'token': secret}})

    def _create_member_token(self, code, body):
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            target_member_id = body.get('memberId') or member['id']
            if target_member_id != member['id'] and member['role'] != 'organizer':
                raise ApiError(403, 'forbidden')
            target = get_member(conn, room['id'], target_member_id)
            if not target:
                raise ApiError(404, 'member_not_found')
            secret = new_id('mkey')
            tok_id = new_id('mtok')
            conn.execute('INSERT INTO member_access_tokens(id,room_id,member_id,token_hash,label,expires_at,created_at) VALUES (?,?,?,?,?,?,?)',
                         (tok_id, room['id'], target_member_id, hash_token(secret), body.get('label') or 'manual', body.get('expiresAt'), now_iso()))
            return self._send_json(201, {'ok': True, 'memberToken': {'id': tok_id, 'memberId': target_member_id, 'token': secret}})

    def _revoke_sessions(self, code, body):
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, payload = require_auth_room_member(conn, self, room)
            sid = body.get('sessionId')
            all_self = bool(body.get('allForMember')) or body.get('scope') == 'all'
            now = now_iso()
            if sid:
                sess = conn.execute('SELECT * FROM auth_sessions WHERE id=? AND room_id=?', (sid, room['id'])).fetchone()
                if not sess:
                    raise ApiError(404, 'session_not_found')
                if sess['member_id'] != member['id'] and member['role'] != 'organizer':
                    raise ApiError(403, 'forbidden')
                conn.execute('UPDATE auth_sessions SET revoked_at=?, revoked_reason=? WHERE id=?', (now, body.get('reason') or 'revoked', sid))
            elif all_self:
                target_member_id = body.get('memberId') or member['id']
                if target_member_id != member['id'] and member['role'] != 'organizer':
                    raise ApiError(403, 'forbidden')
                conn.execute("UPDATE auth_sessions SET revoked_at=?, revoked_reason=? WHERE room_id=? AND member_id=? AND revoked_at IS NULL", (now, body.get('reason') or 'revoked_all', room['id'], target_member_id))
            else:
                # revoke current session
                cur = payload.get('sid')
                if not cur:
                    raise ApiError(400, 'session_not_identified')
                conn.execute('UPDATE auth_sessions SET revoked_at=?, revoked_reason=? WHERE id=?', (now, body.get('reason') or 'logout', cur))
            return self._send_json(200, {'ok': True})

    def _add_exclusion(self, code, body):
        a = body.get('a'); b = body.get('b')
        if not a or not b or a == b:
            raise ApiError(400, 'invalid_exclusion')
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            if member['role'] != 'organizer':
                raise ApiError(403, 'organizer_required')
            ids = {r['id'] for r in conn.execute('SELECT id FROM room_members WHERE room_id=?', (room['id'],)).fetchall()}
            if a not in ids or b not in ids:
                raise ApiError(400, 'unknown_member')
            x, y = sorted([a, b])
            exists = conn.execute('SELECT 1 FROM exclusions WHERE room_id=? AND member_a_id=? AND member_b_id=?', (room['id'], x, y)).fetchone()
            if not exists:
                conn.execute('INSERT INTO exclusions(id,room_id,member_a_id,member_b_id,created_at) VALUES (?,?,?,?,?)', (new_id('ex'), room['id'], x, y, now_iso()))
                emit_room_event(conn, room, 'room.exclusion_added', member['id'], {})
            return self._send_json(200, {'ok': True})

    def _run_draw(self, code, body):
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            if member['role'] != 'organizer':
                raise ApiError(403, 'organizer_required')
            member_rows = conn.execute('SELECT id FROM room_members WHERE room_id=? ORDER BY created_at,rowid', (room['id'],)).fetchall()
            member_ids = [r['id'] for r in member_rows]
            if len(member_ids) < 2:
                raise ApiError(400, 'not_enough_members')
            ex_rows = conn.execute('SELECT member_a_id, member_b_id FROM exclusions WHERE room_id=?', (room['id'],)).fetchall()
            exclusions = build_exclusion_set([(r['member_a_id'], r['member_b_id']) for r in ex_rows])
            assignment = derangement_draw(member_ids, exclusions)
            if not assignment or not validate_draw(member_ids, assignment, exclusions):
                raise ApiError(409, 'draw_failed_constraints')
            draw_id = new_id('draw')
            conn.execute('INSERT INTO draw_runs(id,room_id,mode,created_by_member_id,created_at,algorithm_version,meta_json) VALUES (?,?,?,?,?,?,?)',
                         (draw_id, room['id'], room['mode'], member['id'], now_iso(), 'v1', json_dumps({'members': len(member_ids)})))
            for santa_id, recv_id in assignment.items():
                conn.execute('INSERT INTO assignments(id,draw_run_id,room_id,santa_member_id,recipient_member_id,created_at) VALUES (?,?,?,?,?,?)',
                             (new_id('asn'), draw_id, room['id'], santa_id, recv_id, now_iso()))
            emit_room_event(conn, room, 'room.draw_completed', member['id'], {'drawRunId': draw_id, 'memberCount': len(member_ids)})
            return self._send_json(200, {'ok': True, 'drawRunId': draw_id, 'memberCount': len(member_ids)})

    def _push_subscribe(self, body):
        sub = body.get('subscription') or {}
        endpoint = sub.get('endpoint')
        keys = sub.get('keys') or {}
        if not endpoint:
            raise ApiError(400, 'endpoint_required')
        room_code = (body.get('roomCode') or '').upper() or None
        member_id = body.get('memberId') or None
        with db_conn() as conn:
            room_id = None
            if room_code:
                room = get_room_by_code(conn, room_code)
                if room:
                    room_id = room['id']
            conn.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', (endpoint,))
            conn.execute('INSERT INTO push_subscriptions(id,room_id,member_id,endpoint,p256dh,auth,user_agent,created_at) VALUES (?,?,?,?,?,?,?,?)',
                         (new_id('push'), room_id, member_id, endpoint, keys.get('p256dh'), keys.get('auth'), self.headers.get('User-Agent'), now_iso()))
            return self._send_json(200, {'ok': True, 'stored': True, 'vapid': vapid_public_config()})

    def _push_unsubscribe(self, body):
        endpoint = body.get('endpoint') or (body.get('subscription') or {}).get('endpoint')
        if not endpoint:
            raise ApiError(400, 'endpoint_required')
        with db_conn() as conn:
            conn.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', (endpoint,))
        return self._send_json(200, {'ok': True})

    def _push_test(self, code, body):
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            subs = conn.execute('SELECT * FROM push_subscriptions WHERE room_id=? OR member_id=?', (room['id'], member['id'])).fetchall()
            results = []
            for s in subs:
                sub = {'endpoint': s['endpoint'], 'keys': {'p256dh': s['p256dh'], 'auth': s['auth']}}
                results.append(send_web_push(sub, {'title': 'Secret Santa', 'body': body.get('message') or 'Тест уведомления', 'url': f"/#dashboard"}))
            return self._send_json(200, {'ok': True, 'count': len(results), 'results': results, 'vapid': vapid_public_config()})

    def _enqueue_notification(self, code, body):
        channel = body.get('channel') or 'push'
        kind = body.get('kind') or 'custom'
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            if member['role'] != 'organizer' and body.get('memberId') not in (None, member['id']):
                raise ApiError(403, 'forbidden')
            job_id = new_id('job')
            conn.execute('INSERT INTO notification_jobs(id,room_id,member_id,channel,kind,payload_json,status,scheduled_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
                         (job_id, room['id'], body.get('memberId'), channel, kind, json_dumps(body.get('payload') or {}), 'pending', body.get('scheduledAt'), now_iso(), now_iso()))
            return self._send_json(202, {'ok': True, 'jobId': job_id, 'status': 'pending'})

    def _add_wishlist_item(self, code, body):
        text = (body.get('text') or '').strip()
        if not text:
            raise ApiError(400, 'text_required')
        if len(text) > 500:
            raise ApiError(400, 'text_too_long')
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            item_id = new_id('wish')
            conn.execute('INSERT INTO wishlist_items(id,room_id,member_id,text,created_at) VALUES (?,?,?,?,?)',
                         (item_id, room['id'], member['id'], text, now_iso()))
            emit_room_event(conn, room, 'room.wishlist_updated', member['id'], {'memberId': member['id']})
            return self._send_json(201, {'ok': True, 'item': {'id': item_id, 'text': text}})

    def _delete_wishlist_item(self, code, item_id):
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            row = conn.execute('SELECT * FROM wishlist_items WHERE id=? AND room_id=?', (item_id, room['id'])).fetchone()
            if not row:
                raise ApiError(404, 'wishlist_item_not_found')
            if row['member_id'] != member['id'] and member['role'] != 'organizer':
                raise ApiError(403, 'forbidden')
            conn.execute('DELETE FROM wishlist_items WHERE id=?', (item_id,))
            emit_room_event(conn, room, 'room.wishlist_updated', member['id'], {'memberId': row['member_id']})
            return self._send_json(200, {'ok': True})

    def _set_gift_status(self, code, body):
        status = (body.get('status') or '').strip()
        if status not in ('none', 'idea', 'bought', 'done'):
            raise ApiError(400, 'invalid_status')
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            conn.execute('UPDATE room_members SET gift_status=? WHERE id=? AND room_id=?', (status, member['id'], room['id']))
            emit_room_event(conn, room, 'room.gift_status_updated', member['id'], {'memberId': member['id'], 'giftStatus': status})
            return self._send_json(200, {'ok': True, 'status': status})

    def _reset_draw(self, code, body):
        with db_conn() as conn:
            room = get_room_by_code(conn, code)
            if not room:
                raise ApiError(404, 'room_not_found')
            member, _ = require_auth_room_member(conn, self, room)
            if member['role'] != 'organizer':
                raise ApiError(403, 'organizer_required')
            draw = latest_draw(conn, room['id'])
            if draw:
                conn.execute('DELETE FROM assignments WHERE draw_run_id=?', (draw['id'],))
                conn.execute('DELETE FROM draw_runs WHERE id=?', (draw['id'],))
            emit_room_event(conn, room, 'room.draw_reset', member['id'], {})
            return self._send_json(200, {'ok': True})

    def _handle_sse(self, room, last_event_id=None):
        self.send_response(200)
        self._send_cors()
        self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()
        q = bus.subscribe(room['code'])
        try:
            # Replay from durable room_events if client provides Last-Event-ID or ?afterRowid/offset later (extensible)
            if last_event_id:
                with db_conn() as conn:
                    # find rowid of last_event_id then stream newer
                    row = conn.execute('SELECT rowid FROM room_events WHERE id=? AND room_id=?', (last_event_id, room['id'])).fetchone()
                    if row:
                        rows = conn.execute('SELECT rowid,id,type,payload_json,created_at FROM room_events WHERE room_id=? AND rowid > ? ORDER BY rowid ASC LIMIT 200', (room['id'], row['rowid'])).fetchall()
                        for r in rows:
                            payload = json_loads(r['payload_json'], {}) or {}
                            payload['roomCode'] = room['code']
                            payload['seq'] = r['rowid']
                            payload['eventDbId'] = r['id']
                            self.wfile.write(format_sse({'id': r['id'], 'type': r['type'], 'data': payload, 'ts': int(time.time()*1000)}).encode('utf-8'))
                        self.wfile.flush()
            self.wfile.write(format_sse({'type': 'connected', 'data': {'roomCode': room['code']}, 'ts': int(time.time()*1000)}).encode('utf-8'))
            self.wfile.flush()
            last_ping = time.time()
            while True:
                try:
                    event = q.get(timeout=15)
                    self.wfile.write(format_sse(event).encode('utf-8'))
                    self.wfile.flush()
                except Exception:
                    pass
                if time.time() - last_ping >= 15:
                    self.wfile.write(b': ping\n\n')
                    self.wfile.flush()
                    last_ping = time.time()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            bus.unsubscribe(room['code'], q)

    def log_message(self, fmt, *args):
        if os.environ.get('SECRET_SANTA_DEBUG'):
            super().log_message(fmt, *args)


def run(host='127.0.0.1', port=8000):
    with db_conn() as conn:
        pass
    server = ThreadingHTTPServer((host, port), Handler)
    print(f'Secret Santa backend listening on http://{host}:{port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default=os.environ.get('HOST', '127.0.0.1'))
    parser.add_argument('--port', type=int, default=int(os.environ.get('PORT', '8000')))
    args = parser.parse_args()
    run(args.host, args.port)
