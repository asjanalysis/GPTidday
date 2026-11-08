/* Official iframe API only. No stream scraping, client IDs, or CORS proxies. */
let apiPromise;
export function loadWidgetAPI() {
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    const timer = setTimeout(() => fail(), 12000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      reject(new Error('SoundCloud could not connect. Check your connection or allow w.soundcloud.com, then load the link again.'));
    }
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (window.SC?.Widget) resolve(window.SC);
      else fail();
    };
    document.head.append(script);
  }).catch(error => { apiPromise = null; throw error; });
  return apiPromise;
}

export class SoundCloudPlayer extends EventTarget {
  constructor(host) { super(); this.host = host; this.generation = 0; this.bindings = []; }
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  async load(url, volume = 75) {
    this.destroy();
    const generation = this.generation;
    const SC = await loadWidgetAPI();
    if (generation !== this.generation) return;
    const frame = document.createElement('iframe');
    frame.title = 'Official SoundCloud audio player';
    frame.allow = 'autoplay';
    frame.src = `https://w.soundcloud.com/player/?${new URLSearchParams({ url, auto_play: 'false', hide_related: 'true', show_comments: 'false', show_reposts: 'false', visual: 'false' })}`;
    this.host.replaceChildren(frame);
    const widget = this.widget = SC.Widget(frame);
    const active = () => generation === this.generation;
    const bind = (event, handler) => {
      if (!event) return;
      widget.bind(event, data => { if (active()) handler(data); });
      this.bindings.push(event);
    };
    this.timer = setTimeout(() => {
      if (active()) this.fail('SoundCloud did not respond. The track may be private, unavailable, or blocked. Try another public link or use the SoundCloud player below.');
    }, 25000);
    let metadataRequest = 0;
    const refreshMetadata = () => {
      const request = ++metadataRequest;
      widget.getCurrentSound(sound => {
        if (!active() || request !== metadataRequest) return;
        if (!sound) { this.fail('This link has no playable tracks. Try a public track or playlist.'); return; }
        this.emit('metadata', sound);
      });
      widget.getDuration(duration => {
        if (active() && request === metadataRequest) this.emit('duration', duration / 1000);
      });
    };
    bind(SC.Widget.Events.READY, () => {
      clearTimeout(this.timer);
      widget.setVolume(volume);
      refreshMetadata();
      widget.getSounds(sounds => { if (active() && Array.isArray(sounds)) this.emit('playlist', sounds); });
      this.emit('ready');
      widget.play();
    });
    bind(SC.Widget.Events.PLAY, () => { refreshMetadata(); this.emit('play'); });
    bind(SC.Widget.Events.PAUSE, () => this.emit('pause'));
    bind(SC.Widget.Events.PLAY_PROGRESS, event => this.emit('progress', event.currentPosition / 1000));
    bind(SC.Widget.Events.FINISH, () => { widget.pause(); this.emit('ended'); });
    bind(SC.Widget.Events.ERROR, () => this.fail('SoundCloud cannot play this track. It may require sign-in, be region-restricted, or have embedding disabled. Try the official player below or another link.'));
  }
  fail(message) {
    clearTimeout(this.timer);
    this.emit('error', message);
    // Invalidate callbacks from a failed connection, while leaving the native
    // iframe available so the listener can inspect SoundCloud's own response.
    this.generation++;
    this.unbind();
    this.widget?.pause();
  }
  unbind() {
    for (const event of this.bindings) this.widget?.unbind(event);
    this.bindings = [];
  }
  play() { this.widget?.play(); }
  pause() { this.widget?.pause(); }
  seek(seconds) { this.widget?.seekTo(seconds * 1000); }
  volume(value) { this.widget?.setVolume(value); }
  destroy() {
    this.generation++;
    clearTimeout(this.timer);
    this.unbind();
    this.widget?.pause();
    this.widget = null;
    this.host.replaceChildren();
  }
}
