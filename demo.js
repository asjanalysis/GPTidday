/* A small original synth loop, generated locally. No remote audio or samples. */
export function createDemoWave() {
  const rate = 22050, seconds = 32, length = rate * seconds;
  const buffer = new ArrayBuffer(44 + length * 2), view = new DataView(buffer);
  const write = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + length * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, length * 2, true);
  const notes = [130.81, 155.56, 196, 233.08, 130.81, 196, 174.61, 155.56];
  let seed = 171;
  for (let i = 0; i < length; i++) {
    const t = i / rate, beat = t % .5, step = t % .25;
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const noise = seed / 2147483648;
    const kick = Math.sin(2 * Math.PI * (48 * beat + 6 * (1 - Math.exp(-beat * 35)))) * Math.exp(-beat * 16) * .5;
    const hat = noise * Math.exp(-step * 100) * .07;
    const note = notes[Math.floor(t / .25) % notes.length];
    const pluck = (Math.sin(2 * Math.PI * note * t) + .3 * Math.sin(2 * Math.PI * note * 2.002 * t)) * Math.exp(-step * 10) * .19;
    const pad = (Math.sin(2 * Math.PI * 65.405 * t) + Math.sin(2 * Math.PI * 98 * t)) * .04;
    const fade = Math.min(1, t * 3, (seconds - t) * 2);
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, (kick + hat + pluck + pad) * fade)) * 32767, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
