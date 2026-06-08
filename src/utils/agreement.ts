import type { Agreement, MarineForecastHour, WaveObservation, WeatherSnapshot } from '../types';
import { degreesToCardinal } from './units';
import { isStale } from './time';

const diff = (a?: number, b?: number) => a == null || b == null ? Infinity : Math.abs(a - b);
export function waveAgreement(observation?: WaveObservation, forecast?: MarineForecastHour): Agreement {
  if (!observation || !forecast) return { label: 'Wave model vs buoy', status: 'poor', detail: 'One or both wave sources are unavailable.' };
  if (isStale(observation.observedAt)) return { label: 'Wave model vs buoy', status: 'poor', detail: `Buoy ${observation.stationId} is stale, so model confidence is low.` };
  const heightDiff = diff(observation.waveHeightFt, forecast.waveHeightFt);
  const periodDiff = diff(observation.dominantPeriodSec, forecast.wavePeriodSec);
  const status = heightDiff <= 1 && periodDiff <= 2 ? 'good' : heightDiff <= 2 || periodDiff <= 4 ? 'minor' : 'poor';
  return { label: 'Wave model vs buoy', status, detail: `Buoy ${observation.stationId} reports ${observation.waveHeightFt ?? '—'} ft @ ${observation.dominantPeriodSec ?? '—'}s from ${degreesToCardinal(observation.meanWaveDirectionDeg) ?? '—'}; model forecasts ${forecast.waveHeightFt ?? '—'} ft @ ${forecast.wavePeriodSec ?? '—'}s from ${degreesToCardinal(forecast.waveDirectionDeg) ?? '—'}.` };
}
export function windAgreement(weather?: WeatherSnapshot, observation?: WaveObservation): Agreement {
  if (!weather || !observation || weather.windSpeedMph == null || observation.windSpeedMph == null) return { label: 'Forecast vs observed wind', status: 'minor', detail: 'Not enough colocated wind data for a reliable comparison.' };
  const delta = Math.abs(weather.windSpeedMph - observation.windSpeedMph);
  return { label: 'Forecast vs observed wind', status: delta <= 5 ? 'good' : delta <= 10 ? 'minor' : 'poor', detail: `NWS reports ${weather.windSpeedMph.toFixed(0)} mph; buoy ${observation.stationId} reports ${observation.windSpeedMph.toFixed(0)} mph (${delta.toFixed(0)} mph difference).` };
}
