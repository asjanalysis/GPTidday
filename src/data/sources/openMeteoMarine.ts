import { LOCATION } from '../../config';
import type { MarineForecast, MarineForecastHour } from '../../types';
import { fetchJson } from '../../utils/cache';
import { metersToFeet, round } from '../../utils/units';

type MarineResponse = { hourly: Record<string, Array<number | string | null>> };

export async function fetchMarineForecast(signal?: AbortSignal): Promise<MarineForecast> {
  const fields = ['wave_height', 'wave_direction', 'wave_period', 'swell_wave_height', 'swell_wave_direction', 'swell_wave_period', 'wind_wave_height', 'wind_wave_direction', 'wind_wave_period'];
  const params = new URLSearchParams({ latitude: String(LOCATION.latitude), longitude: String(LOCATION.longitude), hourly: fields.join(','), timezone: 'GMT', forecast_days: '3' });
  const data = await fetchJson<MarineResponse>(`https://marine-api.open-meteo.com/v1/marine?${params}`, signal);
  const value = (key: string, i: number) => typeof data.hourly[key]?.[i] === 'number' ? data.hourly[key][i] as number : undefined;
  const hours: MarineForecastHour[] = (data.hourly.time ?? []).map((time, i) => ({
    time: `${String(time)}Z`, waveHeightFt: round(metersToFeet(value('wave_height', i)), 1), wavePeriodSec: value('wave_period', i), waveDirectionDeg: value('wave_direction', i),
    swellHeightFt: round(metersToFeet(value('swell_wave_height', i)), 1), swellPeriodSec: value('swell_wave_period', i), swellDirectionDeg: value('swell_wave_direction', i),
    windWaveHeightFt: round(metersToFeet(value('wind_wave_height', i)), 1),
  }));
  return { source: 'Open-Meteo Marine', fetchedAt: new Date().toISOString(), hourly: hours };
}
