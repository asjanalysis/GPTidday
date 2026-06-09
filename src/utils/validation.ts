import type { Alert, MarineForecast, MarineForecastHour, TideData, TidePoint, WaveObservation, WeatherHour, WeatherSnapshot } from '../types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isOptionalString = (value: unknown): value is string | undefined => value === undefined || isString(value);
const isOptionalFiniteNumber = (value: unknown): value is number | undefined => value === undefined || (typeof value === 'number' && Number.isFinite(value));
const isDateString = (value: unknown): value is string => isString(value) && Number.isFinite(Date.parse(value));

const isAlert = (value: unknown): value is Alert => isRecord(value)
  && isString(value.id)
  && isString(value.event)
  && isOptionalString(value.severity)
  && isOptionalString(value.headline)
  && isOptionalString(value.description)
  && isOptionalString(value.instruction)
  && (value.ends === undefined || isDateString(value.ends))
  && isOptionalString(value.url);

const isWeatherHour = (value: unknown): value is WeatherHour => isRecord(value)
  && isDateString(value.time)
  && isOptionalFiniteNumber(value.tempF)
  && isOptionalFiniteNumber(value.precipitationChance)
  && isOptionalFiniteNumber(value.windSpeedMph)
  && isOptionalFiniteNumber(value.windGustMph)
  && isOptionalFiniteNumber(value.windDirectionDeg)
  && isOptionalString(value.windDirectionCardinal)
  && isOptionalString(value.condition);

export const isWeather = (value: unknown): value is WeatherSnapshot => isRecord(value)
  && isString(value.source)
  && isDateString(value.observedAt)
  && isOptionalFiniteNumber(value.airTempF)
  && isOptionalFiniteNumber(value.windSpeedMph)
  && isOptionalFiniteNumber(value.windGustMph)
  && isOptionalFiniteNumber(value.windDirectionDeg)
  && isOptionalString(value.windDirectionCardinal)
  && isOptionalString(value.condition)
  && Array.isArray(value.alerts) && value.alerts.every(isAlert)
  && Array.isArray(value.hourly) && value.hourly.every(isWeatherHour)
  && isOptionalString(value.marineSummary);

const isTidePoint = (value: unknown): value is TidePoint => isRecord(value)
  && isDateString(value.time)
  && typeof value.heightFt === 'number' && Number.isFinite(value.heightFt)
  && (value.type === undefined || value.type === 'H' || value.type === 'L');

export const isTides = (value: unknown): value is TideData => isRecord(value)
  && isString(value.source)
  && isString(value.stationId)
  && Array.isArray(value.points) && value.points.every(isTidePoint)
  && Array.isArray(value.extremes) && value.extremes.every(isTidePoint)
  && isDateString(value.fetchedAt);

const isMarineHour = (value: unknown): value is MarineForecastHour => isRecord(value)
  && isDateString(value.time)
  && isOptionalFiniteNumber(value.waveHeightFt)
  && isOptionalFiniteNumber(value.wavePeriodSec)
  && isOptionalFiniteNumber(value.waveDirectionDeg)
  && isOptionalFiniteNumber(value.swellHeightFt)
  && isOptionalFiniteNumber(value.swellPeriodSec)
  && isOptionalFiniteNumber(value.swellDirectionDeg)
  && isOptionalFiniteNumber(value.windWaveHeightFt);

export const isMarine = (value: unknown): value is MarineForecast => isRecord(value)
  && isString(value.source)
  && isDateString(value.fetchedAt)
  && Array.isArray(value.hourly) && value.hourly.every(isMarineHour);

export const isBuoy = (value: unknown): value is WaveObservation => isRecord(value)
  && isString(value.source)
  && isString(value.stationId)
  && isDateString(value.observedAt)
  && isOptionalFiniteNumber(value.waveHeightFt)
  && isOptionalFiniteNumber(value.dominantPeriodSec)
  && isOptionalFiniteNumber(value.averagePeriodSec)
  && isOptionalFiniteNumber(value.meanWaveDirectionDeg)
  && isOptionalFiniteNumber(value.seaTempF)
  && isOptionalFiniteNumber(value.windSpeedMph)
  && isOptionalFiniteNumber(value.windDirectionDeg);
