import json
import os
import tempfile
import threading
import time
import unittest
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer

# run server in-process on temp DB
os.environ['SECRET_SANTA_SECRET'] = 'test-secret'

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
        return e.code, json.loads(e.read().decode())


class SecurityE2ETests(unittest.TestCase):
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

    def test_private_assignment_and_authz(self):
        s, c = req(self.base, 'POST', '/api/rooms', {'name': 'R', 'organizerName': 'Org', 'eventDate': '2026-12-31'})
        self.assertEqual(s, 201)
        code = c['room']['code']; to = c['token']; inv = c['inviteToken']
        s, j1 = req(self.base, 'POST', '/api/rooms/join', {'code': code, 'name': 'A', 'inviteToken': inv})
        s, j2 = req(self.base, 'POST', '/api/rooms/join', {'code': code, 'name': 'B', 'inviteToken': inv})
        ta, tb = j1['token'], j2['token']
        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/draw', {}, token=to)
        self.assertEqual(s, 200)
        s, aa = req(self.base, 'GET', f'/api/rooms/{code}/assignment', token=ta)
        s, ab = req(self.base, 'GET', f'/api/rooms/{code}/assignment', token=tb)
        self.assertTrue(aa['drawn'] and ab['drawn'])
        # privacy: each sees only own assignment payload (no full map endpoint exists)
        self.assertIn('recipientName', aa['assignment'])
        self.assertNotEqual(aa['assignment']['recipientMemberId'], ab['assignment']['recipientMemberId'])
        # authz: non-organizer cannot draw
        s, err = req(self.base, 'POST', f'/api/rooms/{code}/draw', {}, token=ta)
        self.assertEqual(s, 403)

    def test_session_revocation_and_replay_cursor(self):
        s, c = req(self.base, 'POST', '/api/rooms', {'name': 'R', 'organizerName': 'Org', 'eventDate': '2026-12-31'})
        code = c['room']['code']; to = c['token']; inv = c['inviteToken']
        s, j1 = req(self.base, 'POST', '/api/rooms/join', {'code': code, 'name': 'A', 'inviteToken': inv})
        ta = j1['token']
        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/sessions/revoke', {'allForMember': True}, token=ta)
        self.assertEqual(s, 200)
        s, denied = req(self.base, 'GET', f'/api/rooms/{code}/assignment', token=ta)
        self.assertEqual(s, 401)
        # events persisted for replay capability
        import sqlite3
        conn = sqlite3.connect(os.environ['SECRET_SANTA_DB_PATH'])
        rows = conn.execute('SELECT type,id FROM room_events WHERE room_id=(SELECT id FROM rooms WHERE code=?) ORDER BY rowid', (code,)).fetchall()
        conn.close()
        self.assertTrue(any(r[0] == 'room.created' for r in rows))
        self.assertTrue(all(r[1] for r in rows))


if __name__ == '__main__':
    unittest.main()
