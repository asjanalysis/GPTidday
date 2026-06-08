import { TIDE_STATION } from '../../config';
import type { TideData, TidePoint } from '../../types';
import { fetchJson } from '../../utils/cache';
import { pacificDateRange } from '../../utils/time';

type CoopsResponse = { predictions?: { t: string; v: string; type?: 'H' | 'L' }[]; error?: { message: string } };

function tideUrl(interval?: 'hilo') {
  const { begin, end } = pacificDateRange(3);
  const params = new URLSearchParams({ product: 'predictions', application: 'capitola_surf_dashboard', begin_date: begin, end_date: end, datum: 'MLLW', station: TIDE_STATION, time_zone: 'gmt', units: 'english', format: 'json' });
  if (interval) params.set('interval', interval);
  return `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`;
}

const normalize = (items: CoopsResponse['predictions']): TidePoint[] => (items ?? []).map(item => ({
  time: `${item.t.replace(' ', 'T')}Z`, heightFt: Number(item.v), type: item.type,
})).filter(point => Number.isFinite(point.heightFt));

export async function fetchTides(signal?: AbortSignal): Promise<TideData> {
  const [curve, hilo] = await Promise.all([fetchJson<CoopsResponse>(tideUrl(), signal), fetchJson<CoopsResponse>(tideUrl('hilo'), signal)]);
  if (curve.error || hilo.error) throw new Error(curve.error?.message ?? hilo.error?.message);
  return { source: 'NOAA CO-OPS', stationId: TIDE_STATION, points: normalize(curve.predictions), extremes: normalize(hilo.predictions), fetchedAt: new Date().toISOString() };
}
