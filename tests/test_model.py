import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from scripts.refresh_data import (
    feature_score,
    is_working_product_url,
    infer_style_tags,
    normalize_category,
    relevance,
)


class ModelTests(unittest.TestCase):
    def test_relevance_positive(self):
        self.assertTrue(relevance('Toddler checkerboard skate shoe'))

    def test_relevance_word_boundary_exclusions(self):
        self.assertFalse(relevance('Adult men gift card'))
        self.assertTrue(relevance('Mini surf tee for tiny riders'))

    def test_category(self):
        self.assertEqual(normalize_category('shoes', 'toddler skate shoe'), 'shoes')
        self.assertEqual(normalize_category('misc', 'baby beanie alt'), 'beanies')

    def test_style_tags(self):
        tags = infer_style_tags('surf beach checkerboard skate', ['graphic'])
        self.assertIn('surf', tags)
        self.assertIn('skate', tags)
        self.assertIn('graphic', tags)

    def test_feature_score(self):
        self.assertGreaterEqual(feature_score(['skate', 'surf'], 'Checkerboard slip on'), 35)

    @patch('scripts.refresh_data.urlopen')
    def test_is_working_product_url_success(self, mock_urlopen):
        mock_response = mock_urlopen.return_value.__enter__.return_value
        mock_response.status = 200

        ok, reason = is_working_product_url('https://example.com/product')

        self.assertTrue(ok)
        self.assertIsNone(reason)

    @patch('scripts.refresh_data.urlopen')
    def test_is_working_product_url_http_error(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url='https://example.com/product',
            code=404,
            msg='Not Found',
            hdrs=None,
            fp=None,
        )

        ok, reason = is_working_product_url('https://example.com/product')

        self.assertFalse(ok)
        self.assertEqual(reason, 'HTTP 404')

    @patch('scripts.refresh_data.urlopen')
    def test_is_working_product_url_network_error(self, mock_urlopen):
        mock_urlopen.side_effect = URLError('Temporary failure in name resolution')

        ok, reason = is_working_product_url('https://example.com/product')

        self.assertFalse(ok)
        self.assertIn('Temporary failure', reason)


if __name__ == '__main__':
    unittest.main()
