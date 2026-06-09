// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../data/sources/nws', () => ({ fetchNwsWeather: vi.fn().mockRejectedValue(new Error('offline')) }));
vi.mock('../data/sources/noaaCoops', () => ({ fetchTides: vi.fn().mockRejectedValue(new Error('offline')) }));
vi.mock('../data/sources/openMeteoMarine', () => ({ fetchMarineForecast: vi.fn().mockRejectedValue(new Error('offline')) }));
vi.mock('../data/sources/ndbc', () => ({ fetchBuoy: vi.fn().mockRejectedValue(new Error('offline')) }));

beforeEach(() => {
  localStorage.clear();
});

it('keeps the dashboard visible when cached source data is malformed', async () => {
  localStorage.setItem('capitola:tides', JSON.stringify({
    value: {
      source: 'NOAA CO-OPS', stationId: '9413745', fetchedAt: new Date().toISOString(), points: [],
      extremes: [{ time: new Date().toISOString(), heightFt: 'not-a-number', type: 'H' }],
    },
    expires: Date.now() + 60_000,
  }));

  const { container } = render(<App />);

  await waitFor(() => expect(container.querySelector('button')?.textContent).toContain('Refresh'));
  expect(container.querySelector('main')).not.toBeNull();
  expect(container.textContent).toContain('Tide predictions could not be loaded');
});
