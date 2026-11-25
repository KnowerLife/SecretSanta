#!/usr/bin/env python3
"""Simple E2E smoke test against a running backend."""
import json
import os
import sys
import urllib.request

BASE = os.environ.get('SECRET_SANTA_BASE', 'http://127.0.0.1:8000')


def call(method, path, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode())


def main():
    st, health = call('GET', '/api/health')
    assert st == 200 and health.get('ok')
    st, c = call('POST', '/api/rooms', {'name': 'Smoke', 'organizerName': 'Org', 'eventDate': '2026-12-31', 'budgetMin': 10, 'budgetMax': 20})
    assert st == 201
    code = c['room']['code']; token = c['token']; inv = c['inviteToken']
    for name in ('Alice', 'Bob'):
        st, _ = call('POST', '/api/rooms/join', {'code': code, 'name': name, 'inviteToken': inv})
        assert st == 200
    st, w = call('POST', f'/api/rooms/{code}/wishlist', {'text': 'Tea'}, token=token)
    assert st == 201
    st, p = call('POST', f'/api/rooms/{code}/profile', {
        'address': 'Moscow', 'profileNote': 'Tea lover', 'antiWishlist': 'No socks',
        'size': 'M', 'links': 'https://example.com', 'allergies': 'Nuts',
    }, token=token)
    assert st == 200 and p.get('ok') and p['profile']['size'] == 'M'
    st, room = call('GET', f'/api/rooms/{code}', token=token)
    assert st == 200
    ids = {m['name']: m['id'] for m in room['members']}
    a, b = sorted([ids['Alice'], ids['Bob']])
    st, _ = call('POST', f'/api/rooms/{code}/exclusions', {'a': a, 'b': b, 'groupName': 'Smoke group'}, token=token)
    assert st == 200
    st, activity = call('GET', f'/api/rooms/{code}/activity', token=token)
    assert st == 200 and any(e['type'] == 'room.exclusion_added' for e in activity['events'])
    st, _ = call('DELETE', f'/api/rooms/{code}/exclusions/{a}/{b}', token=token)
    assert st == 200
    st, _ = call('POST', f'/api/rooms/{code}/gift-status', {'status': 'idea'}, token=token)
    assert st == 200
    st, _ = call('POST', f'/api/rooms/{code}/draw', {}, token=token)
    assert st == 200
    st, a = call('GET', f'/api/rooms/{code}/assignment', token=token)
    assert st == 200 and a.get('drawn')
    st, m = call('POST', f'/api/rooms/{code}/messages', {'channel': 'to_recipient', 'text': 'smoke'}, token=token)
    assert st == 201 and m.get('ok')
    st, g = call('GET', f'/api/rooms/{code}/messages?channel=to_recipient', token=token)
    assert st == 200 and len(g.get('messages', [])) == 1
    st, _ = call('POST', f'/api/rooms/{code}/draw/reset', {}, token=token)
    assert st == 200
    print('SMOKE_OK', code)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('SMOKE_FAIL', e, file=sys.stderr)
        sys.exit(1)
