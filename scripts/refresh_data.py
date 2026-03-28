#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import re
from dataclasses import asdict, dataclass
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

OUTPUT_PATH = Path('data/products.generated.json')
REJECTED_PATH = Path('data/products.rejected.json')

SEEDS = [
    {
        'url': 'https://www.vans.com/en-us/shoes-c00081/toddler-checkerboard-slip-on-v-shoe-pvn0a4vhrbla',
        'retailer_name': 'Vans',
        'brand': 'Vans',
        'age_hint': '2T-4T',
        'category_hint': 'shoes',
        'tags': ['checkerboard', 'skate', 'classic'],
        'gender': 'neutral',
        'source_adapter': 'jsonld_product_page',
        'enabled': True,
    },
    {
        'url': 'https://www.vans.com/en-us/shoes-c00081/toddler-ward-shoe-pvn000d3ybka',
        'retailer_name': 'Vans',
        'brand': 'Vans',
        'age_hint': '2T-4T',
        'category_hint': 'shoes',
        'tags': ['skate', 'streetwear'],
        'gender': 'neutral',
        'source_adapter': 'jsonld_product_page',
        'enabled': True,
    },
    {
        'url': 'https://www.quiksilver.com/baby-boys-2-7-surfsilk-tijuana-boardshorts-EQKBS03300.html',
        'retailer_name': 'Quiksilver',
        'brand': 'Quiksilver',
        'age_hint': '2T-7',
        'category_hint': 'boardshorts',
        'tags': ['surf', 'beach', 'graphic'],
        'gender': 'boy',
        'source_adapter': 'jsonld_product_page',
        'enabled': True,
    },
    {
        'url': 'https://us.oneill.com/products/fa3106002-boyss-balance-hoodie',
        'retailer_name': "O'Neill",
        'brand': "O'Neill",
        'age_hint': '2T-7',
        'category_hint': 'hoodies',
        'tags': ['surf', 'streetwear', 'vintage wash'],
        'gender': 'boy',
        'source_adapter': 'jsonld_product_page',
        'enabled': True,
    },
    {
        'url': 'https://us.oneill.com/products/sp4106039-girls-saltwater-dreams-tee',
        'retailer_name': "O'Neill",
        'brand': "O'Neill",
        'age_hint': '2T-7',
        'category_hint': 'tees',
        'tags': ['surf', 'graphic', 'beach'],
        'gender': 'girl',
        'source_adapter': 'jsonld_product_page',
        'enabled': True,
    },
]

INCLUDE_KEYWORDS = ['toddler', 'baby', 'infant', 'kid', 'romper', 'onesie', 'boardshort', 'skate', 'surf', 'checkerboard', 'hoodie', 'beanie', 'tee', 'shoe']
EXCLUDE_PATTERNS = [r'\badult\b', r'\bgift\s*card\b', r'\bmen(?:\'s)?\b', r'\bwomen(?:\'s)?\b']
STYLE_MAP = {
    'punk': ['punk', 'distressed', 'grunge', 'alt'],
    'surf': ['surf', 'wave', 'beach', 'saltwater', 'boardshort'],
    'skate': ['skate', 'checkerboard', 'streetwear', 'vans'],
    'checkerboard': ['checkerboard'],
    'graphic': ['graphic', 'logo', 'print'],
    'beach': ['beach', 'ocean', 'coast'],
    'vintage wash': ['vintage', 'washed', 'faded'],
}


@dataclass
class FetchResult:
    status_code: int
    final_url: str
    body: str
    content_type: str


@dataclass
class Product:
    id: str
    slug: str
    title: str
    brand: str
    retailer_name: str
    retailer_domain: str
    source_product_url: str
    canonical_product_url: str
    image_url: str
    additional_images: list[str]
    current_price: float
    original_price: float | None
    currency: str
    availability: str
    category: str
    age_range: str
    sizes: list[str]
    style_tags: list[str]
    gender: str | None
    description_short: str
    last_checked_at: str
    is_active: bool
    validation_status: str
    validation_errors: list[str]
    source_adapter: str
    product_signature: str
    featured_score: int
    recently_updated: bool


class MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.canonical: str | None = None
        self.og_url: str | None = None
        self.page_title: str = ''
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {k.lower(): (v or '') for k, v in attrs}
        if tag.lower() == 'link' and attr_map.get('rel', '').lower() == 'canonical':
            self.canonical = attr_map.get('href') or self.canonical
        if tag.lower() == 'meta' and attr_map.get('property', '').lower() == 'og:url':
            self.og_url = attr_map.get('content') or self.og_url
        if tag.lower() == 'title':
            self._in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == 'title':
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.page_title += data


def slugify(value: str) -> str:
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', value.lower()))


def parse_price(value: Any) -> float:
    if value is None:
        return 0.0
    return float(re.sub(r'[^\d.]', '', str(value)) or 0)


def normalize_availability(value: Any) -> str:
    lowered = str(value or '').lower()
    if 'instock' in lowered or 'in stock' in lowered:
        return 'in_stock'
    if 'outofstock' in lowered or 'out of stock' in lowered:
        return 'out_of_stock'
    if 'preorder' in lowered:
        return 'preorder'
    return 'unknown'


def relevance(text: str) -> bool:
    lowered = text.lower()
    has_include = any(word in lowered for word in INCLUDE_KEYWORDS)
    has_exclude = any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in EXCLUDE_PATTERNS)
    return has_include and not has_exclude


def infer_style_tags(text: str, tags: list[str]) -> list[str]:
    lowered = text.lower()
    output = set(tags)
    for tag, words in STYLE_MAP.items():
        if any(word in lowered for word in words):
            output.add(tag)
    return sorted(output)


def normalize_category(category_hint: str, text: str) -> str:
    options = [
        ('onesie', 'onesies'), ('romper', 'rompers'), ('tee', 'tees'), ('hoodie', 'hoodies'),
        ('short', 'boardshorts'), ('beanie', 'beanies'), ('sock', 'socks'), ('shoe', 'shoes'),
        ('jacket', 'jackets'), ('overall', 'overalls'), ('hat', 'hats'), ('bag', 'accessories')
    ]
    lowered = f'{category_hint} {text}'.lower()
    for needle, category in options:
        if needle in lowered:
            return category
    return 'clothing'


def feature_score(tags: list[str], title: str) -> int:
    score = len(tags) * 10
    if 'checkerboard' in title.lower():
        score += 15
    if 'punk' in tags:
        score += 12
    if 'surf' in tags:
        score += 10
    if 'skate' in tags:
        score += 10
    return min(score, 100)


def fetch_url(url: str, method: str = 'GET', accept: str = 'text/html,*/*') -> FetchResult:
    request = Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 TinyThrashThreadsBot/2.0',
            'Accept': accept,
        },
        method=method,
    )
    with urlopen(request, timeout=20) as response:
        status_code = getattr(response, 'status', response.getcode())
        final_url = response.geturl()
        content_type = (response.headers.get('Content-Type') or '').lower()
        body = response.read().decode('utf-8', 'ignore') if method == 'GET' else ''
        return FetchResult(status_code=status_code, final_url=final_url, body=body, content_type=content_type)


def extract_jsonld_nodes(html: str) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    blobs = re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.S | re.I)
    for blob in blobs:
        text = unescape(blob.strip())
        if not text:
            continue
        try:
            parsed = json.loads(text)
        except Exception:
            continue
        candidates = parsed if isinstance(parsed, list) else [parsed]
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            if isinstance(candidate.get('@graph'), list):
                for graph_node in candidate['@graph']:
                    if isinstance(graph_node, dict):
                        nodes.append(graph_node)
            nodes.append(candidate)
    return nodes


def extract_product_node(html: str) -> dict[str, Any] | None:
    for node in extract_jsonld_nodes(html):
        types = node.get('@type')
        type_values = [types] if isinstance(types, str) else (types or [])
        if any(str(t).lower() == 'product' for t in type_values):
            return node
    return None


def is_probable_product_page(final_url: str, html: str, title: str | None = None) -> bool:
    parsed = urlparse(final_url)
    path = parsed.path.lower()
    if path in {'', '/'}:
        return False
    generic_patterns = ['/search', '/collections', '/category', '/c/', '/s/']
    if any(token in path for token in generic_patterns):
        return False
    content = f"{title or ''} {html[:1200]}".lower()
    generic_signals = ['search results', 'no results found', '404', 'page not found', 'not available']
    if any(signal in content for signal in generic_signals):
        return False
    return True


def parse_metadata(html: str, base_url: str) -> tuple[str, str]:
    parser = MetadataParser()
    parser.feed(html)
    canonical = parser.canonical or parser.og_url or base_url
    return (urljoin(base_url, canonical), parser.page_title.strip())


def check_image_url(image_url: str) -> tuple[bool, str | None]:
    if not image_url:
        return False, 'missing image url'

    try:
        head = fetch_url(image_url, method='HEAD', accept='image/*,*/*')
        if head.status_code >= 400:
            return False, f'image status {head.status_code}'
        if 'image/' not in head.content_type and head.content_type:
            return False, f'non-image content type ({head.content_type})'
        return True, None
    except HTTPError as error:
        return False, f'image HTTP {error.code}'
    except Exception:
        try:
            get_result = fetch_url(image_url, method='GET', accept='image/*,*/*')
            if get_result.status_code >= 400:
                return False, f'image status {get_result.status_code}'
            if 'image/' not in get_result.content_type:
                return False, f'non-image content type ({get_result.content_type})'
            return True, None
        except Exception as error:
            return False, str(error)


def validate_seed(seed: dict[str, Any], now: str) -> tuple[Product | None, dict[str, Any]]:
    validation_errors: list[str] = []
    source_url = seed['url']

    try:
        page = fetch_url(source_url)
    except HTTPError as error:
        validation_errors.append(f'product page HTTP {error.code}')
        return None, {'seed_url': source_url, 'retailer_name': seed['retailer_name'], 'errors': validation_errors}
    except URLError as error:
        validation_errors.append(f'network error: {error.reason}')
        return None, {'seed_url': source_url, 'retailer_name': seed['retailer_name'], 'errors': validation_errors}
    except Exception as error:
        validation_errors.append(str(error))
        return None, {'seed_url': source_url, 'retailer_name': seed['retailer_name'], 'errors': validation_errors}

    if page.status_code >= 400:
        validation_errors.append(f'product page status {page.status_code}')

    if 'text/html' not in page.content_type:
        validation_errors.append(f'unexpected content type {page.content_type}')

    canonical_url, page_title = parse_metadata(page.body, page.final_url)

    if not is_probable_product_page(page.final_url, page.body, page_title):
        validation_errors.append('final URL does not appear to be a product detail page')

    node = extract_product_node(page.body)
    if not node:
        validation_errors.append('Product JSON-LD not found')
        return None, {'seed_url': source_url, 'retailer_name': seed['retailer_name'], 'errors': validation_errors}

    title = str(node.get('name') or '').strip()
    description = re.sub('<[^>]*>', ' ', str(node.get('description') or '')).strip()
    offers = node.get('offers')
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    if not isinstance(offers, dict):
        offers = {}

    image = node.get('image')
    image_list = [i for i in image if isinstance(i, str)] if isinstance(image, list) else ([image] if isinstance(image, str) else [])
    image_url = image_list[0] if image_list else ''

    price = parse_price(offers.get('price') or node.get('price'))
    currency = str(offers.get('priceCurrency') or node.get('priceCurrency') or 'USD')
    availability = normalize_availability(offers.get('availability') or node.get('availability'))
    product_url = str(node.get('url') or '')
    canonical_product_url = urljoin(page.final_url, product_url) if product_url else canonical_url

    if not title:
        validation_errors.append('missing title')
    if price <= 0:
        validation_errors.append('missing or invalid price')
    if not currency:
        validation_errors.append('missing currency')
    if not canonical_product_url:
        validation_errors.append('missing canonical product url')
    if seed['retailer_name'] == '':
        validation_errors.append('missing retailer name')

    if canonical_product_url:
        canonical_host = urlparse(canonical_product_url).hostname
        if not canonical_host:
            validation_errors.append('canonical URL is invalid')

    image_ok, image_error = check_image_url(image_url)
    if not image_ok:
        validation_errors.append(f'image validation failed ({image_error})')

    relevance_text = f"{title} {description} {seed['category_hint']} {seed['age_hint']}"
    if not relevance(relevance_text):
        validation_errors.append('failed relevance rules')

    if validation_errors:
        return None, {
            'seed_url': source_url,
            'retailer_name': seed['retailer_name'],
            'canonical_product_url': canonical_product_url,
            'image_url': image_url,
            'errors': validation_errors,
        }

    sizes = node.get('size')
    if isinstance(sizes, list):
        normalized_sizes = [str(size) for size in sizes]
    elif sizes:
        normalized_sizes = [str(sizes)]
    else:
        normalized_sizes = []

    style_tags = infer_style_tags(relevance_text, list(seed['tags']))
    category = normalize_category(seed['category_hint'], relevance_text)

    signature = hashlib.sha1(f"{seed['retailer_name']}:{title}:{canonical_product_url}".encode()).hexdigest()
    product = Product(
        id=hashlib.sha1(canonical_product_url.encode()).hexdigest()[:12],
        slug=slugify(f"{seed['brand']}-{title}"),
        title=title,
        brand=seed['brand'],
        retailer_name=seed['retailer_name'],
        retailer_domain=urlparse(canonical_product_url).hostname or '',
        source_product_url=source_url,
        canonical_product_url=canonical_product_url,
        image_url=image_url,
        additional_images=image_list[1:6],
        current_price=price,
        original_price=parse_price(offers.get('highPrice')) or None,
        currency=currency,
        availability=availability,
        category=category,
        age_range=seed['age_hint'],
        sizes=normalized_sizes,
        style_tags=style_tags,
        gender=seed.get('gender'),
        description_short=description[:180],
        last_checked_at=now,
        is_active=True,
        validation_status='passed',
        validation_errors=[],
        source_adapter=seed.get('source_adapter', 'unknown'),
        product_signature=signature,
        featured_score=feature_score(style_tags, title),
        recently_updated=True,
    )
    return product, {}


def dedupe_products(products: list[Product]) -> list[dict[str, Any]]:
    by_signature: dict[str, Product] = {}
    for product in products:
        existing = by_signature.get(product.product_signature)
        if not existing or product.featured_score > existing.featured_score:
            by_signature[product.product_signature] = product
    return sorted((asdict(product) for product in by_signature.values()), key=lambda item: item['featured_score'], reverse=True)


def build_payload() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    now = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'
    products: list[Product] = []
    rejected: list[dict[str, Any]] = []
    source_statuses: list[dict[str, Any]] = []
    warnings: list[str] = []

    for seed in SEEDS:
        if not seed.get('enabled', True):
            source_statuses.append({'retailer_name': seed['retailer_name'], 'seed_url': seed['url'], 'status': 'disabled'})
            continue

        product, reject_record = validate_seed(seed, now)
        if product:
            products.append(product)
            source_statuses.append({'retailer_name': seed['retailer_name'], 'seed_url': seed['url'], 'status': 'passed'})
        else:
            rejected.append({
                **reject_record,
                'last_checked_at': now,
                'is_active': False,
                'validation_status': 'failed',
                'source_adapter': seed.get('source_adapter', 'unknown'),
            })
            source_statuses.append({
                'retailer_name': seed['retailer_name'],
                'seed_url': seed['url'],
                'status': 'failed',
                'error': '; '.join(reject_record.get('errors', [])),
            })
            warnings.append(f"Rejected {seed['retailer_name']} product {seed['url']}: {'; '.join(reject_record.get('errors', []))}")

    normalized_products = dedupe_products(products)

    payload = {
        'generated_at': now,
        'product_count': len(normalized_products),
        'products': normalized_products,
        'sources': source_statuses,
        'warnings': warnings,
        'publish_rules': {
            'requires_is_active': True,
            'requires_validation_status': 'passed',
        },
    }
    return payload, rejected


def validate_existing_catalog(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding='utf-8'))
    products = payload.get('products', []) if isinstance(payload, dict) else []
    checked: list[dict[str, Any]] = []
    for product in products:
        url_ok = False
        image_ok = False
        reason: list[str] = []
        try:
            response = fetch_url(product['canonical_product_url'])
            url_ok = response.status_code < 400 and is_probable_product_page(response.final_url, response.body)
        except Exception as error:
            reason.append(f'url failed: {error}')
        try:
            image_ok, image_error = check_image_url(product.get('image_url', ''))
            if image_error:
                reason.append(f'image failed: {image_error}')
        except Exception as error:
            reason.append(f'image failed: {error}')

        checked.append({
            'id': product.get('id'),
            'title': product.get('title'),
            'canonical_product_url': product.get('canonical_product_url'),
            'image_url': product.get('image_url'),
            'url_ok': url_ok,
            'image_ok': image_ok,
            'is_active': bool(url_ok and image_ok),
            'errors': reason,
        })

    return {
        'checked_at': datetime.datetime.utcnow().replace(microsecond=0).isoformat() + 'Z',
        'product_count': len(checked),
        'passed': sum(1 for item in checked if item['is_active']),
        'failed': sum(1 for item in checked if not item['is_active']),
        'products': checked,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Refresh and validate Tiny Thrash Threads product data.')
    sub = parser.add_subparsers(dest='command')
    sub.add_parser('refresh', help='Fetch live product data and publish only validated products.')

    validate_parser = sub.add_parser('validate', help='Validate an existing generated catalog file.')
    validate_parser.add_argument('--path', default=str(OUTPUT_PATH), help='Path to generated catalog JSON file')

    args = parser.parse_args()
    command = args.command or 'refresh'

    if command == 'validate':
        report = validate_existing_catalog(Path(args.path))
        print(json.dumps(report, indent=2))
        return

    payload, rejected = build_payload()
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    REJECTED_PATH.write_text(json.dumps({'generated_at': payload['generated_at'], 'rejected': rejected}, indent=2), encoding='utf-8')

    print(f"Wrote {payload['product_count']} validated products to {OUTPUT_PATH}")
    print(f"Wrote {len(rejected)} rejected candidates to {REJECTED_PATH}")


if __name__ == '__main__':
    main()
