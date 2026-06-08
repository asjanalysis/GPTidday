import { describe, expect, it } from 'vitest';
import { tidePhase } from '../utils/time';

const points = [
  { time: '2026-06-08T10:00:00Z', heightFt: 1 },
  { time: '2026-06-08T11:00:00Z', heightFt: 3 },
  { time: '2026-06-08T12:00:00Z', heightFt: 2 },
];

describe('tide phase', () => {
  it('interpolates a rising tide', () => {
    const result = tidePhase(points, new Date('2026-06-08T10:30:00Z'));
    expect(result.trend).toBe('rising');
    expect(result.currentHeightFt).toBe(2);
  });
  it('detects falling tide', () => {
    expect(tidePhase(points, new Date('2026-06-08T11:30:00Z')).trend).toBe('falling');
  });
});
