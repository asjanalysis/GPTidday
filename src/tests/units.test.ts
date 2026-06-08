import { describe, expect, it } from 'vitest';
import { celsiusToFahrenheit, degreesToCardinal, metersToFeet, msToMph } from '../utils/units';

describe('unit conversions', () => {
  it('converts metric ocean and weather units', () => {
    expect(metersToFeet(1)).toBeCloseTo(3.28084, 4);
    expect(msToMph(10)).toBeCloseTo(22.3694, 3);
    expect(celsiusToFahrenheit(20)).toBe(68);
  });
  it('converts degrees to 16-point cardinal directions', () => {
    expect(degreesToCardinal(0)).toBe('N');
    expect(degreesToCardinal(292)).toBe('WNW');
    expect(degreesToCardinal(360)).toBe('N');
    expect(degreesToCardinal(undefined)).toBeUndefined();
  });
});
