import type { WaveObservation } from '../types';
import { celsiusToFahrenheit, metersToFeet, msToMph, round } from './units';

const number = (value?: string) => !value || value === 'MM' ? undefined : Number(value);

export function parseNdbcText(text: string, stationId?: string): WaveObservation {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const headerLine = lines.find(line => /^#?(YY|YYYY)\s/.test(line));
  if (!headerLine) throw new Error('NDBC column header missing');
  const headers = headerLine.replace(/^#/, '').trim().split(/\s+/);
  const row = lines.find(line => !line.startsWith('#'))?.split(/\s+/);
  if (!row) throw new Error('NDBC observation row missing');
  const record = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
  const yearRaw = number(record.YYYY ?? record.YY);
  if (yearRaw == null) throw new Error('NDBC timestamp missing');
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const observedAt = new Date(Date.UTC(year, (number(record.MM) ?? 1) - 1, number(record.DD) ?? 1, number(record.hh) ?? 0, number(record.mm) ?? 0)).toISOString();
  return {
    source: 'NOAA NDBC', stationId, observedAt,
    waveHeightFt: round(metersToFeet(number(record.WVHT)), 1),
    dominantPeriodSec: number(record.DPD), averagePeriodSec: number(record.APD),
    meanWaveDirectionDeg: number(record.MWD),
    seaTempF: round(celsiusToFahrenheit(number(record.WTMP)), 1),
    windSpeedMph: round(msToMph(number(record.WSPD)), 1), windDirectionDeg: number(record.WDIR),
    raw: record,
  };
}
