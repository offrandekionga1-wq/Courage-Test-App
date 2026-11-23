// ---------------------------------------------------------------------------
// Neon Clash — point d'entrée : écrans, entrées, boucle.
// ---------------------------------------------------------------------------
import './styles.css';
import { VW, VH, Loop, Sfx, newPad, clearEdges, Pad, clamp } from './core';
import { FightScene } from './fight';
import { CharId, ROSTER_IDS } from './roster';
import { loadSprites } from './sprites';
import {
  Hud, Mode, buildControls, TouchCtl, titleScreen, selectScreen, vsScreen,
  pauseScreen, resultScreen, helpScreen, clearScreens, load, save,
} from './ui';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;
const hud = new Hud();
const pads: [Pad, Pad] = [newPad(), newPad()];
const settings = load();
Sfx.setEnabled(settings.sound);

let scene: FightScene | null = null;
let mode: Mode = '1p';
let picks: [CharId, CharId] = ['mika', 'ray'];
let paused = false;
let touch: TouchCtl | null = null;
let matchStart = 0;
let bestCombo = 0;
type AppState = 'title' | 'select' | 'vs' | 'fight' | 'result' | 'pause' | 'help';
let app: AppState = 'title';
let prevApp: AppState = 'title';

// ------------------------------------------------------------- Affichage --
let view = { k: 1, ox: 0, oy: 0 };
let vignette: CanvasGradient | null = null;
function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = window.innerWidth, hgt = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(hgt * dpr);
  const k = Math.min(w / VW, hgt / VH) * dpr;
  view = { k, ox: (w * dpr - VW * k) / 2, oy: (hgt * dpr - VH * k) / 2 };
  const cw = canvas.width, ch = canvas.height;
  const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.34, cw / 2, ch / 2, Math.max(cw, ch) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  vignette = g;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
resize();

// --------------------------------------------------------------- Clavier --
const keyMap1: Record<string, keyof Pad> = {
  KeyA: 'left', KeyQ: 'left', KeyD: 'right', KeyW: 'up', KeyZ: 'up', KeyS: 'down',
  KeyJ: 'atk', Space: 'atk', KeyK: 'sp', KeyL: 'ult',
};
const keyMap1Solo: Record<string, keyof Pad> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
};
const keyMap2: Record<string, keyof Pad> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  Numpad1: 'atk', Digit1: 'atk', Numpad2: 'sp', Digit2: 'sp', Numpad3: 'ult', Digit3: 'ult',
};

function applyKey(code: string, down: boolean): boolean {
  let used = false;
  const tables: [Record<string, keyof Pad>, 0 | 1][] = mode === '2p'
    ? [[keyMap1, 0], [keyMap2, 1]]
    : [[keyMap1, 0], [keyMap1Solo, 0]];
  for (const [map, idx] of tables) {
    const k = map[code];
    if (!k) continue;
    used = true;
    const pad = pads[idx];
    const was = pad[k] as boolean;
    (pad[k] as boolean) = down;
    if (down && !was) {
      if (k === 'atk') pad.atkEdge = true;
      else if (k === 'sp') pad.spEdge = true;
      else if (k === 'ult') pad.ultEdge = true;
      else if (k === 'up') pad.upEdge = true;
    }
  }
  return used;
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  Sfx.unlock();
  if (e.code === 'Escape' || e.code === 'KeyP') { if (app === 'fight') togglePause(); return; }
  if (applyKey(e.code, true)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { if (applyKey(e.code, false)) e.preventDefault(); });
window.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && app === 'fight') togglePause();
});

// -------------------------------------------------------------- Écrans ----
function goTitle(): void {
  app = 'title';
  scene = null;
  hud.show(false);
  touch?.destroy(); touch = null;
  titleScreen(settings, (m) => { mode = m; goSelect(); }, () => openHelp());
}

function goSelect(): void {
  app = 'select';
  hud.show(false);
  selectScreen(mode, (a, b) => { picks = [a, b]; goVs(); }, goTitle);
}

function goVs(): void {
  app = 'vs';
  // l'écran VS dure le temps de charger les planches de sprites
  const ready = loadSprites([picks[0], picks[1]]).catch(() => []);
  let shown = false;
  vsScreen(picks[0], picks[1], () => { shown = true; void ready.then(() => shown && startFight()); });
}

function startFight(): void {
  clearScreens();
  app = 'fight';
  paused = false;
  bestCombo = 0;
  matchStart = performance.now();
  scene = new FightScene(picks[0], picks[1], {
    cpu: mode === '1p' ? 1 : mode === 'training' ? -1 : -1,
    difficulty: settings.difficulty,
    rounds: mode === 'training' ? 99 : 2,
  });
  scene.onMatchEnd = (w) => setTimeout(() => showResult(w), 1400);
  hud.setup(picks[0], picks[1]);
  hud.show(true);
  touch?.destroy();
  touch = buildControls(mode === '2p' ? '2p' : '1p', pads);
  for (const p of pads) {
    p.left = p.right = p.up = p.down = p.atk = p.sp = p.ult = false;
    clearEdges(p);
  }
  const hint = document.getElementById('hint')!;
  hint.classList.remove('gone');
  setTimeout(() => hint.classList.add('gone'), 6000);
}

function showResult(w: 0 | 1): void {
  if (!scene) return;
  app = 'result';
  hud.show(false);
  const secs = Math.round((performance.now() - matchStart) / 1000);
  resultScreen(
    picks[w], picks[w === 0 ? 1 : 0],
    {
      rounds: `${scene.f0.wonRounds} – ${scene.f1.wonRounds}`,
      combo: bestCombo,
      time: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
    },
    startFight, goSelect, goTitle,
  );
}

function togglePause(): void {
  if (app === 'fight') {
    paused = true; app = 'pause';
    pauseScreen(() => { clearScreens(); app = 'fight'; paused = false; }, () => openHelp(), goTitle);
  } else if (app === 'pause') {
    clearScreens(); app = 'fight'; paused = false;
  }
}
document.getElementById('pauseBtn')!.addEventListener('click', togglePause);

function openHelp(): void {
  prevApp = app === 'help' ? prevApp : app;
  app = 'help';
  helpScreen(() => {
    if (prevApp === 'pause') { app = 'fight'; togglePause(); }
    else if (prevApp === 'title') goTitle();
    else { clearScreens(); app = prevApp; }
  }, picks[0]);
}

// ---------------------------------------------------------------- Boucle --
const loop = new Loop(
  (dt) => {
    if (!scene || app !== 'fight' || paused) return;
    if (mode === 'training') {
      scene.f0.meter = 100;
      scene.f1.meter = Math.min(100, scene.f1.meter + dt * 6);
    }
    scene.update(dt, pads);
    bestCombo = Math.max(bestCombo, scene.f0.combo, scene.f1.combo);
    clearEdges(pads[0]);
    clearEdges(pads[1]);
  },
  () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05040a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (scene && (app === 'fight' || app === 'pause' || (app === 'help' && prevApp === 'pause'))) {
      // pas de rognage : le décor déborde et remplit les bandes latérales
      ctx.setTransform(view.k, 0, 0, view.k, view.ox, view.oy);
      scene.render(ctx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (vignette) { ctx.fillStyle = vignette; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      const s = scene.hud();
      hud.update(s, scene.round);
      touch?.setUlt(scene.f0.meter >= 100, clamp(scene.f0.meter, 0, 100));
    }
  },
);
loop.start();

// amorçage
goTitle();
void loadSprites(ROSTER_IDS).catch(() => []);
save(settings);
if (!ROSTER_IDS.includes(picks[0])) picks = ['mika', 'ray'];
