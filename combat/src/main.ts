// ---------------------------------------------------------------------------
// Neon Clash — point d'entrée : écrans, entrées, boucle.
// ---------------------------------------------------------------------------
import './styles.css';
import { VW, VH, Loop, Sfx, newPad, clearEdges, Pad, clamp } from './core';
import { FightScene } from './fight';
import { Music } from './music';
import { CharId, ROSTER_IDS } from './roster';
import { loadSprites } from './sprites';
import {
  Hud, Mode, buildControls, TouchCtl, titleScreen, selectScreen, vsScreen,
  pauseScreen, resultScreen, helpScreen, clearScreens, load, save,
  lobbyScreen, netSelectScreen, LobbyApi, NetSelectApi,
} from './ui';
import { NetSession, padBits, bitsToPad, lanAvailable, Peer } from './net';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;
const hud = new Hud();
const pads: [Pad, Pad] = [newPad(), newPad()];
const settings = load();
Sfx.setEnabled(settings.sound);
Music.setEnabled(settings.music);
Sfx.whenReady((ctx, master) => {
  Music.attach(ctx, master);
  if (app === 'title' || app === 'select' || app === 'result') Music.play('menu');
});

let scene: FightScene | null = null;
let mode: Mode = '1p';
let picks: [CharId, CharId] = ['mika', 'ray'];
let paused = false;
let touch: TouchCtl | null = null;
let matchStart = 0;
let bestCombo = 0;
type AppState = 'title' | 'select' | 'vs' | 'fight' | 'result' | 'pause' | 'help' | 'lobby' | 'netselect';
let app: AppState = 'title';
let prevApp: AppState = 'title';

// --------------------------------------------------------- réseau local --
const net = new NetSession();
let lobby: LobbyApi | null = null;
let netSel: NetSelectApi | null = null;
let myChar: CharId | null = null;
let theirChar: CharId | null = null;
let guestBits = 0;
const guestPad = newPad();
const netBadge = document.createElement('div');
netBadge.className = 'netbadge';
netBadge.style.display = 'none';
document.getElementById('hud')!.appendChild(netBadge);

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
  Music.play('menu');
  scene = null;
  hud.show(false);
  touch?.destroy(); touch = null;
  titleScreen(settings, (m) => {
    mode = m;
    if (m === 'lan') goLobby();
    else goSelect();
  }, () => openHelp());
}

function goLobby(): void {
  app = 'lobby';
  hud.show(false);
  myChar = theirChar = null;
  lobby = lobbyScreen({
    onHost: () => { void net.host('Partie de ' + (navigator.userAgent.includes('Android') ? 'téléphone' : 'PC')); },
    onSearch: () => { void net.search(); },
    onJoin: (p: Peer) => { void net.join(p); },
    onManual: (host: string) => { void net.join({ name: host, host, port: 8777 }); },
    onBack: () => { void net.close(); goTitle(); },
  });
  lobby.setPeers(net.peers);
  void lanAvailable().then((ok) => {
    if (!ok && app === 'lobby') {
      lobby?.setState('Réseau indisponible',
        'Le duel Wi-Fi demande l\u2019application Android. Dans un navigateur, lance d\u2019abord tools/lan-relay.cjs.');
    }
  });
}

function goNetSelect(): void {
  app = 'netselect';
  hud.show(false);
  myChar = theirChar = null;
  const role = net.role === 'host' ? 'host' : 'guest';
  netSel = netSelectScreen(role, (id) => {
    myChar = id;
    net.send({ m: 'char', id });
    netSel?.setNote(theirChar ? 'Lancement…' : 'En attente de l\u2019autre joueur…');
    tryStartNet();
  }, () => { void net.close(); goTitle(); });
  if (theirChar) netSel.setTheirs(theirChar);
}

/** L'hôte lance dès que les deux personnages sont connus. */
function tryStartNet(): void {
  if (net.role !== 'host' || !myChar || !theirChar) return;
  picks = [myChar, theirChar];
  goVs();
}

function goSelect(): void {
  app = 'select';
  hud.show(false);
  selectScreen(mode, (a, b) => { picks = [a, b]; goVs(); }, goTitle);
}

function goVs(): void {
  app = 'vs';
  // en réseau, c'est l'hôte qui donne le départ (première partie et revanches)
  if (mode === 'lan' && net.role === 'host') net.send({ m: 'start', p1: picks[0], p2: picks[1] });
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
    cpu: mode === '1p' ? 1 : -1,
    difficulty: settings.difficulty,
    rounds: mode === 'training' ? 99 : 2,
  });
  if (mode === 'lan' && net.role) {
    scene.netRole = net.role;
    scene.netSend = (msg) => net.send(msg);
    guestBits = 0;
    netBadge.textContent = net.role === 'host' ? 'Hôte · joueur 1' : 'Invité · joueur 2';
    netBadge.style.display = '';
  } else {
    netBadge.style.display = 'none';
  }
  scene.onMatchEnd = (w) => setTimeout(() => showResult(w), 1400);
  hud.setup(picks[0], picks[1]);
  hud.show(true);
  touch?.destroy();
  touch = buildControls(mode === '2p' ? '2p' : '1p', pads);
  if (mode === 'lan') hud.show(true);
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
  Music.play('menu');
  hud.show(false);
  const secs = Math.round((performance.now() - matchStart) / 1000);
  const lan = mode === 'lan';
  resultScreen(
    picks[w], picks[w === 0 ? 1 : 0],
    {
      rounds: `${scene.f0.wonRounds} – ${scene.f1.wonRounds}`,
      combo: bestCombo,
      time: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
    },
    lan ? goVs : startFight,
    lan ? goNetSelect : goSelect,
    () => { if (lan) { net.send({ m: 'bye' }); void net.close(); } goTitle(); },
    lan && net.role !== 'host' ? 'guest' : undefined,
  );
}

function togglePause(): void {
  if (app === 'fight') {
    // en réseau, le combat continue : un joueur ne doit pas pouvoir geler l'autre
    paused = mode !== 'lan';
    app = 'pause';
    Music.duck(true);
    pauseScreen(() => { clearScreens(); app = 'fight'; paused = false; Music.duck(false); },
                () => openHelp(),
                () => { if (mode === 'lan') { net.send({ m: 'bye' }); void net.close(); } goTitle(); });
  } else if (app === 'pause') {
    clearScreens(); app = 'fight'; paused = false; Music.duck(false);
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

net.onState = (st, info) => {
  if (app === 'lobby' && lobby) {
    const labels: Record<string, [string, string]> = {
      idle: ['Choisis un rôle', 'Un joueur héberge, l\u2019autre rejoint.'],
      hosting: ['En attente d\u2019un joueur', info ? `Adresse : ${info}` : 'Garde cet écran ouvert.'],
      searching: ['Recherche sur le Wi-Fi…', 'Les parties trouvées apparaissent à droite.'],
      connecting: ['Connexion…', ''],
      connected: ['Connecté', 'Choisissez vos personnages.'],
      error: ['Connexion impossible', info || 'Vérifie que les deux appareils sont sur le même Wi-Fi.'],
    };
    const [a, b] = labels[st] ?? ['', ''];
    lobby.setState(a, b);
  }
  if (st === 'connected' && (app === 'lobby')) goNetSelect();
  if ((st === 'idle' || st === 'error') && (app === 'fight' || app === 'netselect' || app === 'vs')) {
    scene = null;
    goTitle();
  }
  netBadge.style.display = st === 'connected' ? '' : 'none';
};

net.onPeers = (p) => lobby?.setPeers(p);

net.onMessage = (m) => {
  switch (m.m) {
    case 'char':
      theirChar = m.id;
      netSel?.setTheirs(m.id);
      if (myChar) tryStartNet();
      break;
    case 'start':
      picks = [m.p1, m.p2];
      goVs();
      break;
    case 'pad':
      guestBits = m.b;
      break;
    case 'snap':
      scene?.applySnapshot(m.s);
      break;
    case 'bye':
      void net.close();
      break;
    default:
      break;
  }
};

// ---------------------------------------------------------------- Boucle --
const loop = new Loop(
  (dt) => {
    if (!scene || app !== 'fight' || paused) return;
    if (mode === 'lan' && net.role === 'guest') {
      // l'invité n'envoie que ses touches : l'hôte fait autorité
      net.send({ m: 'pad', b: padBits(pads[0]) });
      clearEdges(pads[0]);
      scene.update(dt, pads);
      return;
    }
    if (mode === 'lan' && net.role === 'host') {
      bitsToPad(guestBits, guestPad);
      pads[1] = guestPad;
      guestBits &= ~(128 | 256 | 512 | 1024);   // fronts consommés une seule fois
    }
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
