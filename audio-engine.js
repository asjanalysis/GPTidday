export class AudioEngine extends EventTarget {
  constructor() {
    super();
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.mode = 'none';
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
    return this.captureInput('capture', () => navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' }, audio: { suppressLocalAudioPlayback: false },
      preferCurrentTab: true, selfBrowserSurface: 'include', systemAudio: 'exclude',
    }), 'No tab audio was shared. Choose this browser tab and enable “Share tab audio”, then connect again.');
  }
  async captureMicrophone() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access needs HTTPS and a browser that allows it. Open Prism directly in Safari and try again.');
    }
    return this.captureInput('microphone', () => navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    }), 'The browser did not provide a microphone audio track.');
  }
  async captureInput(mode, requestStream, missingAudioMessage) {
    const generation = ++this.captureGeneration;
    // Start Web Audio and request permission during the same click.
    const initialization = this.initialize().then(() => null, error => error);
    const stream = await requestStream();
    const stopTracks = () => stream.getTracks().forEach(track => track.stop());
    if (generation !== this.captureGeneration) { stopTracks(); return false; }
    if (!stream.getAudioTracks().some(track => track.readyState !== 'ended')) {
      stopTracks();
      throw new Error(missingAudioMessage);
    }
    const initializationError = await initialization;
    if (generation !== this.captureGeneration) { stopTracks(); return false; }
    if (initializationError) { stopTracks(); throw initializationError; }
    this.stopCapture(false);
    try {
      this.captureSource = this.context.createMediaStreamSource(stream);
      this.setAnalyserSource(this.captureSource);
    } catch (error) {
      this.stopCapture(false);
      stopTracks();
      throw error;
    }
    // The captured signal feeds only the analyser to avoid speaker feedback.
    this.stream = stream;
    this.mode = mode;
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
    if (this.mode === 'capture' || this.mode === 'microphone') this.mode = 'none';
    if (stream) this.emitCapture();
  }
  sample() {
    if (this.analyser && this.mode !== 'none') {
      this.analyser.getByteFrequencyData(this.frequency);
      this.analyser.getByteTimeDomainData(this.waveform);
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
