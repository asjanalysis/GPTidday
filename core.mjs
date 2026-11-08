export const PRESETS = {
  photon: { name: 'Photon field', number: '01', title: 'Let sound\ntake shape.' },
  spectrum: { name: 'Frequency garden', number: '02', title: 'Every frequency.\nIn full color.' },
  tunnel: { name: 'Wormhole', number: '03', title: 'Go a little\nfurther out.' },
  scope: { name: 'Oscilloscope', number: '04', title: 'Follow the\nwaveform.' },
};
export const PALETTES = {
  aurora: { name: 'Aurora', hue: 162, spread: 55 },
  ember: { name: 'Ember', hue: 25, spread: -50 },
  violet: { name: 'Violet', hue: 265, spread: 65 },
  ice: { name: 'Ice', hue: 185, spread: 25 },
};
export const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
export function formatTime(seconds) {
  const s = Math.floor(Math.max(0, Number(seconds) || 0));
  if (!Number.isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function soundCloudUrl(value) {
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (!['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com'].includes(host)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (host === 'on.soundcloud.com' ? parts.length !== 1 : parts.length < 2) return null;
    url.protocol = 'https:';
    if (host !== 'on.soundcloud.com') url.hostname = 'soundcloud.com';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_') || key === 'si') url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}
export function safeArtwork(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'sndcdn.com' || url.hostname.endsWith('.sndcdn.com')) ? url.href : null;
  } catch { return null; }
}
export function readSettings(storage) {
  try {
    const value = JSON.parse(storage.getItem('prism-settings') || '{}');
    return {
      preset: Object.hasOwn(PRESETS, value.preset) ? value.preset : 'photon',
      palette: Object.hasOwn(PALETTES, value.palette) ? value.palette : 'aurora',
      intensity: Number.isFinite(value.intensity) ? clamp(value.intensity, 10, 100) : 70,
      speed: Number.isFinite(value.speed) ? clamp(value.speed, 0, 100) : 45,
      volume: Number.isFinite(value.volume) ? clamp(value.volume, 0, 100) : 75,
    };
  } catch { return { preset: 'photon', palette: 'aurora', intensity: 70, speed: 45, volume: 75 }; }
}
