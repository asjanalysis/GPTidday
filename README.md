# Capitola Conditions

A mobile-first, single-page surf and coastal conditions dashboard for Capitola, California. It combines official weather and tide data, nearby buoy observations, an independent marine model, and official public webcam links so users can answer one practical question: **“Is Capitola good right now?”**

## What is included

- Current weather, wind, tide phase, wave observation, water temperature, alerts, and plain-language recommendation.
- Explainable 0–100 Capitola surf score with positive and negative factors.
- NOAA CO-OPS tide curve, high/low table, and current phase estimate.
- Three NOAA NDBC buoy feeds with stale-data detection.
- Open-Meteo Marine hourly combined-wave, swell, and wind-wave forecast.
- Source agreement checks for observed/model waves and forecast/observed wind.
- NWS hourly forecast and coastal alert prioritization.
- Official City of Capitola webcam cards with honest non-embed fallback behavior.
- Independent loading/error states, local source-aware caching, and manual refresh.
- Optional allowlisted serverless proxy implementations for Vercel and Netlify.
- Unit tests for parsing, conversions, tide phase, surf scoring, source agreement, and stale data.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Public APIs are called directly by default. If a browser or deployment blocks a source because of CORS, copy `.env.example` to `.env` and run the included proxy through the target hosting platform’s local tooling.

Useful checks:

```bash
npm test
npm run lint
npm run build
npm run preview
```

## Data sources

| Purpose | Source | Adapter |
| --- | --- | --- |
| Point forecast, observations, alerts | [National Weather Service API](https://www.weather.gov/documentation/services-web-api) | `src/data/sources/nws.ts` |
| Tide predictions | [NOAA CO-OPS station 9413745](https://tidesandcurrents.noaa.gov/stationhome.html?id=9413745) | `src/data/sources/noaaCoops.ts` |
| Wave and water observations | [NOAA NDBC](https://www.ndbc.noaa.gov/) stations 46240, 46236, 46042 | `src/data/sources/ndbc.ts` |
| Marine model comparison | [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api) | `src/data/sources/openMeteoMarine.ts` |
| Public camera access | [City of Capitola Beach Web Cam](https://www.cityofcapitola.gov/851/Beach-Web-Cam) | `src/data/sources/webcams.ts` |

No paid APIs, API keys, account, tracking, or personal data storage are required.

## Caching and resilience

Client-side cache lifetimes are intentionally source-specific:

- NWS forecast and observations: 15 minutes.
- Tide predictions: 6 hours.
- NDBC buoy observations: 20 minutes.
- Open-Meteo Marine forecast: 45 minutes.

Each source request settles independently. A failed tide request does not prevent weather, buoy, marine, or webcam content from rendering. The refresh button bypasses the browser cache, while deployed proxy responses still use shared caching to avoid upstream API spam.

## Deployment

### Static hosting

Run `npm run build` and publish `dist/`. Most APIs support browser access, but NDBC text CORS behavior can vary. On a fully static host, the NDBC card may show an independent error state if direct access is blocked.

### Vercel

1. Import the repository.
2. Use build command `npm run build` and output directory `dist`.
3. Set `VITE_PROXY_BASE=/api/proxy`.
4. Deploy. `api/proxy.ts` provides an allowlisted GET-only proxy with a timeout and caching headers.

### Netlify

1. Import the repository. `netlify.toml` already specifies the build and publish settings.
2. Set `VITE_PROXY_BASE=/api/proxy`.
3. Deploy. The redirect maps to `netlify/functions/proxy.ts`.

The proxy accepts only HTTPS URLs on these hosts: `api.weather.gov`, `api.tidesandcurrents.noaa.gov`, `www.ndbc.noaa.gov`, `marine-api.open-meteo.com`, `marine.weather.gov`, and the official City of Capitola domains. It is not an open proxy.

## Configuration

### Change buoy stations

Edit `BUOY_STATIONS` in `src/config.ts`. Each entry needs an NDBC station ID and display name. The dashboard automatically fetches and displays all configured stations and prefers station 46240 when available.

### Add a webcam

Add an entry to `src/data/sources/webcams.ts` with a name, location, official public URL, and note. Only provide `embedUrl` when the owner explicitly permits embedding. Do not bypass `X-Frame-Options`, CSP, authentication, or provider controls.

### Adjust the surf score

The complete scoring model is in `src/utils/surfScore.ts`. It begins at a neutral 50 and adjusts for:

- useful wave height and period,
- light/offshore or strong/onshore wind,
- rising and mid tide,
- extreme tides,
- active coastal hazards,
- stale buoy observations, and
- disagreement among sources.

Keep adjustments transparent and update tests in `src/tests/surfScore.test.ts` when changing weights or thresholds. The score is an aid, not a surf forecast or safety guarantee.

## Known limitations

- Capitola’s bathymetry and shelter can make beach surf materially smaller than offshore buoy readings. The app therefore labels buoy and model values as contextual rather than claiming exact breaking-wave height.
- NWS point forecasts are authoritative weather guidance but are not a dedicated break-level surf model.
- NOAA tide values are predictions for Santa Cruz station 9413745, not a live Capitola water-level sensor.
- Open-Meteo is an independent model comparison source and can diverge from observations.
- Webcam providers may block framing or change their player. The app deliberately links to official camera pages instead of scraping or bypassing restrictions.
- Direct public API requests depend on upstream availability, rate limits, and browser CORS policy.
- The scoring assumptions are intentionally simple and cannot account for sandbars, crowds, kelp, local wind eddies, or a surfer’s ability.

## Safety

This dashboard is informational only. Conditions can change quickly. Check official forecasts, posted beach warnings, lifeguards, and your own skill level before entering the ocean.
