import json
import os
import tempfile
import threading
import time
import unittest
import urllib.request
import urllib.error
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


class WishlistE2ETests(unittest.TestCase):
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

    def test_wishlist_gift_status_and_reset(self):
        s, c = req(self.base, 'POST', '/api/rooms', {'name': 'R', 'organizerName': 'Org', 'eventDate': '2026-12-31'})
        self.assertEqual(s, 201)
        code = c['room']['code']; to = c['token']; inv = c['inviteToken']
        req(self.base, 'POST', '/api/rooms/join', {'code': code, 'name': 'A', 'inviteToken': inv})
        req(self.base, 'POST', '/api/rooms/join', {'code': code, 'name': 'B', 'inviteToken': inv})

        s, w = req(self.base, 'POST', f'/api/rooms/{code}/wishlist', {'text': 'Book'}, token=to)
        self.assertEqual(s, 201)
        wid = w['item']['id']

        s, g = req(self.base, 'POST', f'/api/rooms/{code}/gift-status', {'status': 'bought'}, token=to)
        self.assertEqual(s, 200)

        s, r = req(self.base, 'GET', f'/api/rooms/{code}', token=to)
        self.assertEqual(s, 200)
        self.assertEqual(r['me']['giftStatus'], 'bought')
        self.assertEqual(len(r['me']['wishlist']), 1)

        s, d = req(self.base, 'POST', f'/api/rooms/{code}/draw', {}, token=to)
        self.assertEqual(s, 200)
        s, a = req(self.base, 'GET', f'/api/rooms/{code}/assignment', token=to)
        self.assertTrue(a['drawn'])

        s, rs = req(self.base, 'POST', f'/api/rooms/{code}/draw/reset', {}, token=to)
        self.assertEqual(s, 200)
        s, r2 = req(self.base, 'GET', f'/api/rooms/{code}', token=to)
        self.assertIsNone(r2['draw'])

        s, _ = req(self.base, 'DELETE', f'/api/rooms/{code}/wishlist/{wid}', token=to)
        self.assertEqual(s, 200)
        s, r3 = req(self.base, 'GET', f'/api/rooms/{code}', token=to)
        self.assertEqual(len(r3['me']['wishlist']), 0)


if __name__ == '__main__':
    unittest.main()
