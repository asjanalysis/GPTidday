# Tiny Thrash Threads

Tiny Thrash Threads is a curated shopping aggregator focused on infant and toddler punk/surf/skate clothing and accessories. The site does **not** handle checkout; every product links directly to the source retailer page.

## Architecture

This repository is implemented as a static web app with a build-time data ingestion pipeline:

- `index.html` + `src/main.js`: hash-routed SPA-like experience.
- `src/model.js`: filtering, sorting, and curation utilities.
- `scripts/refresh_data.py`: source ingestion and normalization pipeline.
- `data/products.generated.json`: generated product catalog for the frontend.
- `tests/test_model.py`: unit tests for normalization/curation logic.

## Features

- Homepage with hero, curated collections, and trending products.
- Browse page with search + filters:
  - age range
  - category
  - brand
  - retailer/source
  - style tags
  - gender (when source metadata supports it)
- Sorting:
  - featured/curated
  - newest
  - price low→high
  - price high→low
  - recently updated
- Product detail route emphasizing source attribution and outbound retailer link.
- Favorites page backed by `localStorage`.
- About/methodology page with generated data freshness timestamp.
- Outbound click tracking hook via `CustomEvent('outbound_product_click', ...)`.

## Data model

Normalized product schema fields include:

- `id`, `slug`, `product_hash`
- `title`, `description_short`, `brand`
- `retailer_name`, `retailer_domain`, `source_product_url`, `source_type`
- `image_url`, `additional_images`
- `current_price`, `original_price`, `currency`
- `age_range`, `sizes`, `gender`
- `category`, `style_tags`
- `availability`, `last_checked_at`
- `featured_score`, `recently_updated`

## Ingestion and adapters

Seeded adapters (in `scripts/refresh_data.py`) currently target curated product pages from:

- Vans
- Quiksilver
- O'Neill

Pipeline steps:

1. Fetch public product pages.
2. Parse `application/ld+json` Product metadata.
3. Normalize fields into the shared schema.
4. Apply curation logic:
   - include/exclude keywords
   - style-tag inference
   - category normalization
   - age-targeted hints
5. Deduplicate with `product_hash`.
6. Write `data/products.generated.json`.

## Refresh product data

```bash
python3 scripts/refresh_data.py
```

This command is cron/scheduler-ready and safe to run repeatedly.

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Test

```bash
python3 -m unittest tests/test_model.py
```

## Operational notes & limitations

- Source sites may change their markup/JSON-LD structure.
- Prices/availability can drift quickly; always rely on outbound retailer page as ground truth.
- The current starter adapters use a curated set of source URLs and can be extended by adding seeds.
- No anti-bot/authentication bypass behavior is implemented.
