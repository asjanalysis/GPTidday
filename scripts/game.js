const canvas = document.getElementById('gameCanvas');
const startButton = document.getElementById('startButton');
const gameMessage = document.getElementById('gameMessage');
const levelDisplay = document.getElementById('levelDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');
const stateLabel = document.getElementById('stateLabel');
const pocketLabel = document.getElementById('pocketLabel');
const speedLabel = document.getElementById('speedLabel');

if (canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const surferSprite = new Image();
  surferSprite.src = 'public/assets/surfer-sprite.svg';

  const state = {
    status: 'ready',
    level: 1,
    timer: 0,
    score: 0,
    scroll: 0,
    lastTime: 0,
    barrelBonus: 0,
    surfer: {
      x: width * 0.28,
      y: height * 0.55,
      velocity: 0,
    },
    settings: {},
  };

  const levelSettings = (level) => {
    const duration = 12 + (level - 1) * 6;
    const amplitude = 16 + level * 4;
    const pocket = Math.max(34, 74 - level * 6);
    const speed = 26 + level * 4;
    const turbulence = Math.min(8, 2 + level * 0.8);
    return {
      duration,
      amplitude,
      pocket,
      speed,
      turbulence,
      gravity: 140,
      suction: 110,
      pumpVelocity: -140,
      margin: 6,
      barrelThreshold: 0.75,
    };
  };

  const updateLabels = () => {
    levelDisplay.textContent = state.level;
    timerDisplay.textContent = `${state.timer.toFixed(1)}s`;
    scoreDisplay.textContent = Math.floor(state.score);
    stateLabel.textContent =
      state.status === 'running'
        ? 'Riding'
        : state.status === 'wipeout'
          ? 'Wipeout'
          : state.status === 'celebrate'
            ? 'Shaka'
            : 'Ready';

    const pocketSize = state.settings.pocket;
    pocketLabel.textContent = pocketSize > 58 ? 'Wide' : pocketSize > 44 ? 'Tight' : 'Barrel';

    const speed = state.settings.speed;
    speedLabel.textContent = speed < 32 ? 'Cruise' : speed < 40 ? 'Fast' : 'Turbo';
  };

  const showMessage = (title, body, buttonLabel, disabled = false) => {
    gameMessage.querySelector('h3').textContent = title;
    gameMessage.querySelector('p').textContent = body;
    startButton.textContent = buttonLabel;
    startButton.disabled = disabled;
    gameMessage.classList.remove('hidden');
  };

  const hideMessage = () => {
    gameMessage.classList.add('hidden');
  };

  const resetSurfer = () => {
    state.surfer.x = width * 0.28;
    state.surfer.y = height * 0.55;
    state.surfer.velocity = 0;
  };

  const resetLevel = () => {
    state.timer = 0;
    state.scroll = 0;
    state.barrelBonus = 0;
    state.settings = levelSettings(state.level);
    resetSurfer();
    updateLabels();
  };

  const getWaveAt = (x, t, settings) => {
    const phase = (x + t) / 54;
    const chop = Math.sin((x + t * 1.3) / 18) * settings.turbulence;
    const swell = Math.sin(phase) * settings.amplitude;
    const center = height * 0.55 + swell + chop;
    const barrelPulse = (Math.sin((x + t) / 120) + 1) / 2;
    const barrelFactor = barrelPulse > settings.barrelThreshold ? 0.6 : 1;
    const pocket = settings.pocket * barrelFactor;
    const upper = center - pocket / 2 - 4;
    const lower = center + pocket / 2 + 4;
    return { center, pocket, upper, lower, barrel: barrelFactor < 1 };
  };

  const pump = () => {
    if (state.status !== 'running') return;
    state.surfer.velocity = state.settings.pumpVelocity;
    state.score += 4;
  };

  const startRide = () => {
    if (state.status === 'running') return;
    if (state.status === 'ready') {
      state.level = 1;
      state.score = 0;
    }
    resetLevel();
    state.status = 'running';
    hideMessage();
  };

  const wipeout = () => {
    state.status = 'wipeout';
    showMessage('Wipeout!', 'Tap to retry and stay in the pocket.', 'Retry');
  };

  const celebrate = () => {
    state.status = 'celebrate';
    showMessage('Shaka!', 'Level cleared. Bigger wave loading...', 'Keep riding', true);
  };

  const advanceLevel = () => {
    state.level += 1;
    state.status = 'running';
    resetLevel();
    hideMessage();
  };

  const handleAction = () => {
    if (state.status === 'ready') {
      startRide();
      return;
    }
    if (state.status === 'running') {
      pump();
      return;
    }
    if (state.status === 'wipeout') {
      state.status = 'ready';
      resetLevel();
      showMessage('Tap to start the ride', 'Stay between the lip and the whitewater.', 'Start ride');
    }
  };

  const drawWave = (t, settings) => {
    ctx.clearRect(0, 0, width, height);
    const step = 6;
    const upperPoints = [];
    const lowerPoints = [];
    const centerPoints = [];

    for (let x = 0; x <= width; x += step) {
      const wave = getWaveAt(x, t, settings);
      upperPoints.push([x, wave.upper]);
      lowerPoints.push([x, wave.lower]);
      centerPoints.push([x, wave.center]);
    }

    ctx.fillStyle = 'rgba(6, 18, 35, 0.35)';
    ctx.beginPath();
    ctx.moveTo(upperPoints[0][0], upperPoints[0][1]);
    upperPoints.forEach(([x, y]) => ctx.lineTo(x, y));
    for (let i = lowerPoints.length - 1; i >= 0; i -= 1) {
      const [x, y] = lowerPoints[i];
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    upperPoints.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    lowerPoints.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    centerPoints.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawSurfer = (time) => {
    if (!surferSprite.complete) return;
    const frame = Math.floor((time / 100) % 8);
    const frameSize = 64;
    const drawSize = 42;
    ctx.drawImage(
      surferSprite,
      frame * frameSize,
      0,
      frameSize,
      frameSize,
      state.surfer.x - drawSize / 2,
      state.surfer.y - drawSize / 2,
      drawSize,
      drawSize
    );
  };

  const update = (time) => {
    if (!state.lastTime) state.lastTime = time;
    const dt = Math.min(0.05, (time - state.lastTime) / 1000);
    state.lastTime = time;

    if (state.status === 'running') {
      state.timer += dt;
      state.scroll += state.settings.speed * dt * 12;
      const wave = getWaveAt(state.surfer.x, state.scroll, state.settings);
      const suctionForce = ((wave.center - state.surfer.y) / wave.pocket) * state.settings.suction;
      state.surfer.velocity += (state.settings.gravity + suctionForce) * dt;
      state.surfer.y += state.surfer.velocity * dt;

      const distanceFromCenter = Math.abs(state.surfer.y - wave.center);
      if (distanceFromCenter < wave.pocket * 0.2) {
        state.score += dt * 12;
      } else {
        state.score += dt * 8;
      }

      if (wave.barrel) {
        state.barrelBonus += dt;
      }

      if (state.surfer.y < wave.upper + state.settings.margin || state.surfer.y > wave.lower - state.settings.margin) {
        wipeout();
      }

      if (state.timer >= state.settings.duration) {
        state.score += 20 + state.barrelBonus * 6;
        celebrate();
      }
    } else if (state.status === 'celebrate') {
      state.scroll += state.settings.speed * dt * 4;
      state.surfer.x += dt * 40;
      state.surfer.y -= dt * 20;
      if (state.surfer.x > width + 20) {
        advanceLevel();
      }
    }

    drawWave(state.scroll, state.settings);
    drawSurfer(time);
    updateLabels();
    requestAnimationFrame(update);
  };

  resetLevel();
  showMessage('Tap to start the ride', 'Stay between the lip and the whitewater.', 'Start ride');
  requestAnimationFrame(update);

  startButton.addEventListener('click', handleAction);
  canvas.addEventListener('pointerdown', handleAction);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      handleAction();
    }
  });
}
