import unittest
from scripts.refresh_data import relevance, normalize_category, style_tags, feature_score

class ModelTests(unittest.TestCase):
    def test_relevance(self):
        self.assertTrue(relevance('Toddler checkerboard skate shoe'))
        self.assertFalse(relevance('Adult men gift card'))

    def test_category(self):
        self.assertEqual(normalize_category('shoes','toddler skate shoe'),'shoes')
        self.assertEqual(normalize_category('misc','baby beanie alt'),'beanies')

    def test_style_tags(self):
        tags=style_tags('surf beach checkerboard skate', ['graphic'])
        self.assertIn('surf', tags)
        self.assertIn('skate', tags)
        self.assertIn('graphic', tags)

    def test_score(self):
        self.assertGreaterEqual(feature_score(['skate','surf'],'Checkerboard slip on'),35)

if __name__ == '__main__':
    unittest.main()
