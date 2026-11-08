export class AudioEngine extends EventTarget {
  constructor() {
    super();
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.mode = 'none';
    this.ambientPlayback = false;
    this.frequency = new Uint8Array(512);
    this.waveform = new Uint8Array(1024).fill(128);
    this.captureGeneration = 0;
    this.localGeneration = 0;
  }
  async initialize() {
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('This browser does not support Web Audio. Try a current Chrome, Edge, Firefox, or Safari.');
      this.context = new Context();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = .78;
      this.localSource = this.context.createMediaElementSource(this.audio);
      this.localSource.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }
  emitCapture() { this.dispatchEvent(new Event('capturechange')); }
  async useLocal(url) {
    const generation = ++this.localGeneration;
    this.stopCapture();
    await this.initialize();
    if (generation !== this.localGeneration) return false;
    this.setAnalyserSource(this.localSource);
    this.mode = 'local';
    this.audio.src = url;
    this.audio.load();
    return true;
  }
  setAnalyserSource(source) {
    if (this.analysisSource) {
      try { this.analysisSource.disconnect(this.analyser); } catch { /* Already disconnected. */ }
    }
    this.analysisSource = source;
    source?.connect(this.analyser);
  }
  async play() { await this.initialize(); await this.audio.play(); }
  pause() { this.audio.pause(); }
  stopLocal() {
    this.localGeneration++;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.mode === 'local') {
      this.setAnalyserSource(null);
      this.mode = 'none';
    }
  }
  async captureTab() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Tab audio needs desktop Chrome or Edge on HTTPS or localhost. You can still visualize local audio files in this browser.');
    }
    const generation = ++this.captureGeneration;
    // Must be called directly from a click. Captured video frames are never read.
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' }, audio: { suppressLocalAudioPlayback: false },
      preferCurrentTab: true, selfBrowserSurface: 'include', systemAudio: 'exclude',
    });
    if (generation !== this.captureGeneration) { stream.getTracks().forEach(track => track.stop()); return false; }
    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error('No tab audio was shared. Choose this browser tab and enable “Share tab audio”, then connect again.');
    }
    try { await this.initialize(); } catch (error) { stream.getTracks().forEach(track => track.stop()); throw error; }
    if (generation !== this.captureGeneration) { stream.getTracks().forEach(track => track.stop()); return false; }
    this.stopCapture(false);
    this.stream = stream;
    this.captureSource = this.context.createMediaStreamSource(stream);
    this.setAnalyserSource(this.captureSource);
    // Never connect the captured source to the speakers: that would create echo.
    this.mode = 'capture';
    for (const track of stream.getTracks()) track.addEventListener('ended', () => {
      if (this.stream === stream) this.stopCapture();
    }, { once: true });
    this.emitCapture();
    return true;
  }
  stopCapture(invalidate = true) {
    if (invalidate) this.captureGeneration++;
    const stream = this.stream;
    this.stream = null;
    if (this.captureSource) {
      this.setAnalyserSource(null);
      this.captureSource.disconnect();
      this.captureSource = null;
    }
    stream?.getTracks().forEach(track => track.stop());
    if (this.mode === 'capture') this.mode = 'none';
    if (stream) this.emitCapture();
  }
  sample(visualTime = 0) {
    if (this.analyser && this.mode !== 'none') {
      this.analyser.getByteFrequencyData(this.frequency);
      this.analyser.getByteTimeDomainData(this.waveform);
    } else if (this.ambientPlayback) {
      // The SoundCloud iframe exposes playback events, but no audio samples.
      // Use a generated signal until the listener shares tab audio.
      const pulse = (1 + Math.sin(visualTime * 8)) / 2;
      for (let i = 0; i < this.frequency.length; i++) {
        const ripple = (1 + Math.sin(i * .18 - visualTime * 5)) / 2;
        this.frequency[i] = (24 + 92 * pulse + 78 * ripple) / (1 + i * .011);
      }
      for (let i = 0; i < this.waveform.length; i++) {
        const phase = i * .052;
        const wave = Math.sin(phase + visualTime * 6) + .35 * Math.sin(phase * 2.1 - visualTime * 4);
        this.waveform[i] = 128 + (18 + 23 * pulse) * wave;
      }
    } else {
      this.frequency.fill(0);
      this.waveform.fill(128);
    }
    let squares = 0;
    for (const value of this.waveform) squares += ((value - 128) / 128) ** 2;
    let bass = 0;
    for (let i = 1; i < 16; i++) bass += this.frequency[i] / 255;
    return { frequency: this.frequency, waveform: this.waveform, rms: Math.sqrt(squares / this.waveform.length), bass: bass / 15 };
  }
}
