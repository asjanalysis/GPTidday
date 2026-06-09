import { describe, expect, it } from 'vitest';
import { isBuoy, isMarine, isTides, isWeather } from '../utils/validation';

describe('cached source validation', () => {
  it('rejects nested tide values that would crash numeric rendering', () => {
    expect(isTides({
      source: 'NOAA CO-OPS', stationId: '9413745', fetchedAt: new Date().toISOString(),
      points: [{ time: new Date().toISOString(), heightFt: 2.1 }],
      extremes: [{ time: new Date().toISOString(), heightFt: 'high', type: 'H' }],
    })).toBe(false);
  });

  it('rejects invalid dates and nonnumeric measurements in every source shape', () => {
    expect(isBuoy({ source: 'NOAA NDBC', stationId: '46240', observedAt: 'invalid', waveHeightFt: 3 })).toBe(false);
    expect(isMarine({ source: 'Open-Meteo Marine', fetchedAt: new Date().toISOString(), hourly: [{ time: 'invalid' }] })).toBe(false);
    expect(isWeather({ source: 'NWS', observedAt: new Date().toISOString(), alerts: [], hourly: [{ time: new Date().toISOString(), windSpeedMph: 'fast' }] })).toBe(false);
  });
});
