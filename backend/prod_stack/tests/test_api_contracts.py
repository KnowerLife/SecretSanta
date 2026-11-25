"""Static source contracts for the FastAPI production-stack scaffold.

These checks do not require FastAPI, Postgres or Redis. They protect the public
API shape that the frontend relies on until full prod-stack E2E tests can run
against real infrastructure.
"""
import ast
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[3]
ROUTES_FILE = ROOT / 'backend' / 'prod_stack' / 'fastapi_app' / 'api' / 'rooms.py'
SOURCE = ROUTES_FILE.read_text(encoding='utf-8')
TREE = ast.parse(SOURCE)


def route_contracts():
    found = set()
    for node in TREE.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for dec in node.decorator_list:
            if not (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)):
                continue
            if not (isinstance(dec.func.value, ast.Name) and dec.func.value.id == 'router'):
                continue
            if dec.args and isinstance(dec.args[0], ast.Constant):
                found.add((dec.func.attr.upper(), dec.args[0].value))
    return found


def function_source(name):
    for node in TREE.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.get_source_segment(SOURCE, node) or ''
    return ''


class ProdStackContracts(unittest.TestCase):
    def test_frontend_facing_routes_are_declared(self):
        expected = {
            ('POST', ''),
            ('POST', '/join'),
            ('GET', '/{code}'),
            ('GET', '/{code}/activity'),
            ('POST', '/{code}/draw'),
            ('GET', '/{code}/assignment'),
            ('POST', '/{code}/draw/reset'),
            ('POST', '/{code}/wishlist'),
            ('DELETE', '/{code}/wishlist/{item_id}'),
            ('POST', '/{code}/gift-status'),
            ('POST', '/{code}/profile'),
            ('POST', '/{code}/exclusions'),
            ('DELETE', '/{code}/exclusions/{a}/{b}'),
            ('GET', '/{code}/messages'),
            ('POST', '/{code}/messages'),
        }
        self.assertTrue(expected.issubset(route_contracts()), sorted(expected - route_contracts()))

    def test_activity_contract_is_organizer_only_and_publishable(self):
        src = function_source('room_activity')
        for fragment in (
            'member.role != "organizer"',
            'organizer_required',
            'max(1, min(50, limit))',
            'RoomEvent',
            '"createdAt"',
            '"actorName"',
            '"payload"',
        ):
            self.assertIn(fragment, src, fragment)

    def test_exclusion_events_keep_group_name(self):
        add_src = function_source('add_exclusion')
        delete_src = function_source('delete_exclusion')
        self.assertIn('body.get("groupName")', add_src)
        self.assertIn('payload["groupName"]', add_src)
        self.assertIn('Query(None, alias="groupName")', delete_src)
        self.assertIn('payload["groupName"]', delete_src)

    def test_room_lifecycle_events_are_emitted(self):
        self.assertIn('"room.created"', function_source('create_room'))
        self.assertIn('"room.member_joined"', function_source('join_room'))

    def test_chat_is_scoped_to_draw_run_and_channel(self):
        get_src = function_source('get_messages')
        post_src = function_source('send_message')
        for src in (get_src, post_src):
            self.assertIn('draw_run_id', src)
            self.assertIn('_resolve_message_peer', src)
        self.assertIn('"channel"', get_src)
        self.assertIn('text_too_long', post_src)

    def test_profile_contract_has_extended_fields(self):
        src = function_source('update_profile')
        for field in ('address', 'profile_note', 'anti_wishlist', 'size', 'links', 'allergies'):
            self.assertIn(field, src, field)


if __name__ == '__main__':
    unittest.main()
