import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

const USER_AGENT = 'capitola-surf-app (contact: https://github.com/your-profile)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, { retries = 2, timeoutMs = 10000, headers = {}, responseType = 'json' } = {}) {
  let attempt = 0;
  let lastError;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (responseType === 'text') return res.text();
      return res.json();
    } catch (err) {
      lastError = err;
      clearTimeout(timeout);
      attempt += 1;
      if (attempt > retries) break;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

const toFeet = (meters) => (Number.isFinite(meters) ? meters * 3.28084 : null);
const toMph = (metersPerSecond) => (Number.isFinite(metersPerSecond) ? metersPerSecond * 2.23694 : null);

const toIsoFromGmtString = (value) => {
  if (!value) return null;
  const isoCandidate = `${value.replace(' ', 'T')}Z`;
  const date = new Date(isoCandidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

async function fetchTides() {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
  const beginDate = formatter.format(today).replace(/-/g, '');

  const predictionsUrl =
    'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=capitola-surf-app' +
    `&begin_date=${beginDate}&range=72&datum=MLLW&station=9413745&time_zone=gmt&units=english&interval=6&format=json`;

  const observationsUrl =
    'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_level&application=capitola-surf-app&date=recent&datum=MLLW&station=9413745&time_zone=gmt&units=english&format=json';

  const [predictionsResp, observationsResp] = await Promise.all([
    fetchWithRetry(predictionsUrl).catch((err) => ({ error: err.message })),
    fetchWithRetry(observationsUrl).catch((err) => ({ error: err.message })),
  ]);

  const predictions = (predictionsResp?.predictions || []).map((p) => ({
    t: toIsoFromGmtString(p.t),
    ft: Number.parseFloat(p.v),
  })).filter((p) => p.t && Number.isFinite(p.ft));

  const observations = (observationsResp?.data || []).map((o) => ({
    t: toIsoFromGmtString(o.t),
    ft: Number.parseFloat(o.v),
  })).filter((o) => o.t && Number.isFinite(o.ft));

  const nextExtrema = [];
  const now = Date.now();
  for (let i = 1; i < predictions.length - 1; i += 1) {
    const prev = predictions[i - 1];
    const curr = predictions[i];
    const next = predictions[i + 1];
    if (!prev || !curr || !next) continue;
    if (curr.ft > prev.ft && curr.ft > next.ft) {
      nextExtrema.push({ type: 'HIGH', ...curr });
    } else if (curr.ft < prev.ft && curr.ft < next.ft) {
      nextExtrema.push({ type: 'LOW', ...curr });
    }
  }
  const upcoming = nextExtrema.filter((e) => new Date(e.t).getTime() > now).slice(0, 6);

  return {
    meta: { station: '9413745', name: 'Santa Cruz', datum: 'MLLW', time_zone: 'America/Los_Angeles' },
    generated_at: new Date().toISOString(),
    predictions,
    observations,
    next_extrema: upcoming,
  };
}

function parseWaveRow(row) {
  const [station_id, time, waveHs, waveTp, waveTa, waveDp, waveTz, metaStationName, latitude, longitude] = row;
  const hs_m = Number.parseFloat(waveHs);
  return {
    t: new Date(time).toISOString(),
    station_id,
    station_name: metaStationName,
    hs_m: hs_m,
    hs_ft: Number.isFinite(hs_m) ? hs_m * 3.28084 : null,
    tp_s: Number.isFinite(waveTp) ? Number(waveTp) : null,
    ta_s: Number.isFinite(waveTa) ? Number(waveTa) : null,
    tz_s: Number.isFinite(waveTz) ? Number(waveTz) : null,
    dp_deg_true: Number.isFinite(waveDp) ? Number(waveDp) : null,
    lat: Number.isFinite(latitude) ? Number(latitude) : null,
    lon: Number.isFinite(longitude) ? Number(longitude) : null,
  };
}

async function fetchWaves() {
  const base = 'https://erddap.cdip.ucsd.edu/erddap/tabledap/wave_agg.json?station_id,time,waveHs,waveTp,waveTa,waveDp,waveTz,metaStationName,latitude,longitude';
  const primaryUrl = `${base}&station_id=%22156%22&time%3E=now-3day&time%3C=now&waveFlagPrimary=1&orderByMax(%22time%22)`;
  const fallbackUrl = `${base}&station_id=%22158%22&time%3E=now-3day&time%3C=now&waveFlagPrimary=1&orderByMax(%22time%22)`;

  const attempt = async (url) => {
    const json = await fetchWithRetry(url);
    const row = json?.table?.rows?.[0];
    return row ? parseWaveRow(row) : null;
  };

  let latest = null;
  let usedStation = '156';
  try {
    latest = await attempt(primaryUrl);
  } catch (err) {
    latest = null;
  }
  if (!latest) {
    usedStation = '158';
    try {
      latest = await attempt(fallbackUrl);
    } catch (err) {
      latest = null;
    }
  }

  if (!latest) {
    const ndbcText = await fetchWithRetry('https://www.ndbc.noaa.gov/data/realtime2/46236.txt', { responseType: 'text' }).catch(() => null);
    if (ndbcText) {
      const lines = ndbcText.trim().split(/\n+/).filter((line) => !line.startsWith('#'));
      const header = lines[0]?.trim().split(/\s+/) || [];
      const data = lines[1]?.trim().split(/\s+/) || [];
      const lookup = (key) => data[header.indexOf(key)];
      const timeParts = ['YY', 'MM', 'DD', 'hh', 'mm'].map((key) => lookup(key)).map((v) => Number(v));
      if (timeParts.every((v) => Number.isFinite(v))) {
        const [YY, MM, DD, hh, mm] = timeParts;
        const iso = new Date(Date.UTC(2000 + YY, MM - 1, DD, hh, mm)).toISOString();
        const hs_m = Number.parseFloat(lookup('WVHT'));
        latest = {
          t: iso,
          station_id: '46236',
          station_name: 'NDBC 46236',
          hs_m,
          hs_ft: Number.isFinite(hs_m) ? hs_m * 3.28084 : null,
          tp_s: Number.parseFloat(lookup('DPD')) || null,
          ta_s: Number.parseFloat(lookup('APD')) || null,
          tz_s: null,
          dp_deg_true: Number.parseFloat(lookup('MWD')) || null,
          lat: null,
          lon: null,
        };
      }
    }
  }

  return {
    meta: { source: 'CDIP ERDDAP wave_agg', primary_station_id: '156', fallback_station_id: '158' },
    generated_at: new Date().toISOString(),
    latest,
  };
}

function parseObservation(observation) {
  if (!observation) return null;
  const tempC = observation.temperature?.value;
  const windMps = observation.windSpeed?.value;
  return {
    t: observation.timestamp ? new Date(observation.timestamp).toISOString() : null,
    temp_f: Number.isFinite(tempC) ? tempC * 9 / 5 + 32 : null,
    wind_mph: Number.isFinite(windMps) ? toMph(windMps) : null,
    wind_dir_deg: Number.isFinite(observation.windDirection?.value) ? observation.windDirection.value : null,
    text: observation.textDescription || null,
  };
}

async function fetchWeather() {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/geo+json',
  };
  const point = await fetchWithRetry('https://api.weather.gov/points/36.9702284,-121.9535707', { headers });
  const hourlyUrl = point?.properties?.forecastHourly;
  const dailyUrl = point?.properties?.forecast;
  const stationUrl = point?.properties?.observationStations;

  const [hourly, daily, stations] = await Promise.all([
    hourlyUrl ? fetchWithRetry(hourlyUrl, { headers }) : null,
    dailyUrl ? fetchWithRetry(dailyUrl, { headers }) : null,
    stationUrl ? fetchWithRetry(stationUrl, { headers }) : null,
  ]);

  let current = null;
  const stationsList = stations?.features || stations?.observationStations || stations?.properties?.observationStations;
  const firstStationUrl = Array.isArray(stationsList) ? stationsList[0] : null;
  if (firstStationUrl) {
    const latestObs = await fetchWithRetry(`${firstStationUrl}/observations/latest`, { headers }).catch(() => null);
    current = parseObservation(latestObs?.properties);
  }

  const hourlyPeriods = Array.isArray(hourly?.properties?.periods) ? hourly.properties.periods : [];
  const dailyPeriods = Array.isArray(daily?.properties?.periods) ? daily.properties.periods : [];

  return {
    meta: { lat: 36.9702284, lon: -121.9535707, provider: 'NWS api.weather.gov' },
    generated_at: new Date().toISOString(),
    current,
    hourly: hourlyPeriods.slice(0, 24).map((p) => ({
      t: p.startTime,
      temp_f: p.temperature,
      wind_mph: Number.parseFloat(p.windSpeed),
      wind_dir: p.windDirection,
      shortForecast: p.shortForecast,
      precip_prob: Number.isFinite(p.probabilityOfPrecipitation?.value) ? p.probabilityOfPrecipitation.value : null,
    })),
    daily: dailyPeriods.map((p) => ({
      name: p.name,
      t_start: p.startTime,
      t_end: p.endTime,
      temp_f: p.temperature,
      text: p.detailedForecast || p.shortForecast,
    })),
  };
}

async function writeJson(filename, data) {
  const target = path.join(DATA_DIR, filename);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2));
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const results = { tides: null, waves: null, weather: null };

  const tasks = [
    (async () => {
      try {
        results.tides = await fetchTides();
      } catch (err) {
        console.error('Tides fetch failed', err);
        results.tides = { error: err.message, generated_at: new Date().toISOString() };
      } finally {
        if (results.tides) await writeJson('tides.json', results.tides);
      }
    })(),
    (async () => {
      try {
        results.waves = await fetchWaves();
      } catch (err) {
        console.error('Waves fetch failed', err);
        results.waves = { error: err.message, generated_at: new Date().toISOString() };
      } finally {
        if (results.waves) await writeJson('waves.json', results.waves);
      }
    })(),
    (async () => {
      try {
        results.weather = await fetchWeather();
      } catch (err) {
        console.error('Weather fetch failed', err);
        results.weather = { error: err.message, generated_at: new Date().toISOString() };
      } finally {
        if (results.weather) await writeJson('weather.json', results.weather);
      }
    })(),
  ];

  await Promise.all(tasks);
  await writeJson('summary.json', { generated_at: new Date().toISOString(), ...results });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
