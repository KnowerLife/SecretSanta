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
    st, _ = call('POST', f'/api/rooms/{code}/gift-status', {'status': 'idea'}, token=token)
    assert st == 200
    st, _ = call('POST', f'/api/rooms/{code}/draw', {}, token=token)
    assert st == 200
    st, a = call('GET', f'/api/rooms/{code}/assignment', token=token)
    assert st == 200 and a.get('drawn')
    st, _ = call('POST', f'/api/rooms/{code}/draw/reset', {}, token=token)
    assert st == 200
    print('SMOKE_OK', code)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('SMOKE_FAIL', e, file=sys.stderr)
        sys.exit(1)
