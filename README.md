# Surf Capitola Mockup

A multi-page, static web recreation of the Capitola surf app mockup. Each page mirrors one of the reference screens, from the welcome hero to surf reports, hourly outlooks, exploration pins, and event picks.

## Pages
- **index.html** – Welcome splash with hero actions and two preview cards.
- **report.html** – Capitola surf report, tide snapshot, and camera list.
- **hourly.html** – Hourly temperature bars and tide progression.
- **explore.html** – Map-inspired pins plus neighborhoods and restaurants.
- **events.html** – Local events with personalized water and dining recommendations.

## Usage
Open any page directly in your browser, or serve the folder locally (for example, `python -m http.server 8000`) and browse to the file you want. All styling lives in `styles.css`.

## Live data layer

The app now pulls normalized JSON from free, no-login sources and stores them in `public/data/` via a scheduled GitHub Action (every 5 minutes).

- **Tides / water levels:** NOAA CO-OPS station **9413745** (Santa Cruz, Monterey Bay). Predictions are 6-minute interval MLLW heights with next extrema; observations use the last 72 hours of water level data.
- **Waves:** CDIP ERDDAP `wave_agg` with primary station **156 (Monterey Canyon Outer)** and fallback station **158 (Cabrillo Point Nearshore)**. If both are down, the script falls back to NDBC realtime text for buoy **46236**.
- **Weather:** NWS `api.weather.gov` for the Capitola Fishing Wharf point (**36.9702284, -121.9535707**), including hourly/daily forecasts and latest observations.

To change locations or stations, update the URLs and station IDs inside `scripts/refreshData.mjs` and the optional client fallback logic in `src/lib/getLocalData.js`. The GitHub Action (`.github/workflows/refresh-ocean-data.yml`) will commit fresh JSON snapshots automatically with the message `chore: refresh ocean data [skip ci]`.
