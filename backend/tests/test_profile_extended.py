import json
import os
import tempfile
import threading
import time
import unittest
import urllib.request
import urllib.error
import urllib.parse
from http.server import ThreadingHTTPServer

os.environ.setdefault('SECRET_SANTA_SECRET', 'test-secret')
from app.server import Handler  # noqa: E402


def req(base, method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(base + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'raw': raw}


class ProfileExtendedTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ['SECRET_SANTA_DB_PATH'] = os.path.join(self.tmp.name, 'test.db')
        self.httpd = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.port = self.httpd.server_address[1]
        self.base = f'http://127.0.0.1:{self.port}'
        self.t = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.t.start()
        time.sleep(0.05)

    def tearDown(self):
        self.httpd.shutdown(); self.httpd.server_close(); self.t.join(timeout=2)
        self.tmp.cleanup()

    def _setup_room(self):
        s, c = req(self.base, 'POST', '/api/rooms', {'name': 'R', 'organizerName': 'Org', 'eventDate': '2026-12-31'})
        self.assertEqual(s, 201)
        code = c['room']['code']; inv = c['inviteToken']
        tokens = {'Org': c['token']}
        for name in ('A', 'B', 'C'):
            s, j = req(self.base, 'POST', '/api/rooms/join', {'code': code, 'name': name, 'inviteToken': inv})
            self.assertEqual(s, 200)
            tokens[name] = j['token']
        return code, tokens

    def test_extended_profile_roundtrip(self):
        code, t = self._setup_room()
        s, j = req(self.base, 'POST', f'/api/rooms/{code}/profile', {
            'address': 'Moscow', 'profileNote': 'Tea', 'antiWishlist': 'No socks',
            'size': 'M', 'links': 'https://example.com', 'allergies': 'Nuts',
        }, token=t['Org'])
        self.assertEqual(s, 200)
        self.assertEqual(j['profile']['size'], 'M')
        self.assertEqual(j['profile']['allergies'], 'Nuts')
        s, room = req(self.base, 'GET', f'/api/rooms/{code}', token=t['Org'])
        self.assertEqual(s, 200)
        me = room['me']
        self.assertEqual(me['size'], 'M')
        self.assertEqual(me['links'], 'https://example.com')
        self.assertEqual(me['allergies'], 'Nuts')

    def test_exclusion_add_and_delete(self):
        code, t = self._setup_room()
        s, room = req(self.base, 'GET', f'/api/rooms/{code}', token=t['Org'])
        ids = {m['name']: m['id'] for m in room['members']}
        a, b = sorted([ids['A'], ids['B']])
        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/exclusions', {'a': a, 'b': b}, token=t['Org'])
        self.assertEqual(s, 200)
        s, room = req(self.base, 'GET', f'/api/rooms/{code}', token=t['Org'])
        self.assertTrue(any(e['a'] == a and e['b'] == b for e in room['exclusions']))
        s, _ = req(self.base, 'DELETE', f'/api/rooms/{code}/exclusions/{a}/{b}', token=t['Org'])
        self.assertEqual(s, 200)
        s, room = req(self.base, 'GET', f'/api/rooms/{code}', token=t['Org'])
        self.assertFalse(any(e['a'] == a and e['b'] == b for e in room['exclusions']))

    def test_activity_endpoint_organizer_only(self):
        code, t = self._setup_room()
        s, data = req(self.base, 'GET', f'/api/rooms/{code}/activity', token=t['Org'])
        self.assertEqual(s, 200)
        self.assertTrue(data['ok'])
        self.assertTrue(any(e['type'] == 'room.member_joined' for e in data['events']))
        self.assertTrue(all('createdAt' in e and 'payload' in e for e in data['events']))
        s, denied = req(self.base, 'GET', f'/api/rooms/{code}/activity', token=t['A'])
        self.assertEqual(s, 403)
        self.assertEqual(denied['error'], 'organizer_required')
        s, denied = req(self.base, 'GET', f'/api/rooms/{code}/events')
        self.assertEqual(s, 401)
        self.assertEqual(denied['error'], 'auth_required')
        url = f'{self.base}/api/rooms/{code}/events?token={urllib.parse.quote(t["Org"])}'
        with urllib.request.urlopen(url, timeout=5) as resp:
            self.assertEqual(resp.status, 200)
            self.assertTrue(resp.readline().decode().strip().startswith('event: connected'))

    def test_group_exclusion_events_carry_group_name(self):
        code, t = self._setup_room()
        s, room = req(self.base, 'GET', f'/api/rooms/{code}', token=t['Org'])
        ids = {m['name']: m['id'] for m in room['members']}
        a, b = sorted([ids['A'], ids['B']])
        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/exclusions',
                   {'a': a, 'b': b, 'groupName': 'Family'}, token=t['Org'])
        self.assertEqual(s, 200)
        s, _ = req(self.base, 'DELETE', f'/api/rooms/{code}/exclusions/{a}/{b}?groupName=Family', token=t['Org'])
        self.assertEqual(s, 200)
        s, data = req(self.base, 'GET', f'/api/rooms/{code}/activity?limit=50', token=t['Org'])
        self.assertEqual(s, 200)
        names = [(e['type'], e['payload'].get('groupName')) for e in data['events']]
        self.assertIn(('room.exclusion_added', 'Family'), names)
        self.assertIn(('room.exclusion_removed', 'Family'), names)


if __name__ == '__main__':
    unittest.main()
