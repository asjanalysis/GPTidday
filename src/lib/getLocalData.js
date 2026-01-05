const LOCAL_BASE = './public/data';
const HEADERS = {
  Accept: 'application/json',
};

async function fetchWithTimeout(url, { timeoutMs = 8000, responseType = 'json' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, cache: 'no-cache', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return responseType === 'text' ? res.text() : res.json();
  } finally {
    clearTimeout(timer);
  }
}

const toIsoFromGmtString = (value) => {
  if (!value) return null;
  const isoCandidate = `${value.replace(' ', 'T')}Z`;
  const date = new Date(isoCandidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

async function fallbackTides() {
  const today = new Date();
  const beginDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(today)
    .replace(/-/g, '');
  const predictionsUrl =
    'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=capitola-surf-app' +
    `&begin_date=${beginDate}&range=72&datum=MLLW&station=9413745&time_zone=gmt&units=english&interval=6&format=json`;
  const observationsUrl =
    'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_level&application=capitola-surf-app&date=recent&datum=MLLW&station=9413745&time_zone=gmt&units=english&format=json';

  const [predictionsResp, observationsResp] = await Promise.all([
    fetchWithTimeout(predictionsUrl).catch(() => null),
    fetchWithTimeout(observationsUrl).catch(() => null),
  ]);

  const predictions = (predictionsResp?.predictions || [])
    .map((p) => ({ t: toIsoFromGmtString(p.t), ft: Number.parseFloat(p.v) }))
    .filter((p) => p.t && Number.isFinite(p.ft));
  const observations = (observationsResp?.data || [])
    .map((o) => ({ t: toIsoFromGmtString(o.t), ft: Number.parseFloat(o.v) }))
    .filter((o) => o.t && Number.isFinite(o.ft));

  const nextExtrema = [];
  for (let i = 1; i < predictions.length - 1; i += 1) {
    const prev = predictions[i - 1];
    const curr = predictions[i];
    const next = predictions[i + 1];
    if (curr.ft > prev.ft && curr.ft > next.ft) nextExtrema.push({ type: 'HIGH', ...curr });
    if (curr.ft < prev.ft && curr.ft < next.ft) nextExtrema.push({ type: 'LOW', ...curr });
  }

  return {
    meta: { station: '9413745', name: 'Santa Cruz', datum: 'MLLW', time_zone: 'America/Los_Angeles' },
    generated_at: new Date().toISOString(),
    predictions,
    observations,
    next_extrema: nextExtrema.slice(0, 6),
  };
}

async function fallbackWaves() {
  const base = 'https://erddap.cdip.ucsd.edu/erddap/tabledap/wave_agg.json?station_id,time,waveHs,waveTp,waveTa,waveDp,waveTz,metaStationName,latitude,longitude';
  const url = `${base}&station_id=%22156%22&time%3E=now-3day&time%3C=now&waveFlagPrimary=1&orderByMax(%22time%22)`;
  const json = await fetchWithTimeout(url).catch(() => null);
  const row = json?.table?.rows?.[0];
  if (!row) return null;
  const [station_id, time, waveHs, waveTp, waveTa, waveDp, waveTz, metaStationName, latitude, longitude] = row;
  const hs_m = Number.parseFloat(waveHs);
  return {
    meta: { source: 'CDIP ERDDAP wave_agg', primary_station_id: '156', fallback_station_id: '158' },
    generated_at: new Date().toISOString(),
    latest: {
      t: new Date(time).toISOString(),
      station_id,
      station_name: metaStationName,
      hs_m,
      hs_ft: Number.isFinite(hs_m) ? hs_m * 3.28084 : null,
      tp_s: Number.isFinite(waveTp) ? Number(waveTp) : null,
      ta_s: Number.isFinite(waveTa) ? Number(waveTa) : null,
      tz_s: Number.isFinite(waveTz) ? Number(waveTz) : null,
      dp_deg_true: Number.isFinite(waveDp) ? Number(waveDp) : null,
      lat: Number.isFinite(latitude) ? Number(latitude) : null,
      lon: Number.isFinite(longitude) ? Number(longitude) : null,
    },
  };
}

async function fallbackWeather() {
  const headers = {
    'User-Agent': 'capitola-surf-app (fallback fetch)',
    Accept: 'application/geo+json',
  };
  const point = await fetchWithTimeout('https://api.weather.gov/points/36.9702284,-121.9535707', { headers }).catch(() => null);
  const hourlyUrl = point?.properties?.forecastHourly;
  const dailyUrl = point?.properties?.forecast;
  const stationUrl = point?.properties?.observationStations;
  const [hourly, daily, stations] = await Promise.all([
    hourlyUrl ? fetchWithTimeout(hourlyUrl, { headers }).catch(() => null) : null,
    dailyUrl ? fetchWithTimeout(dailyUrl, { headers }).catch(() => null) : null,
    stationUrl ? fetchWithTimeout(stationUrl, { headers }).catch(() => null) : null,
  ]);

  let current = null;
  const stationsList = stations?.features || stations?.observationStations;
  const firstStationUrl = Array.isArray(stationsList) ? stationsList[0] : null;
  if (firstStationUrl) {
    const latestObs = await fetchWithTimeout(`${firstStationUrl}/observations/latest`, { headers }).catch(() => null);
    const obs = latestObs?.properties;
    if (obs) {
      const tempC = obs.temperature?.value;
      const windMps = obs.windSpeed?.value;
      current = {
        t: obs.timestamp,
        temp_f: Number.isFinite(tempC) ? tempC * 9 / 5 + 32 : null,
        wind_mph: Number.isFinite(windMps) ? windMps * 2.23694 : null,
        wind_dir_deg: Number.isFinite(obs.windDirection?.value) ? obs.windDirection.value : null,
        text: obs.textDescription || null,
      };
    }
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

async function fetchLocalOrFallback(pathname, fallbackFn) {
  try {
    return await fetchWithTimeout(`${LOCAL_BASE}/${pathname}`);
  } catch (err) {
    if (fallbackFn) {
      console.warn(`Local fetch failed for ${pathname}; attempting live fallback`);
      return fallbackFn();
    }
    throw err;
  }
}

export async function getTides() {
  return fetchLocalOrFallback('tides.json', fallbackTides);
}

export async function getWaves() {
  return fetchLocalOrFallback('waves.json', fallbackWaves);
}

export async function getWeather() {
  return fetchLocalOrFallback('weather.json', fallbackWeather);
}
