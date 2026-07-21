const canvas = document.querySelector('#visualizerCanvas');
const ctx = canvas.getContext('2d');
const input = document.querySelector('#soundcloudUrl');
const form = document.querySelector('#trackForm');
const playButton = document.querySelector('#playButton');
const submitButton = form.querySelector('[type="submit"]');
const clock = document.querySelector('#clock');
const status = document.querySelector('#formStatus');
const frame = document.querySelector('#soundcloudWidget');

let widget = null;
let playing = false;
let energy = 0.36;
let hue = 270;
let mode = 'nebula';
let orbit = 0.38;
let intensity = 0.72;
let elapsed = 0;
let loadId = 0;
let loadTimeout = null;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function draw(time) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const t = time * 0.00045 + elapsed * 0.002;
  ctx.clearRect(0, 0, w, h);
  const cx = w * (0.54 + Math.sin(t * 0.34) * orbit * 0.05);
  const cy = h * 0.51;
  const pulse = energy * intensity + Math.sin(t * 5.4) * 0.055 + 0.11;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.57);
  glow.addColorStop(0, `hsla(${hue}, 94%, 62%, ${0.25 + pulse * 0.22})`);
  glow.addColorStop(0.32, `hsla(${hue + 35}, 82%, 39%, .13)`);
  glow.addColorStop(1, 'rgba(5,3,11,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(cx, cy);
  const rings = mode === 'tunnel' ? 46 : mode === 'prism' ? 17 : 30;
  for (let i = rings; i > 0; i -= 1) {
    const z = i / rings;
    const wave = Math.sin(t * 4 + i * 0.6) * pulse;
    const radius = (mode === 'tunnel' ? z * Math.min(w, h) * 0.68 : (1 - z) * Math.min(w, h) * 0.54) + wave * 70;
    const alpha = (1 - z) * 0.48;
    ctx.beginPath();
    if (mode === 'prism') {
      for (let point = 0; point <= 6; point += 1) {
        const angle = (point / 6) * Math.PI * 2 + t * 0.3;
        const size = radius * (1 + Math.sin(point * 3 + t) * pulse * 0.3);
        if (point) ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size * 0.62);
        else ctx.moveTo(Math.cos(angle) * size, Math.sin(angle) * size * 0.62);
      }
    } else {
      ctx.ellipse(Math.cos(t + i) * orbit * 60, Math.sin(t * 0.7 + i * 0.4) * orbit * 30, radius, radius * (0.35 + z * 0.22), t * 0.2, 0, Math.PI * 2);
    }
    ctx.strokeStyle = `hsla(${hue + i * 2.2}, 96%, ${58 + z * 20}%, ${alpha})`;
    ctx.lineWidth = 1 + pulse * 2;
    ctx.stroke();
  }
  for (let i = 0; i < 105; i += 1) {
    const angle = i * 2.4 + t * (0.8 + (i % 4) * 0.08);
    const radius = 95 + (i % 17) * 19 + pulse * 90;
    ctx.fillStyle = `hsla(${hue + 80 + i}, 100%, 75%, ${0.15 + (i % 5) * 0.07})`;
    ctx.fillRect(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.48, 1.5, 1.5);
  }
  ctx.restore();
  window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);

function setStatus(message, state = '') {
  status.textContent = message;
  status.dataset.state = state;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  playButton.disabled = isLoading;
  submitButton.textContent = isLoading ? 'CONNECTING…' : 'VISUALIZE ↗';
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function setTrackInfo(data = {}) {
  document.querySelector('#trackTitle').textContent = data.title || 'Connected SoundCloud track';
  document.querySelector('#trackArtist').textContent = data.user?.username || 'SoundCloud powered';
  if (data.artwork_url) {
    const art = document.querySelector('#coverArt');
    art.classList.remove('cover-default');
    art.style.backgroundImage = `url("${data.artwork_url.replace('-large', '-t300x300')}")`;
  }
}

function isSoundCloudUrl(value) {
  try {
    const url = new URL(value);
    return ['soundcloud.com', 'www.soundcloud.com', 'on.soundcloud.com'].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function loadTrack(url) {
  if (!window.SC?.Widget) {
    setStatus('The SoundCloud player could not be loaded. Check your connection and try again.', 'error');
    return;
  }
  const requestId = ++loadId;
  window.clearTimeout(loadTimeout);
  setLoading(true);
  setStatus('Connecting to SoundCloud…', 'loading');
  playing = false;
  playButton.textContent = '▶';
  clock.textContent = '00:00';
  elapsed = 0;
  frame.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
  const nextWidget = window.SC.Widget(frame);
  widget = nextWidget;
  nextWidget.bind(window.SC.Widget.Events.READY, () => {
    if (requestId !== loadId) return;
    window.clearTimeout(loadTimeout);
    setLoading(false);
    setStatus('Connected. Press play if playback did not start automatically.', 'success');
    nextWidget.getCurrentSound(setTrackInfo);
    nextWidget.play();
  });
  nextWidget.bind(window.SC.Widget.Events.PLAY, () => {
    if (requestId !== loadId) return;
    playing = true;
    playButton.textContent = 'Ⅱ';
  });
  nextWidget.bind(window.SC.Widget.Events.PAUSE, () => {
    if (requestId !== loadId) return;
    playing = false;
    playButton.textContent = '▶';
  });
  nextWidget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (event) => {
    if (requestId !== loadId) return;
    elapsed = event.currentPosition;
    energy = 0.38 + Math.sin(elapsed * 0.006) * 0.17 + Math.sin(elapsed * 0.018) * 0.1;
    clock.textContent = formatTime(elapsed);
  });
  nextWidget.bind(window.SC.Widget.Events.ERROR, () => {
    if (requestId !== loadId) return;
    window.clearTimeout(loadTimeout);
    setLoading(false);
    setStatus('SoundCloud could not play that link. Use a public track or playlist URL.', 'error');
    widget = null;
  });
  loadTimeout = window.setTimeout(() => {
    if (requestId !== loadId) return;
    setLoading(false);
    setStatus('SoundCloud took too long to respond. Check the link and try again.', 'error');
    widget = null;
  }, 15000);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const url = input.value.trim();
  if (!isSoundCloudUrl(url)) {
    setStatus('Enter a public SoundCloud track or playlist URL.', 'error');
    input.focus();
    return;
  }
  loadTrack(url);
});

playButton.addEventListener('click', () => {
  if (!widget) {
    setStatus('Paste a SoundCloud link first.', 'error');
    input.focus();
    return;
  }
  if (playing) widget.pause();
  else widget.play();
});

document.querySelectorAll('.mode').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.mode.active').classList.remove('active');
  button.classList.add('active');
  mode = button.dataset.mode;
}));

document.querySelector('#intensity').addEventListener('input', (event) => {
  intensity = event.target.value / 100;
  document.querySelector('#intensityValue').textContent = event.target.value;
});
document.querySelector('#orbit').addEventListener('input', (event) => {
  orbit = event.target.value / 100;
  document.querySelector('#orbitValue').textContent = event.target.value;
});
document.querySelectorAll('.swatch').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.swatch.active').classList.remove('active');
  button.classList.add('active');
  hue = Number(button.dataset.hue);
}));

document.querySelector('#fullscreenButton').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector('.visual-stage').requestFullscreen();
  } catch {
    setStatus('Fullscreen is not available in this browser.', 'error');
  }
});
