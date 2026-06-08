import type { TidePoint } from '../types';
import { LOCATION } from '../config';

export const pacificDateKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: LOCATION.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date).replaceAll('-', '');

export function pacificDateRange(days = 2) {
  const begin = new Date();
  const end = new Date(Date.now() + (days - 1) * 86_400_000);
  return { begin: pacificDateKey(begin), end: pacificDateKey(end) };
}

export const formatTime = (iso?: string, options?: Intl.DateTimeFormatOptions) => iso ? new Intl.DateTimeFormat('en-US', {
  timeZone: LOCATION.timeZone, hour: 'numeric', minute: '2-digit', ...options,
}).format(new Date(iso)) : '—';

export const formatDateTime = (iso?: string) => iso ? new Intl.DateTimeFormat('en-US', {
  timeZone: LOCATION.timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(iso)) : 'Unavailable';

export const dataAgeMinutes = (iso?: string, now = Date.now()) => iso ? Math.max(0, (now - new Date(iso).getTime()) / 60_000) : Infinity;
export const isStale = (iso?: string, thresholdMinutes = 120, now = Date.now()) => dataAgeMinutes(iso, now) > thresholdMinutes;

export function tidePhase(points: TidePoint[], now = new Date()) {
  const sorted = [...points].sort((a, b) => +new Date(a.time) - +new Date(b.time));
  if (sorted.length < 2) return { trend: 'unknown' as const, label: 'Tide unavailable', currentHeightFt: undefined };
  const index = sorted.findIndex(point => +new Date(point.time) >= +now);
  const nextIndex = index < 1 ? 1 : index;
  const before = sorted[nextIndex - 1];
  const after = sorted[nextIndex] ?? sorted.at(-1)!;
  const span = +new Date(after.time) - +new Date(before.time);
  const ratio = span > 0 ? Math.min(1, Math.max(0, (+now - +new Date(before.time)) / span)) : 0;
  const currentHeightFt = before.heightFt + (after.heightFt - before.heightFt) * ratio;
  const trend = after.heightFt >= before.heightFt ? 'rising' as const : 'falling' as const;
  return { trend, label: `${trend === 'rising' ? 'Rising' : 'Falling'} · ${currentHeightFt.toFixed(1)} ft`, currentHeightFt };
}
