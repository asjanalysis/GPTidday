# Prism

A Sonique-inspired listening room for SoundCloud links and local audio. Plain HTML, CSS, and JavaScript, with no build step, backend, API key, stream scraper, or third-party CORS proxy. Suitable for GitHub Pages or another static HTTPS host.

## Run

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open the app in your browser. Serve the files over HTTP locally or HTTPS when deployed: JavaScript modules and tab-audio capture do not work by opening `index.html` as a `file://` URL. No package installation is needed to run the application.

## Listen and visualize

- Paste a public SoundCloud track, playlist, or `on.soundcloud.com` share link. Playback uses the official SoundCloud Widget API. Playlists populate the queue; each queued selection is played in a fresh widget to isolate old event callbacks. SoundCloud controls playback access, including region, login, embedding, ad, and autoplay restrictions. The native SoundCloud player remains available below the queue when a direct click is needed.
- **For real SoundCloud audio analysis**, use desktop Chrome or Edge on HTTPS or localhost. Click **Connect tab audio**, choose **this tab**, and enable **Share tab audio**. The browser asks permission each time. The audio stream goes to a local Web Audio `AnalyserNode`, never back to the speakers, so it cannot create a feedback loop. No captured screen frames are read, and no audio or video is recorded or uploaded. Disconnect in the app or stop sharing in the browser. If the browser does not offer tab audio, use local files instead.
- SoundCloud's cross-origin iframe does **not** expose PCM samples. Without tab capture, the app explicitly displays **Ambient / SoundCloud**. It does not pretend that track position is a frequency spectrum. The spectrum and oscilloscope show a flat signal until audio analysis is connected.
- Open or drop one or more local audio files. Browser-supported MP3, WAV, OGG, M4A, FLAC, and other audio feeds the analyzer directly; files remain on the device. Codec support depends on the browser. Blob URLs are released when files leave the queue.
- **Try audio demo** plays “Afterglow”, an original 32-second synth loop generated on-device. It exercises real audio playback, seeking, and analysis, even offline.

Four visual presets: a projected toroidal Photon field, frequency spectrum, Wormhole tunnel, and oscilloscope. Intensity, motion speed, palette, drag rotation, scroll zoom, fullscreen, repeat, seeking, and volume are supported. Preset, palette, intensity, motion, and volume settings persist locally. Audio files and the queue are not persisted. Reduced-motion preferences reduce background motion and frame rate.

Keyboard shortcuts outside form controls: **Space** play/pause, **F** fullscreen, **V** next visual preset. Use Escape to leave fullscreen or close help. All primary controls have accessible labels; queue titles and metadata are rendered as text.

## Network

Local audio and the demo need no external network. SoundCloud requires access to `soundcloud.com`, `*.soundcloud.com`, and `*.sndcdn.com`. SoundCloud may change its media destinations; inspect actual requests if a host policy blocks playback. The app does not load external fonts or other remote UI dependencies.

The onboarding environment originally denied outbound SoundCloud requests. An allowlist proposal is saved in environment settings; it must be applied before live SoundCloud testing. A passing widget contract test does not establish live service playback.

## Validation

Unit tests use built-in Node tooling:

```sh
node --test tests/core.test.mjs
```

Browser checks use Playwright and Chromium (already available in the prepared cloud environment):

```sh
node tests/browser.cjs
```

For a new machine, install Playwright in your development tooling and provide Chromium at `/usr/bin/chromium`, or set `CHROMIUM_PATH` to its executable. The test runner starts its own temporary local static server and stops it afterward. It exercises actual generated audio, live Web Audio samples, all visual presets, playback controls, local decode failures, settings, mobile layout, SDK connection failures, queue cleanup, and audio-capture teardown. It uses a **controlled widget substitute** for SoundCloud metadata, playlists, progress, errors, and stale callback isolation. Tab capture tests use a real synthesized MediaStream but substitute the browser picker; the actual user-permission flow requires a manual check.

Before claiming a release is fully verified, use a network-enabled browser and a known public embeddable SoundCloud track and playlist. Confirm metadata, audible playback, pause/resume, seeking, next/previous, playlist advancement, and the native-player autoplay fallback. Then share this tab's audio and confirm the spectrum changes with the music; disconnect and confirm the label returns to ambient. Test cancellation, sharing without audio, and stopping sharing from browser controls. A region-restricted or removed track is not a valid successful test.

## Source map

- `app.js`: queue, player UI, playback state, and settings.
- `soundcloud.js`: official SDK loading and widget lifecycle, with timeouts and stale-callback guards.
- `audio-engine.js`: local playback, tab capture, and Web Audio analysis.
- `visualizer.js`: Canvas rendering and interactive presets.
- `core.mjs`: URL validation, display utilities, and validated saved settings.
- `demo.js`: original audio generation.
