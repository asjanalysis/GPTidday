import { PRESETS, PALETTES, clamp, formatTime, soundCloudUrl, safeArtwork, readSettings } from './core.mjs';
import { SoundCloudPlayer } from './soundcloud.js';
import { AudioEngine } from './audio-engine.js';
import { Visualizer } from './visualizer.js';
import { createDemoWave } from './demo.js';

const $ = selector => document.querySelector(selector);
let settings;
try { settings = readSettings(localStorage); } catch { settings = readSettings({ getItem: () => null }); }
const audio = new AudioEngine();
const cloud = new SoundCloudPlayer($('#embedHost'));
const visualizer = new Visualizer($('#visualizerCanvas'), audio, settings);
let queue = [], current = null, playing = false, ready = false, loading = false;
let duration = 0, position = 0, selection = 0, repeat = false, scrubbing = false, lastVolume = settings.volume || 75;
let nextId = 1, capturePending = false;
const entryId = () => nextId++;
function status(message, state = '') { $('#formStatus').textContent = message; $('#formStatus').dataset.state = state; }
function saveSettings() { try { localStorage.setItem('prism-settings', JSON.stringify(settings)); } catch { /* Private browsing may disable storage. */ } }
function rangeFill(input) {
  const percent = (Number(input.value) - Number(input.min || 0)) / (Number(input.max || 100) - Number(input.min || 0)) * 100;
  input.style.setProperty('--fill', `${clamp(percent, 0, 100)}%`);
}
function setPlaying(value) {
  playing = value;
  $('#playButton').setAttribute('aria-label', value ? 'Pause' : current?.failed ? 'Retry playback' : 'Play');
  $('#playButton use').setAttribute('href', value ? '#i-pause' : '#i-play');
  updateSignal();
}
function setLoading(value) {
  loading = value;
  $('#loadButton').textContent = value ? 'Connecting…' : 'Load track';
  $('#playButton').disabled = !current || value;
  $('#seek').disabled = !ready || !duration || value;
}
function updateSignal() {
  const captured = audio.mode === 'capture';
  const microphone = audio.mode === 'microphone';
  const live = microphone || captured || (audio.mode === 'local' && playing);
  $('#signalBadge').classList.toggle('live', live);
  $('#signalLabel').textContent = microphone ? 'LIVE / MICROPHONE' : captured ? 'LIVE / TAB AUDIO' : audio.mode === 'local' ? playing ? 'LIVE / AUDIO ANALYSIS' : 'PAUSED / AUDIO ANALYSIS' : playing ? 'AMBIENT / SOUNDCLOUD' : 'AMBIENT / NO AUDIO';
  $('#captureButton').classList.toggle('active', captured);
  $('#captureButton span').textContent = captured ? 'Disconnect audio' : 'Connect tab audio';
  $('#micButton').classList.toggle('active', microphone);
  $('#micButton span').textContent = microphone ? 'Stop microphone' : 'Use microphone';
  $('#audioNoteTitle').textContent = live ? 'Listening to the actual audio.' : 'Made to move with music.';
  $('#audioNoteText').textContent = microphone ? 'Visualizing sound near your microphone. Nothing is recorded or uploaded.' : captured ? 'Live frequencies from your shared tab. Nothing is recorded or uploaded.' : audio.mode === 'local' ? 'This audio file feeds the frequency and waveform analyzer directly.' : 'Use your microphone with speakers, share tab audio, or open a local audio file.';
}
function updateProgress() {
  if (!scrubbing) {
    $('#currentTime').textContent = formatTime(position);
    $('#seek').value = duration ? clamp(position / duration * 1000, 0, 1000) : 0;
    rangeFill($('#seek'));
  }
  $('#duration').textContent = formatTime(duration);
  $('#seek').setAttribute('aria-valuetext', `${formatTime(position)} of ${formatTime(duration)}`);
  $('#seek').disabled = !ready || !duration || loading;
}
function showTrack() {
  $('#trackTitle').textContent = current?.title || 'Your next favorite moment';
  $('#trackArtist').textContent = current?.artist || 'Add a SoundCloud link or open an audio file';
  $('#trackLink').hidden = current?.kind !== 'soundcloud';
  $('#trackLink').href = current?.kind === 'soundcloud' ? current.url : 'https://soundcloud.com';
  const art = safeArtwork(current?.artwork);
  $('#coverArt').style.backgroundImage = art ? `url("${art}")` : '';
  $('#coverArt').textContent = art ? '' : '◈';
  $('#visualPanel').classList.toggle('has-track', !!current);
  $('#presetTitle').textContent = current ? 'You’re in your element.' : PRESETS[settings.preset].title;
  $('#visualHint').textContent = current ? current.kind === 'soundcloud' ? 'SoundCloud playback · use microphone or share tab audio' : 'Live audio. A whole new perspective.' : 'Load a track. Find your frequency.';
  renderQueue();
}
function renderQueue() {
  const host = $('#queue'); host.replaceChildren();
  $('#queueCount').textContent = String(queue.length).padStart(2, '0');
  $('#clearQueue').disabled = !queue.length;
  const index = queue.indexOf(current);
  $('#previousButton').disabled = !current;
  $('#nextButton').disabled = index < 0 || index >= queue.length - 1;
  if (!queue.length) {
    const empty = document.createElement('div');empty.className = 'queue-empty';
    const symbol = document.createElement('span');symbol.textContent = '＋';
    const copy = document.createElement('p');copy.textContent = 'A little less silence. A little more you.';
    const small = document.createElement('small');small.textContent = 'Load a link, drop an audio file, or try the demo above.';
    copy.append(small);empty.append(symbol, copy);host.append(empty);return;
  }
  queue.forEach((track, index) => {
    const row = document.createElement('div');row.className = `queue-row${track === current ? ' current' : ''}`;
    const button = document.createElement('button');button.className = 'queue-track';
    button.setAttribute('aria-label', `Play ${track.title}`);
    if (track === current) button.setAttribute('aria-current', 'true');
    const number = document.createElement('span');number.className = 'queue-number';number.textContent = track === current ? '♫' : String(index + 1).padStart(2, '0');
    const meta = document.createElement('span');meta.className = 'queue-meta';
    const title = document.createElement('strong');title.textContent = track.title;
    const artist = document.createElement('small');artist.textContent = track.artist;
    const type = document.createElement('span');type.className = 'queue-type';type.textContent = track.kind === 'soundcloud' ? 'SOUNDCLOUD' : track.demo ? 'AUDIO DEMO' : 'LOCAL FILE';
    meta.append(title, artist);button.append(number, meta, type);
    button.addEventListener('click', () => selectTrack(track));
    const remove = document.createElement('button');remove.className = 'icon-button queue-remove';remove.textContent = '×';remove.setAttribute('aria-label', `Remove ${track.title}`);
    remove.addEventListener('click', () => removeTrack(track));row.append(button, remove);host.append(row);
  });
}
function stopCurrent() {
  selection++;
  current = null; ready = false; position = 0; duration = 0;
  cloud.destroy(); audio.stopLocal();
  $('#embedDetails').hidden = true;
  setPlaying(false);setLoading(false);updateProgress();
}
async function selectTrack(track) {
  if (!queue.includes(track)) return;
  stopCurrent();
  current = track;track.failed = false;
  const generation = selection;
  setLoading(true);showTrack();
  status(track.kind === 'soundcloud' ? 'Connecting to SoundCloud…' : 'Opening audio…', 'loading');
  try {
    if (track.kind === 'soundcloud') {
      $('#embedDetails').hidden = false;
      $('#embedDetails').open = true;
      await cloud.load(track.url, settings.volume);
    } else {
      await audio.useLocal(track.url);
      if (generation !== selection) return;
      audio.audio.volume = settings.volume / 100;
      ready = true;setLoading(false);
      await audio.play();
      if (generation === selection) status(track.demo ? 'Playing “Afterglow” — an original synth loop. These visuals analyze the actual audio.' : 'Playing local audio. Your file stays on this device.', 'success');
    }
  } catch (error) {
    if (generation !== selection) return;
    track.failed = true;
    setPlaying(false);setLoading(false);
    if (error.name === 'NotAllowedError' && track.kind === 'local') {
      status('Your browser needs a click to start audio. Press the play button.');
    } else if (track.kind === 'local' && (audio.audio.error || error.name === 'NotSupportedError')) {
      status('This file could not be decoded. It may be damaged or use a codec this browser does not support. Try MP3 or WAV.', 'error');
    } else status(error.message || 'This audio could not be opened. Try another file or public SoundCloud link.', 'error');
  }
}
function playbackError(message) {
  if (!current) return;
  current.failed = true; ready = false;
  setPlaying(false);setLoading(false);
  status(message, 'error');
  if (current.kind === 'soundcloud') $('#embedDetails').open = true;
}
async function togglePlayback() {
  if (!current || loading) return;
  if (current.failed) { await selectTrack(current);return; }
  if (current.kind === 'soundcloud') {
    if (playing) cloud.pause(); else {
      cloud.play();
      status('If audio does not start, press play in the SoundCloud player below.');
      $('#embedDetails').open = true;
    }
  } else {
    const generation = selection;
    try {
      if (playing) audio.pause(); else await audio.play();
    } catch (error) { if (generation === selection) playbackError(error.message || 'Playback could not start. Try another audio file.'); }
  }
}
function nextTrack() {
  const index = queue.indexOf(current);
  if (index >= 0 && queue[index + 1]) selectTrack(queue[index + 1]);
}
function seekTo(seconds) {
  if (!current || !ready || !duration) return;
  position = clamp(seconds, 0, duration);
  if (current.kind === 'soundcloud') cloud.seek(position); else audio.audio.currentTime = position;
  updateProgress();
}
function ended() {
  const generation = selection;
  if (repeat) {seekTo(0);if (current?.kind === 'soundcloud') cloud.play();else audio.play().catch(error => { if (generation === selection) playbackError(error.message); });}
  else if (queue.indexOf(current) < queue.length - 1) nextTrack();
  else {setPlaying(false);position = duration;updateProgress();status('That’s a wrap. Play it again, or find your next track.');}
}
function removeTrack(track) {
  const index = queue.indexOf(track), wasCurrent = track === current;
  if (wasCurrent) stopCurrent();
  queue.splice(index, 1);
  if (track.kind === 'local') URL.revokeObjectURL(track.url);
  if (wasCurrent && queue.length) selectTrack(queue[Math.min(index, queue.length - 1)]);
  else {showTrack();if (wasCurrent) status('Track removed. Load a link or open an audio file.');}
}
function clearQueue() {
  stopCurrent();audio.stopCapture();
  for (const track of queue) if (track.kind === 'local') URL.revokeObjectURL(track.url);
  queue = [];showTrack();updateSignal();status('Queue cleared. Make room for something new.');
}
function addFiles(files) {
  const accepted = [...files].filter(file => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac|opus|aiff|webm)$/i.test(file.name));
  if (!accepted.length) {status('Choose an audio file such as MP3, WAV, OGG, M4A, or FLAC.', 'error');return;}
  const tracks = accepted.map(file => ({ id: entryId(), kind: 'local', url: URL.createObjectURL(file), title: file.name.replace(/\.[^.]+$/, ''), artist: 'Local audio · stays on your device' }));
  queue.push(...tracks);selectTrack(tracks[0]);
}

// Widget events are isolated by SoundCloudPlayer's per-load generation guard.
cloud.addEventListener('ready', () => {
  if (current?.kind !== 'soundcloud') return;
  ready = true;setLoading(false);
  status('Connected to SoundCloud. Press play in the player below if playback does not start. Connect tab audio for live analysis.', 'success');
});
cloud.addEventListener('metadata', ({ detail: sound }) => {
  if (current?.kind !== 'soundcloud') return;
  const permalink = soundCloudUrl(sound.permalink_url || '');
  // Keep our queue in sync when someone uses the native playlist controls.
  const matching = permalink && queue.find(track => track.kind === 'soundcloud' && track.url === permalink);
  if (matching && matching !== current) {
    current = matching;selection++;position = 0;duration = 0;current.failed = false;
  }
  current.title = sound.title || 'SoundCloud track';current.artist = sound.user?.username || 'SoundCloud';current.artwork = sound.artwork_url || sound.user?.avatar_url;
  if (permalink) current.url = permalink;
  if (sound.duration) duration = sound.duration / 1000;
  updateProgress();showTrack();
});
cloud.addEventListener('playlist', ({ detail: sounds }) => {
  if (current?.kind !== 'soundcloud' || sounds.length < 2 || current.expanded) return;
  const tracks = sounds.map(sound => ({ id: entryId(), kind: 'soundcloud', url: soundCloudUrl(sound.permalink_url || ''), title: sound.title || 'SoundCloud track', artist: sound.user?.username || 'SoundCloud', artwork: sound.artwork_url || sound.user?.avatar_url, expanded: true })).filter(track => track.url);
  if (!tracks.length) return;
  const index = queue.indexOf(current);
  // Keep the selected object so asynchronous metadata still refers to it.
  Object.assign(current, tracks[0]);current.expanded = true;
  queue.splice(index + 1, 0, ...tracks.slice(1));
  showTrack();status(`Playlist loaded: ${tracks.length} tracks. Connect tab audio for live audio-reactive visuals.`, 'success');
});
cloud.addEventListener('duration', ({ detail }) => {if (current?.kind === 'soundcloud') {duration = Number.isFinite(detail) ? detail : 0;updateProgress();}});
cloud.addEventListener('progress', ({ detail }) => {if (current?.kind === 'soundcloud') {position = detail;updateProgress();}});
cloud.addEventListener('play', () => {if (current?.kind === 'soundcloud') setPlaying(true);});
cloud.addEventListener('pause', () => {if (current?.kind === 'soundcloud') setPlaying(false);});
cloud.addEventListener('ended', () => {if (current?.kind === 'soundcloud') ended();});
cloud.addEventListener('error', ({ detail }) => playbackError(detail));

audio.audio.addEventListener('loadedmetadata', () => {if (current?.kind === 'local') {duration = Number.isFinite(audio.audio.duration) ? audio.audio.duration : 0;updateProgress();}});
audio.audio.addEventListener('durationchange', () => {if (current?.kind === 'local') {duration = Number.isFinite(audio.audio.duration) ? audio.audio.duration : 0;updateProgress();}});
audio.audio.addEventListener('timeupdate', () => {if (current?.kind === 'local') {position = audio.audio.currentTime;updateProgress();}});
audio.audio.addEventListener('play', () => {if (current?.kind === 'local' && !audio.audio.paused) setPlaying(true);});
audio.audio.addEventListener('pause', () => {if (current?.kind === 'local' && audio.audio.paused) setPlaying(false);});
audio.audio.addEventListener('ended', () => {if (current?.kind === 'local') ended();});
audio.audio.addEventListener('error', () => {
  if (current?.kind !== 'local' || !audio.audio.getAttribute('src') || !audio.audio.error) return;
  playbackError('This file could not be decoded. It may be damaged or use a codec this browser does not support. Try MP3 or WAV.');
});
audio.addEventListener('capturechange', updateSignal);

$('#trackForm').addEventListener('submit', event => {
  event.preventDefault();
  const url = soundCloudUrl($('#soundcloudUrl').value);
  if (!url) {status('Enter a SoundCloud track or playlist URL, such as https://soundcloud.com/artist/track.', 'error');$('#soundcloudUrl').focus();return;}
  const existing = queue.find(track => track.kind === 'soundcloud' && track.url === url);
  const track = existing || { id: entryId(), kind: 'soundcloud', url, title: 'Loading SoundCloud track…', artist: 'SoundCloud' };
  if (!existing) queue.push(track);
  selectTrack(track);
});
$('#fileInput').addEventListener('change', event => {addFiles(event.target.files);event.target.value = '';});
$('#demoButton').addEventListener('click', () => {
  let track = queue.find(track => track.demo);
  if (!track) {track = { id: entryId(), kind: 'local', demo: true, url: URL.createObjectURL(createDemoWave()), title: 'Afterglow', artist: 'Prism studio · original synth demo' };queue.push(track);}
  selectTrack(track);
});
$('#playButton').addEventListener('click', togglePlayback);
$('#nextButton').addEventListener('click', nextTrack);
$('#previousButton').addEventListener('click', () => {
  const index = queue.indexOf(current);
  if (position > 3 || index <= 0) seekTo(0);else selectTrack(queue[index - 1]);
});
$('#repeatButton').addEventListener('click', () => {repeat = !repeat;$('#repeatButton').setAttribute('aria-pressed', String(repeat));});
$('#clearQueue').addEventListener('click', clearQueue);
$('#seek').addEventListener('input', event => {scrubbing = true;$('#currentTime').textContent = formatTime(Number(event.target.value) / 1000 * duration);rangeFill(event.target);});
$('#seek').addEventListener('change', event => {scrubbing = false;seekTo(Number(event.target.value) / 1000 * duration);});
$('#seek').addEventListener('blur', () => {scrubbing = false;updateProgress();});
function setVolume(value) {
  settings.volume = clamp(value, 0, 100);
  if (settings.volume > 0) lastVolume = settings.volume;
  audio.audio.volume = settings.volume / 100;cloud.volume(settings.volume);
  $('#volume').value = settings.volume;$('#volumeValue').textContent = `${settings.volume}%`;
  $('#muteButton').setAttribute('aria-label', settings.volume ? 'Mute' : 'Unmute');
  $('#muteButton').style.opacity = settings.volume ? '' : '.5';
  rangeFill($('#volume'));saveSettings();
}
$('#volume').addEventListener('input', event => setVolume(event.target.value));
$('#muteButton').addEventListener('click', () => setVolume(settings.volume ? 0 : lastVolume));
$('#captureButton').addEventListener('click', async () => {
  if (capturePending) return;
  if (audio.mode === 'capture') {audio.stopCapture();status('Tab audio disconnected. SoundCloud visuals are now ambient.');return;}
  if (current?.kind === 'local') {status('Local audio is already connected directly to the analyzer. Load a SoundCloud link to connect tab audio.');return;}
  capturePending = true;$('#captureButton').disabled = true;$('#micButton').disabled = true;
  status('Choose this browser tab and enable “Share tab audio”. No audio or video is recorded.');
  try {
    const connected = await audio.captureTab();
    if (connected) status('Tab audio connected. The visualizer now responds to actual frequencies and waveforms.', 'success');
  } catch (error) {
    status(['NotAllowedError', 'AbortError'].includes(error.name) ? 'Audio sharing was canceled or denied. You can reconnect at any time; SoundCloud remains in ambient mode.' : error.message || 'Tab audio could not connect. Try desktop Chrome or Edge.', 'error');
  } finally {capturePending = false;$('#captureButton').disabled = false;$('#micButton').disabled = false;updateSignal();}
});
function microphoneStatus(message, state) {
  $('#visualHint').textContent = message;
  status(message, state);
}
$('#micButton').addEventListener('click', async () => {
  if (capturePending) return;
  if (audio.mode === 'microphone') {
    audio.stopCapture();
    microphoneStatus('Microphone disconnected.');
    return;
  }
  if (current?.kind === 'local') {
    microphoneStatus('This audio file already drives the visualizer directly.');
    return;
  }
  capturePending = true;
  $('#micButton').disabled = true;
  $('#captureButton').disabled = true;
  microphoneStatus('Allow microphone access, then play music through speakers.');
  try {
    if (await audio.captureMicrophone()) {
      microphoneStatus('Microphone on. Play music through speakers so Prism can hear it.', 'success');
    }
  } catch (error) {
    microphoneStatus(error.name === 'NotAllowedError'
      ? 'Microphone access was denied. Allow it in your browser’s site settings and try again.'
      : error.message || 'Could not connect to the microphone.', 'error');
  } finally {
    capturePending = false;
    $('#micButton').disabled = false;
    $('#captureButton').disabled = false;
    updateSignal();
  }
});
function applySettings() {
  document.querySelectorAll('[data-preset]').forEach(button => {
    const active = button.dataset.preset === settings.preset;
    button.classList.toggle('active', active);button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-palette]').forEach(button => {
    const active = button.dataset.palette === settings.palette;
    button.classList.toggle('active', active);button.setAttribute('aria-pressed', String(active));
  });
  for (const key of ['intensity', 'speed']) { $(`#${key}`).value = settings[key];$(`#${key}Value`).textContent = `${settings[key]}%`;rangeFill($(`#${key}`)); }
  $('#paletteName').textContent = PALETTES[settings.palette].name;
  $('#presetName').textContent = PRESETS[settings.preset].name.toUpperCase();
  $('.visual-caption .eyebrow').textContent = `${PRESETS[settings.preset].number} / ${settings.preset === 'tunnel' ? 'WORMHOLE' : settings.preset.toUpperCase()}`;
  if (!current) $('#presetTitle').textContent = PRESETS[settings.preset].title;
  saveSettings();
}
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {settings.preset = button.dataset.preset;applySettings();}));
document.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => {settings.palette = button.dataset.palette;applySettings();}));
for (const key of ['intensity', 'speed']) $(`#${key}`).addEventListener('input', event => {settings[key] = Number(event.target.value);applySettings();});
$('#resetSettings').addEventListener('click', () => {Object.assign(settings, { intensity: 70, speed: 45, palette: 'aurora', preset: 'photon' });visualizer.turn = -.3;visualizer.tilt = .5;visualizer.zoom = 1;applySettings();});
function nextPreset() {const keys = Object.keys(PRESETS);settings.preset = keys[(keys.indexOf(settings.preset) + 1) % keys.length];applySettings();}
$('#shufflePreset').addEventListener('click', nextPreset);
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('#visualPanel').requestFullscreen) await $('#visualPanel').requestFullscreen();
    else throw new Error('Fullscreen is unavailable in this browser.');
  } catch {status('Fullscreen is unavailable here. Try opening the app in a desktop browser.', 'error');}
}
$('#fullscreenButton').addEventListener('click', fullscreen);
document.addEventListener('fullscreenchange', () => $('#fullscreenButton').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'));
$('#helpButton').addEventListener('click', () => $('#helpDialog').showModal());
$('#closeHelp').addEventListener('click', () => $('#helpDialog').close());
$('#helpDialog').addEventListener('click', event => {if (event.target === $('#helpDialog')) {const r = event.target.getBoundingClientRect();if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close();}});
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.altKey || event.metaKey || event.repeat || $('#helpDialog').open || event.target.closest('input,button,textarea,select,[contenteditable=true],summary')) return;
  if (event.code === 'Space') {event.preventDefault();togglePlayback();}
  if (event.key.toLowerCase() === 'f') fullscreen();
  if (event.key.toLowerCase() === 'v') nextPreset();
});
let dragDepth = 0;
window.addEventListener('dragenter', event => {if (event.dataTransfer.types.includes('Files')) {event.preventDefault();dragDepth++;$('#dropOverlay').hidden = false;}});
window.addEventListener('dragover', event => {if (event.dataTransfer.types.includes('Files')) event.preventDefault();});
window.addEventListener('dragleave', event => {event.preventDefault();if (--dragDepth <= 0) {dragDepth = 0;$('#dropOverlay').hidden = true;}});
window.addEventListener('drop', event => {event.preventDefault();dragDepth = 0;$('#dropOverlay').hidden = true;if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);});
window.addEventListener('pagehide', () => {stopCurrent();audio.stopCapture();showTrack();});
applySettings();setVolume(settings.volume);showTrack();updateProgress();updateSignal();
