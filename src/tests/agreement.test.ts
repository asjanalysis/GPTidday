import { describe, expect, it } from 'vitest';
import { waveAgreement } from '../utils/agreement';
import { isStale } from '../utils/time';

describe('source agreement', () => {
  it('rates close observed and modeled wave data as good', () => {
    const result = waveAgreement(
      { source: 'NDBC', stationId: '46240', observedAt: new Date().toISOString(), waveHeightFt: 3.2, dominantPeriodSec: 11, meanWaveDirectionDeg: 292 },
      { time: new Date().toISOString(), waveHeightFt: 3.5, wavePeriodSec: 10, waveDirectionDeg: 290 },
    );
    expect(result.status).toBe('good');
    expect(result.detail).toContain('46240');
  });
});

describe('stale data detection', () => {
  it('marks observations beyond the threshold as stale', () => {
    expect(isStale('2026-06-08T10:00:00Z', 120, +new Date('2026-06-08T12:01:00Z'))).toBe(true);
    expect(isStale('2026-06-08T10:30:00Z', 120, +new Date('2026-06-08T12:00:00Z'))).toBe(false);
  });
});
