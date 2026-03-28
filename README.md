# Tiny Thrash Threads

Tiny Thrash Threads is a curated shopping aggregator focused on infant and toddler punk/surf/skate clothing and accessories. The site does **not** handle checkout; every product links directly to a retailer product detail page.

## Architecture

- `index.html` + `src/main.js`: hash-routed frontend with product cards/detail/filtering.
- `styles/main.css`: visual styles.
- `src/model.js`: filter and sort logic.
- `scripts/refresh_data.py`: product ingestion + validation + normalization + publish gating.
- `data/products.generated.json`: published catalog (active + validated only).
- `data/products.rejected.json`: debug artifact of rejected candidates and reasons.
- `tests/test_model.py`: unit tests for normalization and validation helpers.

## Validated source pipeline

`refresh_data.py` now publishes products only when all active-product checks pass:

1. Fetch source product URL and follow redirects.
2. Verify final response is successful HTML and still looks like a product detail page.
3. Parse canonical URL and Product JSON-LD metadata.
4. Extract required fields (`title`, `brand`, `retailer`, `price`, `currency`, `availability`, `image`, `canonical_product_url`).
5. Validate primary image URL is live and serves image content.
6. Reject candidates that fail validation and write failure reasons to `data/products.rejected.json`.
7. Publish only products with:
   - `is_active: true`
   - `validation_status: "passed"`

No fallback snapshots are published into the visible catalog.

## Data schema (published products)

Each product includes:

- `id`, `slug`
- `title`, `brand`
- `retailer_name`, `retailer_domain`
- `source_product_url`, `canonical_product_url`
- `image_url`, `additional_images`
- `current_price`, `original_price`, `currency`
- `availability`
- `category`, `age_range`, `sizes`, `style_tags`, `gender`
- `last_checked_at`
- `is_active`, `validation_status`, `validation_errors`
- `source_adapter`, `product_signature`

## Refresh + validation commands

```bash
# Refresh from live sources and publish only validated products
python3 scripts/refresh_data.py refresh

# Validate an existing generated catalog
python3 scripts/refresh_data.py validate --path data/products.generated.json

# Run unit tests
python3 -m unittest tests/test_model.py
```

## Frontend publish gating

At runtime, the frontend applies an additional safety filter and renders only products where:

- `is_active === true`
- `validation_status === 'passed'`

Product cards/detail views show price, retailer attribution, and direct outbound link to the canonical retailer PDP.

## Current limitations

- Some retailer domains may block automated validation traffic in restricted execution environments.
- When validation cannot confirm a candidate (blocked page, missing product metadata, bad image, missing price), it is excluded from the published catalog by design.
