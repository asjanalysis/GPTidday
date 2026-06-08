import { describe, expect, it } from 'vitest';
import { parseNdbcText } from '../data/sources/ndbc';

const sample = `#YY  MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP
#yr  mo dy hr mn degT m/s  m/s m    sec sec degT hPa  degC degC
2026 06 08 14 20 280  4.1  MM  1.2  11  7.2 295 1014 15.2 13.5`;

describe('NDBC parser', () => {
  it('parses latest observation and converts values', () => {
    const result = parseNdbcText(sample, '46240');
    expect(result.stationId).toBe('46240');
    expect(result.observedAt).toBe('2026-06-08T14:20:00.000Z');
    expect(result.waveHeightFt).toBe(3.9);
    expect(result.dominantPeriodSec).toBe(11);
    expect(result.meanWaveDirectionDeg).toBe(295);
    expect(result.windSpeedMph).toBe(9.2);
    expect(result.seaTempF).toBe(56.3);
  });
  it('treats MM as missing', () => {
    const result = parseNdbcText(sample.replace('1.2  11', 'MM   MM'), '46240');
    expect(result.waveHeightFt).toBeUndefined();
    expect(result.dominantPeriodSec).toBeUndefined();
  });
});
