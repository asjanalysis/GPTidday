import { LOCATION } from '../../config';
import type { Alert, WeatherHour, WeatherSnapshot } from '../../types';
import { cardinalToDegrees, kmhToMph, round } from '../../utils/units';
import { fetchJson } from '../../utils/cache';

type NwsPoints = { properties: { forecast: string; forecastHourly: string; observationStations: string } };
type NwsPeriod = { startTime: string; temperature: number; temperatureUnit: string; probabilityOfPrecipitation?: { value: number | null }; windSpeed: string; windDirection: string; shortForecast: string };
type NwsForecast = { properties: { updated: string; periods: NwsPeriod[] } };
type NwsStations = { observationStations: string[]; features?: { id: string }[] };
type NwsObservation = { properties: { timestamp: string; textDescription: string; temperature: { value: number | null }; windSpeed: { value: number | null }; windGust: { value: number | null }; windDirection: { value: number | null } } };
type NwsAlerts = { features: { id: string; properties: { event: string; severity: string; headline?: string; description?: string; instruction?: string; ends?: string; uri?: string } }[] };

function windMph(text: string) {
  const values = [...text.matchAll(/\d+/g)].map(match => Number(match[0]));
  return values.length ? Math.max(...values) : undefined;
}

export async function fetchNwsWeather(signal?: AbortSignal): Promise<WeatherSnapshot> {
  const point = await fetchJson<NwsPoints>(`https://api.weather.gov/points/${LOCATION.latitude},${LOCATION.longitude}`, signal);
  const [hourly, daily, stations, alerts] = await Promise.all([
    fetchJson<NwsForecast>(point.properties.forecastHourly, signal),
    fetchJson<NwsForecast>(point.properties.forecast, signal),
    fetchJson<NwsStations>(point.properties.observationStations, signal),
    fetchJson<NwsAlerts>(`https://api.weather.gov/alerts/active?point=${LOCATION.latitude},${LOCATION.longitude}`, signal),
  ]);
  const stationUrl = stations.observationStations?.[0] ?? stations.features?.[0]?.id;
  let observation: NwsObservation | undefined;
  if (stationUrl) {
    try { observation = await fetchJson<NwsObservation>(`${stationUrl}/observations/latest`, signal); } catch { /* Forecast remains useful. */ }
  }
  const hours: WeatherHour[] = hourly.properties.periods.slice(0, 48).map(period => ({
    time: period.startTime,
    tempF: period.temperatureUnit === 'F' ? period.temperature : round(period.temperature * 9 / 5 + 32),
    precipitationChance: period.probabilityOfPrecipitation?.value ?? undefined,
    windSpeedMph: windMph(period.windSpeed),
    windDirectionCardinal: period.windDirection,
    windDirectionDeg: cardinalToDegrees(period.windDirection),
    condition: period.shortForecast,
  }));
  const props = observation?.properties;
  const alertItems: Alert[] = alerts.features.map(feature => ({ id: feature.id, ...feature.properties, url: feature.properties.uri }));
  return {
    source: 'National Weather Service',
    observedAt: props?.timestamp ?? hourly.properties.updated,
    airTempF: props?.temperature.value == null ? hours[0]?.tempF : round(props.temperature.value * 9 / 5 + 32),
    windSpeedMph: props?.windSpeed.value == null ? hours[0]?.windSpeedMph : round(kmhToMph(props.windSpeed.value), 1),
    windGustMph: props?.windGust.value == null ? undefined : round(kmhToMph(props.windGust.value), 1),
    windDirectionDeg: props?.windDirection.value ?? hours[0]?.windDirectionDeg,
    windDirectionCardinal: hours[0]?.windDirectionCardinal,
    condition: props?.textDescription || hours[0]?.condition,
    alerts: alertItems,
    hourly: hours,
    marineSummary: daily.properties.periods.slice(0, 2).map(period => `${period.shortForecast}; ${period.windSpeed} ${period.windDirection}`).join(' · '),
  };
}
