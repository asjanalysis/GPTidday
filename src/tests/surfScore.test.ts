import { describe, expect, it } from 'vitest';
import { calculateSurfScore } from '../utils/surfScore';

describe('surf score', () => {
  it('rewards clean, useful surf', () => {
    const result = calculateSurfScore({ waveHeightFt: 3, periodSec: 12, windSpeedMph: 3, windDirectionDeg: 60, tideTrend: 'rising', tideHeightFt: 3, confidence: 'high' });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.reasons).toContain('+ Light wind');
    expect(result.reasons).toContain('+ Rising tide');
  });
  it('strongly penalizes active hazards and stale data', () => {
    const result = calculateSurfScore({ waveHeightFt: 3, periodSec: 12, windSpeedMph: 3, tideTrend: 'rising', tideHeightFt: 3, hazards: 1, stale: true, confidence: 'low' });
    expect(result.score).toBeLessThan(50);
    expect(result.reasons[0]).toBe('− Active coastal hazard');
  });
});
