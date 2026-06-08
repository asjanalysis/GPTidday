import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cachedFetch } from '../utils/cache';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

describe('cachedFetch', () => {
  it('ignores malformed cached source data and replaces it', async () => {
    storage.set('capitola:tides', JSON.stringify({ value: {}, expires: Date.now() + 60_000 }));
    const fresh = { points: [], extremes: [] };
    const loader = vi.fn().mockResolvedValue(fresh);

    const result = await cachedFetch(
      'tides',
      60_000,
      loader,
      false,
      (value): value is typeof fresh => typeof value === 'object' && value !== null
        && Array.isArray((value as typeof fresh).points)
        && Array.isArray((value as typeof fresh).extremes),
    );

    expect(result).toEqual(fresh);
    expect(loader).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.get('capitola:tides')!).value).toEqual(fresh);
  });
});
