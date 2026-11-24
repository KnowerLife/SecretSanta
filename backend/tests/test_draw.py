import unittest

from app.draw import build_exclusion_set, derangement_draw, validate_draw


class DrawTests(unittest.TestCase):
    def test_basic_derangement(self):
        ids = ['a', 'b', 'c', 'd']
        asn = derangement_draw(ids)
        self.assertIsNotNone(asn)
        self.assertTrue(validate_draw(ids, asn))

    def test_exclusions_respected(self):
        ids = ['a', 'b', 'c', 'd']
        ex = build_exclusion_set([('a', 'b'), ('c', 'd')])
        for _ in range(50):
            asn = derangement_draw(ids, ex)
            self.assertIsNotNone(asn)
            self.assertTrue(validate_draw(ids, asn, ex))
            self.assertNotEqual(asn['a'], 'b')
            self.assertNotEqual(asn['c'], 'd')

    def test_impossible_small(self):
        ids = ['a', 'b']
        ex = build_exclusion_set([('a', 'b')])
        asn = derangement_draw(ids, ex, max_attempts=100)
        self.assertIsNone(asn)


if __name__ == '__main__':
    unittest.main()
