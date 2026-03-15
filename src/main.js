import React, { useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import { createInitialState } from './game/state.js';
import { attemptSpread, processTurn, researchAdaptation } from './game/mechanics.js';
import { exportSave, importSave, loadGame, saveGame } from './game/storage.js';
import { ADAPTATIONS } from './data/adaptations.js';
import { FACTIONS } from './data/factions.js';

const fmt = (value) => Number(value).toFixed(1).replace('.0', '');

function drawBiomeMap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#120a2f');
  grad.addColorStop(1, '#040611');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 95; i += 1) {
    const pulse = 0.1 + ((state.turn + i * 13) % 30) / 160;
    ctx.fillStyle = `rgba(113, 192, 255, ${pulse})`;
    ctx.fillRect((i * 79) % w, (i * 47) % h, 2, 2);
  }

  ctx.strokeStyle = 'rgba(74, 128, 255, 0.28)';
  ctx.lineWidth = 2;
  for (const region of Object.values(state.regions)) {
    for (const targetId of region.links) {
      const t = state.regions[targetId];
      if (!t) continue;
      ctx.beginPath();
      ctx.moveTo(region.x, region.y);
      ctx.quadraticCurveTo((region.x + t.x) / 2, (region.y + t.y) / 2 + 18, t.x, t.y);
      ctx.stroke();
    }
  }

  for (const region of Object.values(state.regions)) {
    const selected = state.selectedRegionId === region.id;
    const radius = region.controlled ? 14 : 10;
    const glow = ctx.createRadialGradient(region.x, region.y, 2, region.x, region.y, radius + 8);
    glow.addColorStop(0, region.controlled ? '#66ffbb' : '#7ca0ff');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(region.x, region.y, radius + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = selected ? '#ffd86f' : region.controlled ? '#7affca' : '#88a6ff';
    ctx.strokeStyle = selected ? '#fff9de' : '#1d244f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(region.x, region.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f4f8ff';
    ctx.font = '600 13px Trebuchet MS';
    ctx.fillText(region.name, region.x + 14, region.y + 4);
    if (region.controlled) {
      ctx.font = '700 12px Trebuchet MS';
      ctx.fillText(String(Math.floor(region.biomass)), region.x - 4, region.y + 4);
    }
  }

  if (state.modifiers.scanlines) {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
}

function App() {
  const [state, setState] = useState(() => loadGame() || createInitialState('enveloped-rna-virus', 'normal'));
  const [showNewGame, setShowNewGame] = useState(() => !loadGame());
  const [showCodex, setShowCodex] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const mapRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    saveGame(state);
  }, [state]);

  useEffect(() => {
    if (!mapRef.current) return;
    drawBiomeMap(mapRef.current, state);
  }, [state]);

  const selectedRegion = state.regions[state.selectedRegionId];
  const researchQueue = useMemo(
    () => ADAPTATIONS.filter((a) => !state.researched.some((r) => r.id === a.id)).slice(0, 8),
    [state.researched]
  );

  const patch = (mutator) => {
    setState((prev) => {
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });
  };

  const clickMap = (event) => {
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * mapRef.current.width;
    const y = ((event.clientY - rect.top) / rect.height) * mapRef.current.height;

    let best = null;
    let dist = Infinity;
    for (const region of Object.values(state.regions)) {
      const d = Math.hypot(region.x - x, region.y - y);
      if (d < 24 && d < dist) {
        dist = d;
        best = region;
      }
    }
    if (!best) return;

    patch((draft) => {
      if (event.shiftKey) {
        const err = attemptSpread(draft, draft.selectedRegionId, best.id);
        if (err) draft.log.unshift(err);
      }
      draft.selectedRegionId = best.id;
    });
  };

  const controlsDisabled = Boolean(state.outcome);

  return React.createElement(
    'div',
    { className: `app-shell ${state.modifiers.crt ? 'crt' : ''}` },
    React.createElement('header', { className: 'topbar panel' },
      React.createElement('div', null,
        React.createElement('h1', null, 'Pathogen Dominion X'),
        React.createElement('p', { className: 'muted' }, 'Strategic infection simulator, rebuilt with React for richer visuals and touch-ready controls.')
      ),
      React.createElement('div', { className: 'actions' },
        React.createElement('button', { onClick: () => setShowNewGame(true) }, 'New Infection'),
        React.createElement('button', { onClick: () => saveGame(state) }, 'Save'),
        React.createElement('button', { onClick: () => { const loaded = loadGame(); if (loaded) setState(loaded); } }, 'Load'),
        React.createElement('button', { onClick: () => exportSave(state) }, 'Export'),
        React.createElement('button', { onClick: () => fileRef.current?.click() }, 'Import'),
        React.createElement('button', { onClick: () => setShowCodex(true) }, 'Codex'),
        React.createElement('button', { onClick: () => setShowSettings(true) }, 'Settings'),
        React.createElement('input', {
          ref: fileRef,
          type: 'file',
          accept: 'application/json',
          hidden: true,
          onChange: async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const imported = await importSave(file);
              setState(imported);
            } catch {
              patch((draft) => draft.log.unshift('Import failed: invalid save JSON.'));
            }
            e.target.value = '';
          }
        })
      )
    ),

    React.createElement('main', { className: 'layout' },
      React.createElement('section', { className: 'panel map-card' },
        React.createElement('canvas', {
          ref: mapRef,
          className: 'biome-map',
          width: 960,
          height: 540,
          onClick: clickMap,
          onTouchStart: (event) => clickMap(event.touches[0]),
          'aria-label': 'Body spread map'
        }),
        React.createElement('p', { className: 'legend muted' }, 'Tap/click to inspect a region. Shift+Click from a controlled region to spread.')
      ),

      React.createElement('aside', { className: 'sidebar' },
        React.createElement(StatPanel, { title: 'Host Status', stats: [
          ['Turn', state.turn],
          ['Host Viability', fmt(state.resources.viability)],
          ['Immune Attention', fmt(state.resources.immuneAttention)],
          ['Inflammation', fmt(state.resources.inflammation)],
          ['Damage Burden', fmt(state.resources.damage)],
          ['Controlled Regions', state.regionControlCount]
        ]}),
        React.createElement(StatPanel, { title: state.faction.name, subtitle: `${state.faction.type} · ${state.faction.inspiration}`, stats: [
          ['Biomass', fmt(state.resources.biomass)],
          ['Replication', fmt(state.resources.replication)],
          ['Diversity', fmt(state.resources.diversity)],
          ['Stealth', fmt(state.resources.stealth)],
          ['Reservoir', fmt(state.resources.reservoir)],
          ['Access', fmt(state.resources.access)]
        ]}),
        React.createElement(StatPanel, { title: `Region Intel: ${selectedRegion.name}`, subtitle: selectedRegion.system, stats: [
          ['Barrier', selectedRegion.barrier],
          ['Immune Pressure', selectedRegion.immune],
          ['Clearance', selectedRegion.clearance],
          ['Nutrients', selectedRegion.nutrients],
          ['pH', selectedRegion.pH],
          ['Routes', selectedRegion.routes.join(', ')],
          ['Status', selectedRegion.controlled ? 'Controlled' : 'Uncontrolled']
        ]}),
        React.createElement('section', { className: 'panel panel-scroll' },
          React.createElement('h3', null, 'Adaptation Lattice'),
          researchQueue.map((a) => React.createElement('article', { key: a.id, className: 'research' },
            React.createElement('strong', null, a.name),
            React.createElement('p', { className: 'muted' }, `${a.category} · Cost ${a.cost}`),
            React.createElement('p', null, a.description),
            React.createElement('p', { className: 'warn' }, `Tradeoff: ${a.tradeoff}`),
            React.createElement('button', {
              disabled: controlsDisabled || state.resources.diversity < a.cost,
              onClick: () => patch((draft) => {
                const err = researchAdaptation(draft, a);
                if (err) draft.log.unshift(err);
              })
            }, state.resources.diversity >= a.cost ? 'Mutate' : 'Insufficient Diversity')
          ))
        ),
        React.createElement('section', { className: 'panel panel-scroll' },
          React.createElement('h3', null, 'Event Feed'),
          React.createElement('ul', { className: 'log' }, state.log.slice(0, 12).map((item, i) => React.createElement('li', { key: `${item}-${i}` }, item)))
        ),
        React.createElement('section', { className: 'panel controls' },
          state.outcome && React.createElement('p', { className: state.outcome.type === 'win' ? 'good' : 'danger' }, state.outcome.text),
          React.createElement('button', {
            className: 'turn',
            disabled: controlsDisabled,
            onClick: () => patch((draft) => {
              processTurn(draft);
              if (draft.outcome) draft.log.unshift(`${draft.outcome.type.toUpperCase()}: ${draft.outcome.text}`);
            })
          }, controlsDisabled ? 'Campaign Complete' : 'End Turn')
        )
      )
    ),

    showNewGame && React.createElement(NewGameModal, {
      onClose: () => setShowNewGame(false),
      onStart: (factionId, difficulty) => {
        setState(createInitialState(factionId, difficulty));
        setShowNewGame(false);
      }
    }),

    showCodex && React.createElement(Modal, { title: 'Codex: Operation Notes', onClose: () => setShowCodex(false) },
      React.createElement('ul', { className: 'log' },
        React.createElement('li', null, 'Spread along anatomically linked regions to maintain growth momentum.'),
        React.createElement('li', null, 'Balance stealth and replication to avoid a rapid immune spike.'),
        React.createElement('li', null, 'High symptom routes can win quickly, but risk host collapse.'),
        React.createElement('li', null, 'Use adaptation tradeoffs intentionally; some are powerful late game.'),
      )
    ),

    showSettings && React.createElement(SettingsModal, {
      state,
      onClose: () => setShowSettings(false),
      onSave: (settings) => {
        patch((draft) => {
          draft.difficulty = settings.difficulty;
          draft.modifiers.scanlines = settings.scanlines;
          draft.modifiers.crt = settings.crt;
        });
        setShowSettings(false);
      }
    })
  );
}

function StatPanel({ title, subtitle, stats }) {
  return React.createElement('section', { className: 'panel' },
    React.createElement('h3', null, title),
    subtitle && React.createElement('p', { className: 'muted' }, subtitle),
    React.createElement('div', { className: 'grid' },
      stats.map(([label, value]) => [
        React.createElement('span', { key: `${label}-l`, className: 'muted' }, label),
        React.createElement('strong', { key: `${label}-v` }, value)
      ]).flat()
    )
  );
}

function Modal({ title, children, onClose }) {
  return React.createElement('div', { className: 'modal-wrap', onClick: onClose },
    React.createElement('section', { className: 'modal panel', onClick: (e) => e.stopPropagation() },
      React.createElement('div', { className: 'modal-head' },
        React.createElement('h2', null, title),
        React.createElement('button', { onClick: onClose }, 'Close')
      ),
      children
    )
  );
}

function NewGameModal({ onClose, onStart }) {
  const [faction, setFaction] = useState('enveloped-rna-virus');
  const [difficulty, setDifficulty] = useState('normal');

  return React.createElement(Modal, { title: 'Start New Infection', onClose },
    React.createElement('div', { className: 'stack' },
      React.createElement('label', null, 'Faction'),
      React.createElement('select', { value: faction, onChange: (e) => setFaction(e.target.value) },
        FACTIONS.map((f) => React.createElement('option', { key: f.id, value: f.id }, f.name))
      ),
      React.createElement('label', null, 'Difficulty'),
      React.createElement('select', { value: difficulty, onChange: (e) => setDifficulty(e.target.value) },
        ['easy', 'normal', 'hard'].map((d) => React.createElement('option', { key: d, value: d }, d))
      ),
      React.createElement('button', { className: 'turn', onClick: () => onStart(faction, difficulty) }, 'Launch Campaign')
    )
  );
}

function SettingsModal({ state, onClose, onSave }) {
  const [difficulty, setDifficulty] = useState(state.difficulty || 'normal');
  const [scanlines, setScanlines] = useState(Boolean(state.modifiers.scanlines));
  const [crt, setCrt] = useState(Boolean(state.modifiers.crt));

  return React.createElement(Modal, { title: 'Display & Difficulty', onClose },
    React.createElement('div', { className: 'stack' },
      React.createElement('label', null, 'Difficulty'),
      React.createElement('select', { value: difficulty, onChange: (e) => setDifficulty(e.target.value) },
        ['easy', 'normal', 'hard'].map((d) => React.createElement('option', { key: d, value: d }, d))
      ),
      React.createElement('label', { className: 'check' },
        React.createElement('input', { type: 'checkbox', checked: scanlines, onChange: (e) => setScanlines(e.target.checked) }),
        'Retro scanlines'
      ),
      React.createElement('label', { className: 'check' },
        React.createElement('input', { type: 'checkbox', checked: crt, onChange: (e) => setCrt(e.target.checked) }),
        'CRT color boost'
      ),
      React.createElement('button', { className: 'turn', onClick: () => onSave({ difficulty, scanlines, crt }) }, 'Apply Settings')
    )
  );
}

createRoot(document.getElementById('root')).render(React.createElement(App));
