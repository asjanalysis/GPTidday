import { useCallback, useEffect, useState } from 'react';
import { BUOY_STATIONS } from '../config';
import { fetchBuoy } from '../data/sources/ndbc';
import { fetchTides } from '../data/sources/noaaCoops';
import { fetchNwsWeather } from '../data/sources/nws';
import { fetchMarineForecast } from '../data/sources/openMeteoMarine';
import type { MarineForecast, SourceHealth, TideData, WaveObservation, WeatherSnapshot } from '../types';
import { cachedFetch } from '../utils/cache';
import { isStale } from '../utils/time';

type ConditionsState = { weather?: WeatherSnapshot; tides?: TideData; buoys: WaveObservation[]; marine?: MarineForecast; health: SourceHealth[]; loading: boolean; refreshedAt?: string };
const initial: ConditionsState = { buoys: [], health: [], loading: true };

export function useConditions() {
  const [state, setState] = useState(initial);
  const load = useCallback(async (force = false) => {
    setState(current => ({ ...current, loading: true }));
    const requests = [
      { source: 'National Weather Service', task: cachedFetch('nws', 15 * 60_000, () => fetchNwsWeather(), force) },
      { source: 'NOAA CO-OPS', task: cachedFetch('tides', 6 * 60 * 60_000, () => fetchTides(), force) },
      { source: 'Open-Meteo Marine', task: cachedFetch('marine', 45 * 60_000, () => fetchMarineForecast(), force) },
      ...BUOY_STATIONS.map(station => ({ source: `NOAA NDBC ${station.id}`, task: cachedFetch(`buoy-${station.id}`, 20 * 60_000, () => fetchBuoy(station.id), force) })),
    ];
    const results = await Promise.allSettled(requests.map(request => request.task));
    const health: SourceHealth[] = [];
    let weather: WeatherSnapshot | undefined;
    let tides: TideData | undefined;
    let marine: MarineForecast | undefined;
    const buoys: WaveObservation[] = [];
    results.forEach((result, index) => {
      const source = requests[index].source;
      if (result.status === 'rejected') { health.push({ source, status: 'error', message: result.reason instanceof Error ? result.reason.message : 'Request failed' }); return; }
      const value = result.value;
      if (source === 'National Weather Service') weather = value as WeatherSnapshot;
      else if (source === 'NOAA CO-OPS') tides = value as TideData;
      else if (source === 'Open-Meteo Marine') marine = value as MarineForecast;
      else buoys.push(value as WaveObservation);
      const updated = 'observedAt' in (value as object) ? (value as WaveObservation).observedAt : 'fetchedAt' in (value as object) ? (value as TideData).fetchedAt : undefined;
      const stale = source.includes('NDBC') && isStale(updated);
      health.push({ source, status: stale ? 'stale' : 'ok', lastUpdated: updated, message: stale ? 'Observation is over two hours old' : undefined });
    });
    setState({ weather, tides, marine, buoys, health, loading: false, refreshedAt: new Date().toISOString() });
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { ...state, refresh: () => load(true) };
}
