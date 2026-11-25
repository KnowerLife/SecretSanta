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


class MessagesE2ETests(unittest.TestCase):
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
        for name in ('A', 'B'):
            s, j = req(self.base, 'POST', '/api/rooms/join', {'code': code, 'name': name, 'inviteToken': inv})
            self.assertEqual(s, 200)
            tokens[name] = j['token']
        return code, tokens

    def test_messages_require_draw_and_flow(self):
        code, t = self._setup_room()
        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/messages', {'channel': 'to_recipient', 'text': 'hi'}, token=t['Org'])
        self.assertEqual(s, 409)

        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/draw', {}, token=t['Org'])
        self.assertEqual(s, 200)

        s, m = req(self.base, 'POST', f'/api/rooms/{code}/messages', {'channel': 'to_recipient', 'text': 'hello'}, token=t['Org'])
        self.assertEqual(s, 201)
        self.assertTrue(m['ok'])
        self.assertEqual(m['message']['text'], 'hello')
        self.assertTrue(m['message']['fromMe'])

        s, g = req(self.base, 'GET', f'/api/rooms/{code}/messages?channel=to_recipient', token=t['Org'])
        self.assertEqual(s, 200)
        self.assertEqual(len(g['messages']), 1)
        self.assertTrue(g['messages'][0]['fromMe'])

        # recipient of Org should see it in to_santa channel
        peer_token = None
        for name in ('A', 'B'):
            s, gr = req(self.base, 'GET', f'/api/rooms/{code}/messages?channel=to_santa', token=t[name])
            if s == 200 and len(gr.get('messages', [])) == 1:
                peer_token = t[name]
                self.assertFalse(gr['messages'][0]['fromMe'])
                break
        self.assertIsNotNone(peer_token)

        # peer replies
        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/messages', {'channel': 'to_santa', 'text': 'reply'}, token=peer_token)
        self.assertEqual(s, 201)
        s, g2 = req(self.base, 'GET', f'/api/rooms/{code}/messages?channel=to_recipient', token=t['Org'])
        self.assertEqual(len(g2['messages']), 2)
        self.assertFalse(g2['messages'][1]['fromMe'])

    def test_messages_cleared_on_reset(self):
        code, t = self._setup_room()
        req(self.base, 'POST', f'/api/rooms/{code}/draw', {}, token=t['Org'])
        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/messages', {'channel': 'to_recipient', 'text': 'secret'}, token=t['Org'])
        self.assertEqual(s, 201)
        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/draw/reset', {}, token=t['Org'])
        self.assertEqual(s, 200)
        s, _ = req(self.base, 'POST', f'/api/rooms/{code}/draw', {}, token=t['Org'])
        self.assertEqual(s, 200)
        s, g = req(self.base, 'GET', f'/api/rooms/{code}/messages?channel=to_recipient', token=t['Org'])
        self.assertEqual(s, 200)
        self.assertEqual(g['messages'], [])


if __name__ == '__main__':
    unittest.main()
