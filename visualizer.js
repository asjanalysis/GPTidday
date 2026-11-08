import { PALETTES, clamp } from './core.mjs';

export class Visualizer {
  constructor(canvas, engine, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.engine = engine;
    this.settings = settings;
    this.turn = -.3; this.tilt = .5; this.zoom = 1; this.time = 0; this.energy = 0;
    this.previous = 0; this.frame = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.stars = Array.from({ length: 150 }, (_, i) => ({ x: ((i * 7919) % 997) / 997, y: ((i * 3571) % 991) / 991, r: .35 + (i % 4) * .3 }));
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    let pointer = null;
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      pointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!pointer) return;
      this.turn += (event.clientX - pointer.x) * .008;
      this.tilt = clamp(this.tilt + (event.clientY - pointer.y) * .005, -1.3, 1.3);
      pointer = { x: event.clientX, y: event.clientY };
    });
    const release = () => { pointer = null; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('wheel', event => { event.preventDefault(); this.zoom = clamp(this.zoom - event.deltaY * .001, .6, 1.6); }, { passive: false });
    this.resize();
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  tick(stamp) {
    this.raf = requestAnimationFrame(this.tick);
    const delta = Math.min((stamp - (this.previous || stamp)) / 1000, .05);
    this.previous = stamp;
    if (document.hidden) return;
    const reduced = this.reducedMotion.matches;
    if (reduced && stamp - (this.lastDraw || 0) < 100) return;
    this.lastDraw = stamp;
    const sample = this.engine.sample();
    const intensity = this.settings.intensity / 100;
    const target = Math.min(1, sample.rms * 4) * intensity;
    this.energy += (target - this.energy) * .2;
    const motion = this.settings.speed / 100;
    this.time += delta * (reduced ? .04 : motion * .65);
    const palette = PALETTES[this.settings.palette];
    this.render(sample, palette, intensity);
    if (++this.frame % 12 === 0) {
      this.canvas.dataset.energy = this.energy.toFixed(3);
      this.canvas.dataset.frames = String(this.frame);
    }
  }
  render(sample, palette, intensity) {
    const ctx = this.ctx, w = this.width, h = this.height, t = this.time;
    const hue = palette.hue, spread = palette.spread;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050c13'; ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * .6, h * .5, 0, w * .6, h * .5, Math.max(w, h) * .65);
    glow.addColorStop(0, `hsla(${hue + spread * .4},65%,22%,${.3 + this.energy * .4})`);
    glow.addColorStop(.5, `hsla(${hue + spread},60%,12%,.25)`);
    glow.addColorStop(1, 'rgba(5,12,19,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    for (const star of this.stars) {
      const x = (star.x * w + Math.sin(t * .25 + star.y * 5) * 8 + w) % w;
      const y = (star.y * h + t * (star.r + .2) * 2) % h;
      ctx.fillStyle = `hsla(${hue + spread},50%,85%,${.1 + star.r * .14})`;
      ctx.fillRect(x, y, star.r, star.r);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cx = w * (w > 600 ? .62 : .57), cy = h * .46;
    const scale = Math.min(w * .44, h * .43) * this.zoom;
    ctx.translate(cx, cy);
    if (this.settings.preset === 'spectrum') this.spectrum(sample, hue, spread, w, h, intensity);
    else if (this.settings.preset === 'scope') this.scope(sample, hue, spread, w, h, intensity);
    else if (this.settings.preset === 'tunnel') this.tunnel(sample, hue, spread, scale, intensity);
    else this.photon(sample, hue, spread, scale, intensity);
    ctx.restore();
    const vignette = ctx.createRadialGradient(w * .5, h * .5, h * .2, w * .5, h * .5, Math.max(w, h) * .72);
    vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, '#02070ecc');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
  }
  project(x, y, z, scale) {
    const turn = this.turn + this.time * .22, ct = Math.cos(turn), st = Math.sin(turn);
    const a = x * ct - z * st, b = x * st + z * ct;
    const tilt = this.tilt + Math.sin(this.time * .27) * .12;
    const c = y * Math.cos(tilt) - b * Math.sin(tilt), d = y * Math.sin(tilt) + b * Math.cos(tilt);
    const perspective = 3.5 / Math.max(1.2, 3.5 - d);
    return [a * scale * perspective, c * scale * perspective, d];
  }
  photon(sample, hue, spread, scale, intensity) {
    const ctx = this.ctx, t = this.time, energy = this.energy;
    // A twisted toroidal mesh. All geometry uses points, so radii never reach
    // canvas.ellipse with invalid negative values.
    for (let ring = 0; ring < 36; ring++) {
      const v = ring / 36 * Math.PI * 2;
      const frequency = sample.frequency[2 + ring * 3] / 255 * intensity;
      ctx.beginPath();
      let depth = 0;
      for (let step = 0; step <= 100; step++) {
        const u = step / 100 * Math.PI * 2;
        const twist = Math.sin(u * 3 + t + v * 2) * (.08 + energy * .13);
        const tube = .26 + Math.sin(v * 3 + t) * .025 + frequency * .16;
        const radius = .69 + Math.cos(v + u * .5) * tube + twist;
        const x = Math.cos(u) * radius, z = Math.sin(u) * radius;
        const y = Math.sin(v + u * .5) * tube + Math.sin(u * 2 + t) * .10;
        const point = this.project(x, y, z, scale * 1.08);
        depth += point[2];
        if (step === 0) ctx.moveTo(point[0], point[1]); else ctx.lineTo(point[0], point[1]);
      }
      const alpha = .16 + (depth / 101 + 1.3) * .16 + frequency * .35;
      ctx.strokeStyle = `hsla(${hue + Math.sin(v) * spread},85%,${57 + frequency * 30}%,${alpha})`;
      ctx.lineWidth = .65 + frequency * .9;
      ctx.stroke();
    }
    for (let i = 0; i < 160; i++) {
      const a = i * 2.39996 + t * .15, r = .9 + (i % 23) * .023 + energy * .1;
      const point = this.project(Math.cos(a) * r, Math.sin(i * 6.7 + t * .3) * .6, Math.sin(a) * r, scale);
      ctx.fillStyle = `hsla(${hue + (i % 4) * spread * .3},90%,80%,${.15 + (i % 5) * .12})`;
      ctx.fillRect(point[0], point[1], 1.1 + energy, 1.1 + energy);
    }
  }
  spectrum(sample, hue, spread, w, h, intensity) {
    const ctx = this.ctx, count = 72, width = w * .8 / count;
    const x0 = -w * .52, baseline = h * .15;
    for (let i = 0; i < count; i++) {
      const index = Math.min(511, Math.floor(Math.pow(i / count, 2) * 400) + 1);
      const value = sample.frequency[index] / 255;
      const height = Math.max(2, value * h * .55 * intensity);
      const x = x0 + i * width;
      const gradient = ctx.createLinearGradient(0, baseline - height, 0, baseline);
      gradient.addColorStop(0, `hsla(${hue + spread * i / count},95%,75%,.95)`);
      gradient.addColorStop(1, `hsla(${hue + spread},85%,45%,.2)`);
      ctx.fillStyle = gradient; ctx.fillRect(x, baseline - height, Math.max(1, width - 3), height);
      ctx.fillStyle = `hsla(${hue + spread * i / count},90%,75%,.8)`;
      ctx.fillRect(x, baseline - height - 4, Math.max(1, width - 3), 1);
      ctx.fillStyle = `hsla(${hue},80%,60%,.04)`; ctx.fillRect(x, baseline + 3, Math.max(1, width - 3), height * .28);
    }
    ctx.strokeStyle = '#c7f8e822'; ctx.lineWidth = 1; ctx.beginPath();ctx.moveTo(x0, baseline + 1);ctx.lineTo(x0 + w * .8, baseline + 1);ctx.stroke();
  }
  tunnel(sample, hue, spread, scale, intensity) {
    const ctx = this.ctx, t = this.time;
    for (let ring = 38; ring >= 0; ring--) {
      const phase = (ring / 39 + t * .13) % 1;
      const radius = (phase ** 1.7 * 2.4 + .02) * scale;
      const frequency = sample.frequency[ring * 5 + 2] / 255 * intensity;
      ctx.beginPath();
      for (let step = 0; step <= 100; step++) {
        const a = step / 100 * Math.PI * 2;
        const r = radius * (1 + Math.sin(a * 6 + t * .8) * (.03 + frequency * .14));
        const x = Math.cos(a + this.turn) * r + Math.sin(phase * 3 + t) * scale * .15;
        const y = Math.sin(a + this.turn) * r * (.66 + this.tilt * .15) + Math.cos(phase * 4 + t) * scale * .1;
        if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${hue + phase * spread},90%,${50 + frequency * 30}%,${(1 - phase) * .65})`;
      ctx.lineWidth = .6 + phase + frequency; ctx.stroke();
    }
  }
  scope(sample, hue, spread, w, h, intensity) {
    const ctx = this.ctx, width = w * .8, start = -w * .52;
    ctx.strokeStyle = '#9bbfc018'; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {ctx.beginPath();ctx.moveTo(start, i * 32);ctx.lineTo(start + width, i * 32);ctx.stroke();}
    for (let i = 0; i < 15; i++) {ctx.beginPath();ctx.moveTo(start + i * width / 14, -h * .28);ctx.lineTo(start + i * width / 14, h * .28);ctx.stroke();}
    for (let layer = 3; layer >= 0; layer--) {
      ctx.beginPath();
      // Start close to a rising zero crossing to stabilize a periodic signal.
      let offset = 0;
      for (let i = 0; i < 256; i++) if (sample.waveform[i] <= 128 && sample.waveform[i + 1] > 128) { offset = i; break; }
      for (let i = 0; i < 512; i++) {
        const value = (sample.waveform[offset + i] - 128) / 128;
        const x = start + i / 511 * width, y = value * h * .48 * intensity + layer * 3;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${hue + layer * spread * .3},90%,${80 - layer * 10}%,${layer === 0 ? .95 : .12})`;
      ctx.lineWidth = layer === 0 ? 1.6 : 4;ctx.stroke();
    }
  }
}
