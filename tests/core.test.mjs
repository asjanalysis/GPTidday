import test from 'node:test';
import assert from 'node:assert/strict';
import { soundCloudUrl, safeArtwork, formatTime, readSettings } from '../core.mjs';

test('SoundCloud link validation keeps only supported, safe destinations', () => {
  assert.equal(soundCloudUrl('https://soundcloud.com/artist/track?utm_source=clipboard&si=test'), 'https://soundcloud.com/artist/track');
  assert.equal(soundCloudUrl('http://www.soundcloud.com/artist/sets/playlist'), 'https://soundcloud.com/artist/sets/playlist');
  assert.equal(soundCloudUrl('https://on.soundcloud.com/AbCdE'), 'https://on.soundcloud.com/AbCdE');
  assert.equal(soundCloudUrl('https://m.soundcloud.com/a/b?secret_token=s-example'), 'https://soundcloud.com/a/b?secret_token=s-example');
  for (const bad of ['javascript:alert(1)', 'https://soundcloud.com.evil.com/a/b', 'https://evil.com/soundcloud.com/a/b', 'https://evil@soundcloud.com/a/b', 'https://soundcloud.com:4433/a/b', 'https://soundcloud.com', 'https://soundcloud.com/artist', 'https://on.soundcloud.com', 'nonsense']) assert.equal(soundCloudUrl(bad), null, bad);
});
test('artwork permits only HTTPS SoundCloud image hosts', () => {
  assert.equal(safeArtwork('https://i1.sndcdn.com/example.jpg'), 'https://i1.sndcdn.com/example.jpg');
  for (const bad of ['http://i1.sndcdn.com/a', 'https://sndcdn.com.evil.test/a', 'data:image/svg+xml,foo', undefined]) assert.equal(safeArtwork(bad), null);
});
test('time display handles unknown durations and long tracks', () => {
  assert.equal(formatTime(61.9), '1:01');assert.equal(formatTime(3605), '60:05');
  for (const value of [NaN, Infinity, -10, undefined]) assert.equal(formatTime(value), '0:00');
});
test('saved settings cannot break the renderer', () => {
  const settings = readSettings({ getItem: () => JSON.stringify({ preset: '__proto__', palette: 'missing', intensity: -500, speed: 900, volume: 0 }) });
  assert.deepEqual(settings, { preset: 'photon', palette: 'aurora', intensity: 10, speed: 100, volume: 0 });
  assert.equal(readSettings({ getItem: () => '{broken' }).volume, 75);
  assert.equal(readSettings({ getItem() { throw new Error('denied'); } }).preset, 'photon');
});
