// ---------------------------------------------------------------------------
// Neon Clash — données des 4 combattants : stats, coups normaux, 4 spéciaux et
// un super chacun. Les noms des techniques viennent des fiches de référence.
// ---------------------------------------------------------------------------
import { Pose, POSE, CharId } from './art';
import { Fx, SlashArc, RuneCircle, Bolt, Shock, Pillar, Dome, FoxSigil, VoidRift } from './vfx';
import { rr, Sfx } from './core';

export type { CharId };

export interface ProjSpec {
  kind: 'card' | 'ball' | 'fox' | 'crescent' | 'bolt';
  speed: number; damage: number; hitstun: number; life: number;
  w: number; h: number; dy: number;
  kbx: number; kby: number;
  pierce?: boolean;
  spin?: number;
}

export interface FighterRef {
  id: CharId; x: number; y: number; face: number; cx: number; cy: number;
  meter: number; hp: number;
}

export interface GameApi {
  fx: Fx;
  shake(amount: number): void;
  flash(color: string, alpha: number, time?: number): void;
  slow(time: number, scale?: number): void;
  spawnProj(owner: FighterRef, spec: ProjSpec, dy?: number, angle?: number): void;
  afterimage(owner: FighterRef, life?: number): void;
  banner(text: string, color: string): void;
  cinematic(owner: FighterRef, time: number): void;
  hitAll(owner: FighterRef, damage: number, kbx: number, kby: number, hitstun: number): void;
}

type Hook = (f: FighterRef, g: GameApi) => void;

export interface Move {
  key: string;
  name: string;
  startup: number; active: number; recovery: number;
  poses: [Pose, Pose, Pose];
  damage: number; hitstun: number;
  kbx: number; kby: number;
  box: { x: number; y: number; w: number; h: number }; // x devant, y depuis le sol (négatif = haut)
  cost?: number;        // coût en jauge (0..100)
  gain?: number;        // gain en jauge quand on touche
  launcher?: boolean;
  dashX?: number;       // impulsion horizontale au déclenchement
  dashY?: number;
  guardTime?: number;   // barrière défensive
  invul?: boolean;
  hits?: number;        // nombre de touches (multi-hit)
  noHitbox?: boolean;
  sfx?: 'whoosh' | 'zap' | 'boom' | 'hit' | 'none';
  onStart?: Hook;
  onStrike?: Hook;
  onTick?: Hook;
  superMove?: boolean;
}

export interface CharStats {
  hp: number; walk: number; back: number; jump: number; weight: number; scale: number;
}

export interface Character {
  id: CharId; name: string; kana: string;
  role: string; style: string; spec: string; quote: string;
  color: string; color2: string;
  stats: CharStats;
  normals: { light: Move; medium: Move; heavy: Move; launcher: Move; air: Move };
  specials: { neutral: Move; forward: Move; up: Move; back: Move };
  ult: Move;
}

const F = (f: FighterRef) => ({ x: f.cx, y: f.cy });

// Petites fabriques pour éviter la répétition -------------------------------
const light = (over: Partial<Move>): Move => ({
  key: 'light', name: 'Jab', startup: 0.07, active: 0.06, recovery: 0.12,
  poses: [POSE.jabWind, POSE.jab, POSE.jab],
  damage: 32, hitstun: 0.22, kbx: 120, kby: -30,
  box: { x: 34, y: -118, w: 54, h: 34 }, gain: 7, sfx: 'whoosh', ...over,
});
const medium = (over: Partial<Move>): Move => ({
  key: 'medium', name: 'Cross', startup: 0.09, active: 0.07, recovery: 0.16,
  poses: [POSE.crossWind, POSE.cross, POSE.cross],
  damage: 44, hitstun: 0.26, kbx: 170, kby: -40,
  box: { x: 38, y: -120, w: 62, h: 36 }, gain: 8, sfx: 'whoosh', ...over,
});
const heavy = (over: Partial<Move>): Move => ({
  key: 'heavy', name: 'Roundhouse', startup: 0.13, active: 0.09, recovery: 0.26,
  poses: [POSE.kickWind, POSE.spinKick, POSE.kick],
  damage: 70, hitstun: 0.36, kbx: 330, kby: -150,
  box: { x: 34, y: -124, w: 78, h: 54 }, gain: 11, sfx: 'whoosh', ...over,
});
const launcher = (over: Partial<Move>): Move => ({
  key: 'launcher', name: 'Uppercut', startup: 0.11, active: 0.1, recovery: 0.3,
  poses: [POSE.crouch, POSE.upper, POSE.upper],
  damage: 58, hitstun: 0.5, kbx: 110, kby: -420, launcher: true,
  box: { x: 26, y: -168, w: 56, h: 96 }, gain: 12, sfx: 'whoosh', ...over,
});
const air = (over: Partial<Move>): Move => ({
  key: 'air', name: 'Air Strike', startup: 0.07, active: 0.14, recovery: 0.14,
  poses: [POSE.jump, POSE.airAtk, POSE.airAtk],
  damage: 46, hitstun: 0.3, kbx: 180, kby: 80,
  box: { x: 26, y: -96, w: 66, h: 60 }, gain: 9, sfx: 'whoosh', ...over,
});

const slashFx = (color: string, r = 74, w = 24, sweep = -2.3): Hook => (f, g) => {
  g.fx.giz(new SlashArc(f.cx + f.face * 22, f.cy - 6, f.face > 0 ? 1.3 : Math.PI - 1.3,
    f.face > 0 ? sweep : -sweep, r, color, 0.26, w));
  g.fx.trail(f.cx + f.face * 40, f.cy, color, 4);
};

// =================================================================== MIKA ==
const mika: Character = {
  id: 'mika', name: 'MIKA', kana: '三カ',
  role: 'Soutien', style: 'Contrôle / Défense', spec: 'Arts magiques',
  quote: '« Le destin est entre mes mains… »',
  color: '#ffc820', color2: '#ffe987',
  stats: { hp: 1000, walk: 170, back: 140, jump: 630, weight: 1, scale: 1.42 },
  normals: {
    light: light({ onStrike: slashFx('#ffc820', 54, 16) }),
    medium: medium({ onStrike: slashFx('#ffc820', 62, 20) }),
    heavy: heavy({ name: 'Talisman Kick', onStrike: slashFx('#ffe987', 84, 28) }),
    launcher: launcher({}),
    air: air({ onStrike: slashFx('#ffc820', 60, 20) }),
  },
  specials: {
    neutral: {
      key: 'sp_n', name: 'Spirit Seal', startup: 0.17, active: 0.08, recovery: 0.3,
      poses: [POSE.castWind, POSE.cast, POSE.cast],
      damage: 0, hitstun: 0, kbx: 0, kby: 0, box: { x: 0, y: 0, w: 0, h: 0 },
      noHitbox: true, cost: 0, gain: 0, sfx: 'none',
      onStart: (f, g) => {
        g.fx.giz(new RuneCircle(f.cx + f.face * 36, f.cy + 10, 40, '#ffc820', 0.55, 3));
        Sfx.tone(520, 0.2, 'triangle', 0.18, 980);
      },
      onStrike: (f, g) => {
        for (let i = 0; i < 3; i++) {
          g.spawnProj(f, {
            kind: 'card', speed: 360 + i * 36, damage: 26, hitstun: 0.2, life: 1.6,
            w: 26, h: 34, dy: -118 + (i - 1) * 26, kbx: 110, kby: -40, spin: 7,
          }, (i - 1) * 24);
        }
        Sfx.whoosh(0.2);
        g.fx.burst(f.cx + f.face * 40, f.cy - 10, '#ffc820', 10, 180);
      },
    },
    forward: {
      key: 'sp_f', name: 'Wind Blade', startup: 0.13, active: 0.16, recovery: 0.26,
      poses: [POSE.castWind, POSE.dash, POSE.cross],
      damage: 72, hitstun: 0.38, kbx: 300, kby: -170, dashX: 430,
      box: { x: 18, y: -140, w: 88, h: 76 }, cost: 0, gain: 14, sfx: 'whoosh',
      onStart: (f, g) => { g.afterimage(f, 0.3); },
      onTick: (f, g) => { g.fx.trail(f.cx, f.cy, '#ffe987', 1); },
      onStrike: (f, g) => {
        slashFx('#ffc820', 92, 32)(f, g);
        g.fx.giz(new Shock(f.cx + f.face * 46, f.cy, '#ffe987', 0.3, 60));
        g.shake(6);
      },
    },
    up: {
      key: 'sp_u', name: 'Divine Judgment', startup: 0.22, active: 0.2, recovery: 0.36,
      poses: [POSE.superCharge, POSE.cast, POSE.cast],
      damage: 86, hitstun: 0.5, kbx: 120, kby: -430, launcher: true,
      box: { x: 46, y: -220, w: 86, h: 220 }, cost: 25, gain: 10, sfx: 'boom',
      onStart: (f, g) => {
        g.fx.giz(new RuneCircle(f.cx + f.face * 88, f.y - 4, 56, '#ffc820', 0.5, 4));
      },
      onStrike: (f, g) => {
        g.fx.giz(new Pillar(f.cx + f.face * 88, f.y, '#ffc820', 0.6, 62, 320));
        g.fx.burst(f.cx + f.face * 88, f.y - 60, '#ffe987', 22, 300);
        g.shake(10); Sfx.boom();
      },
    },
    back: {
      key: 'sp_b', name: 'Barrier of Fate', startup: 0.12, active: 0.05, recovery: 0.22,
      poses: [POSE.guard, POSE.burst, POSE.guard],
      damage: 0, hitstun: 0, kbx: 0, kby: 0, box: { x: 0, y: 0, w: 0, h: 0 },
      noHitbox: true, guardTime: 2.2, cost: 20, sfx: 'none',
      onStart: (f, g) => {
        g.fx.giz(new Dome(() => F(f), 62, '#ffc820', 2.2));
        g.fx.giz(new RuneCircle(f.x, f.y, 52, '#ffe987', 0.6, 2.4));
        Sfx.tone(300, 0.4, 'sine', 0.2, 760);
      },
    },
  },
  ult: {
    key: 'ult', name: 'Eternal Fate', startup: 0.5, active: 0.7, recovery: 0.6,
    poses: [POSE.superCharge, POSE.superBlast, POSE.win],
    damage: 300, hitstun: 0.9, kbx: 420, kby: -300, hits: 6, cost: 100,
    box: { x: -40, y: -240, w: 320, h: 250 }, superMove: true, sfx: 'boom',
    onStart: (f, g) => {
      g.cinematic(f, 1.1); g.banner('ETERNAL FATE', '#ffc820');
      g.fx.giz(new RuneCircle(f.cx, f.cy, 120, '#ffc820', 1.4, 2.2, 1));
      for (let i = 0; i < 26; i++) {
        const a = rr(0, Math.PI * 2);
        g.fx.add({
          x: f.cx + Math.cos(a) * 170, y: f.cy + Math.sin(a) * 110,
          vx: -Math.cos(a) * 150, vy: -Math.sin(a) * 110,
          color: '#ffc820', kind: 'card', size: 13, max: 1.2, rot: rr(0, 6), vr: rr(-6, 6), drag: 0.99, add: false,
        });
      }
    },
    onTick: (f, g) => {
      if (Math.random() < 0.3) g.fx.trail(f.cx + rr(-60, 60), f.cy + rr(-40, 40), '#ffe987', 1);
    },
    onStrike: (f, g) => {
      g.fx.giz(new Pillar(f.cx + f.face * 110, f.y, '#ffc820', 0.9, 120, 420));
      for (let i = 0; i < 5; i++) {
        g.fx.giz(new Pillar(f.cx + f.face * (60 + i * 52), f.y, '#ffe987', 0.7, 40, 300));
      }
      g.fx.burst(f.cx + f.face * 120, f.cy, '#ffffff', 36, 420);
      g.shake(22); g.flash('#ffe987', 0.6); Sfx.boom();
    },
  },
};

// ==================================================================== RAY ==
const ray: Character = {
  id: 'ray', name: 'RAY', kana: 'レイ',
  role: 'Rôdeur', style: 'Vitesse / Énergie', spec: 'Arts de la foudre',
  quote: '« La foudre ne rate jamais… »',
  color: '#3ba7ff', color2: '#9ddcff',
  stats: { hp: 950, walk: 205, back: 175, jump: 680, weight: 0.92, scale: 1.4 },
  normals: {
    light: light({ startup: 0.06, damage: 30, onStrike: slashFx('#3ba7ff', 52, 15) }),
    medium: medium({ damage: 42, onStrike: slashFx('#3ba7ff', 60, 19) }),
    heavy: heavy({ name: 'Volt Kick', damage: 66, onStrike: (f, g) => {
      slashFx('#9ddcff', 86, 28)(f, g);
      g.fx.giz(new Bolt(f.cx + f.face * 20, f.cy - 20, f.cx + f.face * 96, f.cy + 14, '#3ba7ff', 0.2, 16, 2.4));
    } }),
    launcher: launcher({}),
    air: air({ onStrike: slashFx('#3ba7ff', 62, 20) }),
  },
  specials: {
    neutral: {
      key: 'sp_n', name: 'Electric Ball', startup: 0.16, active: 0.07, recovery: 0.3,
      poses: [POSE.castWind, POSE.cast, POSE.cast],
      damage: 0, hitstun: 0, kbx: 0, kby: 0, box: { x: 0, y: 0, w: 0, h: 0 },
      noHitbox: true, sfx: 'none',
      onStart: (f, g) => { g.fx.giz(new Shock(f.cx + f.face * 34, f.cy - 6, '#3ba7ff', 0.3, 36)); Sfx.tone(300, 0.2, 'sawtooth', 0.14, 820); },
      onStrike: (f, g) => {
        g.spawnProj(f, { kind: 'ball', speed: 300, damage: 48, hitstun: 0.3, life: 2.2, w: 36, h: 36, dy: -116, kbx: 180, kby: -70 });
        Sfx.zap();
        g.fx.burst(f.cx + f.face * 38, f.cy - 8, '#9ddcff', 12, 200);
      },
    },
    forward: {
      key: 'sp_f', name: 'Thunder Dash', startup: 0.1, active: 0.2, recovery: 0.24,
      poses: [POSE.backA, POSE.dash, POSE.cross],
      damage: 64, hitstun: 0.34, kbx: 260, kby: -120, dashX: 540, invul: true,
      box: { x: 10, y: -136, w: 92, h: 76 }, gain: 13, sfx: 'zap',
      onStart: (f, g) => { g.afterimage(f, 0.34); Sfx.zap(); },
      onTick: (f, g) => {
        g.fx.trail(f.cx, f.cy, '#3ba7ff', 2);
        if (Math.random() < 0.5) g.fx.giz(new Bolt(f.cx - f.face * 40, f.cy + rr(-30, 30), f.cx, f.cy + rr(-20, 20), '#9ddcff', 0.14, 12, 2));
      },
      onStrike: (f, g) => {
        slashFx('#9ddcff', 90, 30)(f, g);
        g.fx.giz(new Bolt(f.cx + f.face * 30, f.cy - 60, f.cx + f.face * 70, f.cy + 30, '#3ba7ff', 0.2, 20, 3));
        g.shake(7);
      },
    },
    up: {
      key: 'sp_u', name: 'Lightning Slash', startup: 0.1, active: 0.18, recovery: 0.34,
      poses: [POSE.crouch, POSE.upper, POSE.fall],
      damage: 78, hitstun: 0.5, kbx: 140, kby: -480, launcher: true, dashY: -420, dashX: 90,
      box: { x: 20, y: -200, w: 70, h: 150 }, cost: 25, gain: 10, sfx: 'zap',
      onStart: (f, g) => { Sfx.zap(); g.fx.giz(new Shock(f.cx, f.y, '#3ba7ff', 0.3, 60, 0.4)); },
      onStrike: (f, g) => {
        g.fx.giz(new SlashArc(f.cx + f.face * 16, f.cy - 10, f.face > 0 ? 2.6 : Math.PI - 2.6, f.face > 0 ? -2.6 : 2.6, 96, '#9ddcff', 0.3, 32));
        g.fx.giz(new Bolt(f.cx, f.cy - 180, f.cx + f.face * 24, f.cy + 40, '#3ba7ff', 0.26, 26, 3.4));
        g.shake(9);
      },
    },
    back: {
      key: 'sp_b', name: 'Storm Guard', startup: 0.1, active: 0.05, recovery: 0.2,
      poses: [POSE.guard, POSE.burst, POSE.guard],
      damage: 0, hitstun: 0, kbx: 0, kby: 0, box: { x: 0, y: 0, w: 0, h: 0 },
      noHitbox: true, guardTime: 2, cost: 20, sfx: 'none',
      onStart: (f, g) => {
        g.fx.giz(new Dome(() => F(f), 58, '#3ba7ff', 2));
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          g.fx.giz(new Bolt(f.cx, f.cy, f.cx + Math.cos(a) * 58, f.cy + Math.sin(a) * 58, '#9ddcff', 0.25, 10, 2));
        }
        Sfx.zap();
      },
    },
  },
  ult: {
    key: 'ult', name: 'RaiStorm Inferno', startup: 0.5, active: 0.75, recovery: 0.55,
    poses: [POSE.superCharge, POSE.superBlast, POSE.win],
    damage: 300, hitstun: 0.9, kbx: 380, kby: -340, hits: 7, cost: 100,
    box: { x: -60, y: -260, w: 360, h: 270 }, superMove: true, sfx: 'boom',
    onStart: (f, g) => {
      g.cinematic(f, 1.1); g.banner('RAISTORM INFERNO', '#3ba7ff');
      g.fx.giz(new Shock(f.cx, f.cy, '#9ddcff', 0.6, 220));
      Sfx.zap();
    },
    onTick: (f, g) => {
      if (Math.random() < 0.55) {
        const x = f.cx + rr(-40, 260) * f.face;
        g.fx.giz(new Bolt(x + rr(-40, 40), f.cy - 260, x, f.y, '#3ba7ff', 0.2, 30, 3));
        g.fx.trail(x, f.y - 20, '#9ddcff', 2);
      }
    },
    onStrike: (f, g) => {
      g.fx.giz(new Pillar(f.cx + f.face * 120, f.y, '#3ba7ff', 1, 140, 440));
      g.fx.burst(f.cx + f.face * 120, f.cy, '#ffffff', 40, 460);
      g.shake(24); g.flash('#9ddcff', 0.55); Sfx.boom();
    },
  },
};

// ==================================================================== ZEN ==
const zen: Character = {
  id: 'zen', name: 'ZEN', kana: 'ゼン',
  role: 'Combattant', style: 'Vitesse / Équilibré', spec: 'Arts de l’énergie',
  quote: '« Je vais te montrer ma vraie puissance… »',
  color: '#a35cff', color2: '#d7b2ff',
  stats: { hp: 1020, walk: 190, back: 160, jump: 650, weight: 1.02, scale: 1.42 },
  normals: {
    light: light({ damage: 34, onStrike: slashFx('#a35cff', 54, 16) }),
    medium: medium({ damage: 46, onStrike: slashFx('#a35cff', 62, 20) }),
    heavy: heavy({ name: 'Void Kick', damage: 74, onStrike: (f, g) => {
      slashFx('#d7b2ff', 88, 30)(f, g);
      g.fx.giz(new VoidRift(f.cx + f.face * 70, f.cy, 42, '#a35cff', 0.4));
    } }),
    launcher: launcher({}),
    air: air({ onStrike: slashFx('#a35cff', 62, 22) }),
  },
  specials: {
    neutral: {
      key: 'sp_n', name: 'Energy Burst', startup: 0.18, active: 0.07, recovery: 0.3,
      poses: [POSE.castWind, POSE.cast, POSE.cast],
      damage: 0, hitstun: 0, kbx: 0, kby: 0, box: { x: 0, y: 0, w: 0, h: 0 },
      noHitbox: true, sfx: 'none',
      onStart: (f, g) => { g.fx.giz(new RuneCircle(f.cx + f.face * 34, f.cy, 34, '#a35cff', 0.45, 4, 1)); },
      onStrike: (f, g) => {
        g.spawnProj(f, { kind: 'ball', speed: 330, damage: 52, hitstun: 0.32, life: 2, w: 40, h: 40, dy: -118, kbx: 210, kby: -80 });
        g.fx.burst(f.cx + f.face * 40, f.cy - 6, '#d7b2ff', 14, 230);
        Sfx.tone(180, 0.3, 'sawtooth', 0.2, 60);
      },
    },
    forward: {
      key: 'sp_f', name: 'Shadow Dash', startup: 0.09, active: 0.18, recovery: 0.22,
      poses: [POSE.backA, POSE.dash, POSE.cross],
      damage: 62, hitstun: 0.32, kbx: 250, kby: -110, dashX: 500, invul: true,
      box: { x: 10, y: -136, w: 88, h: 74 }, gain: 13, sfx: 'whoosh',
      onStart: (f, g) => { g.afterimage(f, 0.3); Sfx.whoosh(0.25); },
      onTick: (f, g) => { g.fx.trail(f.cx, f.cy, '#a35cff', 2); },
      onStrike: (f, g) => { slashFx('#d7b2ff', 88, 30)(f, g); g.shake(6); },
    },
    up: {
      key: 'sp_u', name: 'Dark Slash', startup: 0.12, active: 0.16, recovery: 0.32,
      poses: [POSE.crouch, POSE.upper, POSE.fall],
      damage: 80, hitstun: 0.48, kbx: 150, kby: -450, launcher: true, dashY: -380, dashX: 80,
      box: { x: 20, y: -196, w: 76, h: 146 }, cost: 25, gain: 10, sfx: 'whoosh',
      onStrike: (f, g) => {
        g.fx.giz(new SlashArc(f.cx + f.face * 14, f.cy - 8, f.face > 0 ? 2.7 : Math.PI - 2.7, f.face > 0 ? -2.8 : 2.8, 100, '#a35cff', 0.32, 36));
        g.fx.giz(new VoidRift(f.cx + f.face * 30, f.cy - 40, 54, '#d7b2ff', 0.5));
        g.shake(9);
      },
    },
    back: {
      key: 'sp_b', name: 'Shadow Clone', startup: 0.14, active: 0.26, recovery: 0.3,
      poses: [POSE.castWind, POSE.cast, POSE.idle],
      damage: 54, hitstun: 0.34, kbx: 200, kby: -150, hits: 2,
      box: { x: -110, y: -140, w: 110, h: 90 }, cost: 30, gain: 8, sfx: 'whoosh',
      onStart: (f, g) => {
        g.afterimage(f, 0.6); g.afterimage(f, 0.45);
        g.fx.giz(new VoidRift(f.cx - f.face * 60, f.cy, 48, '#a35cff', 0.6));
        Sfx.whoosh(0.3);
      },
      onStrike: (f, g) => {
        g.fx.giz(new SlashArc(f.cx - f.face * 60, f.cy, f.face > 0 ? Math.PI - 1.3 : 1.3, f.face > 0 ? 2.3 : -2.3, 70, '#d7b2ff', 0.28, 24));
        g.shake(5);
      },
    },
  },
  ult: {
    key: 'ult', name: 'Void Dimension', startup: 0.5, active: 0.8, recovery: 0.6,
    poses: [POSE.superCharge, POSE.superBlast, POSE.win],
    damage: 310, hitstun: 0.95, kbx: 360, kby: -300, hits: 8, cost: 100,
    box: { x: -80, y: -260, w: 380, h: 270 }, superMove: true, sfx: 'boom',
    onStart: (f, g) => {
      g.cinematic(f, 1.1); g.banner('VOID DIMENSION', '#a35cff');
      g.flash('#1a0c2e', 0.75, 0.6);
      g.fx.giz(new VoidRift(f.cx, f.cy, 150, '#a35cff', 1.3));
      for (let i = 0; i < 3; i++) g.afterimage(f, 0.8);
    },
    onTick: (f, g) => {
      if (Math.random() < 0.5) {
        g.fx.giz(new VoidRift(f.cx + rr(-30, 240) * f.face, f.cy + rr(-70, 50), rr(24, 56), '#d7b2ff', 0.45));
      }
      g.fx.trail(f.cx + rr(-50, 50), f.cy + rr(-50, 40), '#a35cff', 1);
    },
    onStrike: (f, g) => {
      g.fx.giz(new Shock(f.cx + f.face * 110, f.cy, '#d7b2ff', 0.6, 230));
      g.fx.burst(f.cx + f.face * 110, f.cy, '#ffffff', 38, 420);
      g.shake(23); g.flash('#d7b2ff', 0.5); Sfx.boom();
    },
  },
};

// =================================================================== KIRA ==
const kira: Character = {
  id: 'kira', name: 'KIRA', kana: 'キラ',
  role: 'Assassin', style: 'Agilité / Furtivité', spec: 'Dégâts critiques',
  quote: '« Tu ne peux pas m’échapper… »',
  color: '#ff3450', color2: '#ff8f9e',
  stats: { hp: 900, walk: 215, back: 185, jump: 700, weight: 0.88, scale: 1.4 },
  normals: {
    light: light({ startup: 0.06, damage: 30, box: { x: 36, y: -120, w: 66, h: 34 }, onStrike: slashFx('#ff3450', 62, 14) }),
    medium: medium({ damage: 44, box: { x: 38, y: -122, w: 74, h: 36 }, onStrike: slashFx('#ff3450', 72, 18) }),
    heavy: heavy({ name: 'Crescent Cut', damage: 72, box: { x: 34, y: -128, w: 92, h: 58 }, onStrike: slashFx('#ff8f9e', 100, 26) }),
    launcher: launcher({}),
    air: air({ onStrike: slashFx('#ff3450', 72, 20) }),
  },
  specials: {
    neutral: {
      key: 'sp_n', name: 'Fox Fireball', startup: 0.17, active: 0.07, recovery: 0.3,
      poses: [POSE.castWind, POSE.cast, POSE.cast],
      damage: 0, hitstun: 0, kbx: 0, kby: 0, box: { x: 0, y: 0, w: 0, h: 0 },
      noHitbox: true, sfx: 'none',
      onStart: (f, g) => { g.fx.giz(new FoxSigil(f.cx + f.face * 40, f.cy - 10, 26, '#ff3450', 0.4, f.face)); },
      onStrike: (f, g) => {
        g.spawnProj(f, { kind: 'fox', speed: 340, damage: 50, hitstun: 0.3, life: 2, w: 44, h: 34, dy: -116, kbx: 190, kby: -60 });
        g.fx.burst(f.cx + f.face * 42, f.cy - 8, '#ff8f9e', 14, 220);
        Sfx.tone(420, 0.3, 'sawtooth', 0.18, 140);
      },
    },
    forward: {
      key: 'sp_f', name: 'Kitsune Dash', startup: 0.08, active: 0.2, recovery: 0.22,
      poses: [POSE.backA, POSE.dash, POSE.cross],
      damage: 68, hitstun: 0.34, kbx: 230, kby: -120, dashX: 560, invul: true,
      box: { x: 0, y: -136, w: 96, h: 76 }, gain: 14, sfx: 'whoosh',
      onStart: (f, g) => { g.afterimage(f, 0.32); Sfx.whoosh(0.28); },
      onTick: (f, g) => {
        g.fx.trail(f.cx, f.cy, '#ff3450', 2);
        if (Math.random() < 0.2) g.fx.add({ x: f.cx + rr(-10, 10), y: f.cy + rr(-30, 30), vx: -f.face * rr(30, 90), vy: rr(-30, 10), color: '#ff8f9e', kind: 'petal', size: 3.4, max: 0.8, rot: rr(0, 6), vr: rr(-5, 5), add: false, grav: 40 });
      },
      onStrike: (f, g) => {
        slashFx('#ff3450', 104, 28)(f, g);
        slashFx('#ff8f9e', 80, 18, 2.1)(f, g);
        g.fx.giz(new FoxSigil(f.cx + f.face * 50, f.cy - 10, 34, '#ff3450', 0.4, f.face));
        g.shake(7);
      },
    },
    up: {
      key: 'sp_u', name: 'Crimson Slash', startup: 0.11, active: 0.17, recovery: 0.32,
      poses: [POSE.crouch, POSE.upper, POSE.fall],
      damage: 84, hitstun: 0.5, kbx: 140, kby: -470, launcher: true, dashY: -400, dashX: 90,
      box: { x: 18, y: -204, w: 80, h: 154 }, cost: 25, gain: 10, sfx: 'whoosh',
      onStrike: (f, g) => {
        g.fx.giz(new SlashArc(f.cx + f.face * 14, f.cy - 10, f.face > 0 ? 2.7 : Math.PI - 2.7, f.face > 0 ? -2.9 : 2.9, 110, '#ff3450', 0.32, 38));
        g.fx.giz(new SlashArc(f.cx + f.face * 14, f.cy - 10, f.face > 0 ? 2.5 : Math.PI - 2.5, f.face > 0 ? -2.6 : 2.6, 82, '#ffffff', 0.26, 16));
        g.shake(10);
      },
    },
    back: {
      key: 'sp_b', name: 'Barrier of the Kitsune', startup: 0.12, active: 0.05, recovery: 0.22,
      poses: [POSE.guard, POSE.burst, POSE.guard],
      damage: 0, hitstun: 0, kbx: 0, kby: 0, box: { x: 0, y: 0, w: 0, h: 0 },
      noHitbox: true, guardTime: 2, cost: 20, sfx: 'none',
      onStart: (f, g) => {
        g.fx.giz(new Dome(() => F(f), 60, '#ff3450', 2));
        g.fx.giz(new FoxSigil(f.cx, f.cy - 6, 44, '#ff8f9e', 0.6, f.face));
        Sfx.tone(260, 0.4, 'triangle', 0.2, 640);
      },
    },
  },
  ult: {
    key: 'ult', name: 'Nine-Tailed Fury', startup: 0.5, active: 0.8, recovery: 0.6,
    poses: [POSE.superCharge, POSE.superBlast, POSE.win],
    damage: 320, hitstun: 0.95, kbx: 400, kby: -320, hits: 9, cost: 100,
    box: { x: -40, y: -250, w: 340, h: 260 }, superMove: true, sfx: 'boom',
    onStart: (f, g) => {
      g.cinematic(f, 1.1); g.banner('NINE-TAILED FURY', '#ff3450');
      g.fx.giz(new FoxSigil(f.cx + f.face * 60, f.cy - 30, 120, '#ff3450', 1.2, f.face));
      for (let i = 0; i < 30; i++) {
        g.fx.add({ x: f.cx + rr(-120, 120), y: f.cy + rr(-90, 70), vx: rr(-40, 40), vy: rr(-70, -10), color: '#ff8f9e', kind: 'petal', size: rr(2.5, 5), max: rr(0.8, 1.5), rot: rr(0, 6), vr: rr(-6, 6), add: false, grav: 30 });
      }
    },
    onTick: (f, g) => {
      if (Math.random() < 0.6) {
        const a = rr(0, Math.PI * 2);
        g.fx.giz(new SlashArc(f.cx + f.face * rr(30, 180), f.cy + rr(-60, 40), a, rr(1.8, 2.8) * (Math.random() < 0.5 ? 1 : -1), rr(50, 96), '#ff3450', 0.24, 22));
      }
    },
    onStrike: (f, g) => {
      for (let i = 0; i < 9; i++) {
        const a = -0.2 - i * 0.12;
        g.fx.giz(new SlashArc(f.cx, f.cy - 10, a, f.face * 2.4, 120 + i * 9, '#ff3450', 0.5 + i * 0.03, 16));
      }
      g.fx.giz(new FoxSigil(f.cx + f.face * 130, f.cy - 20, 150, '#ff8f9e', 0.7, f.face));
      g.fx.burst(f.cx + f.face * 120, f.cy, '#ffffff', 42, 440);
      g.shake(24); g.flash('#ff8f9e', 0.55); Sfx.boom();
    },
  },
};

export const ROSTER: Record<CharId, Character> = { mika, ray, zen, kira };
export const ROSTER_IDS: CharId[] = ['mika', 'ray', 'zen', 'kira'];
