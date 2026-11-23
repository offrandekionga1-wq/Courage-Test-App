// ---------------------------------------------------------------------------
// Neon Clash — rendu des combattants.
// Les sprites manquants des fiches de référence sont reconstruits ici par le
// code : squelette articulé + silhouettes propres à chaque personnage, avec
// animation secondaire (cheveux, pans de manteau) pour un rendu "motion design".
// ---------------------------------------------------------------------------
import { lerp, clamp } from './core';
import { glowSprite } from './vfx';

export type CharId = 'mika' | 'ray' | 'zen' | 'kira';

export interface Palette {
  skin: string; skinDark: string;
  hair: string; hair2: string;
  suit: string; suitHi: string; trim: string;
  accent: string; accent2: string; glow: string;
}

export const PALETTES: Record<CharId, Palette> = {
  mika: {
    skin: '#f6d3b2', skinDark: '#cf9d76', hair: '#272133', hair2: '#453a5e',
    suit: '#241f30', suitHi: '#38304a', trim: '#f4f1ea',
    accent: '#ffc820', accent2: '#ffe987', glow: 'rgba(255,200,32,0.95)',
  },
  ray: {
    skin: '#f3d1b4', skinDark: '#c99a7b', hair: '#eef3ff', hair2: '#aec6ef',
    suit: '#1b2336', suitHi: '#2b3758', trim: '#f2f6ff',
    accent: '#3ba7ff', accent2: '#9ddcff', glow: 'rgba(59,167,255,0.95)',
  },
  zen: {
    skin: '#a86c45', skinDark: '#7d4e2f', hair: '#2c2340', hair2: '#4d3a70',
    suit: '#241a38', suitHi: '#372656', trim: '#efeaf7',
    accent: '#a35cff', accent2: '#d7b2ff', glow: 'rgba(163,92,255,0.95)',
  },
  kira: {
    skin: '#f8d6b9', skinDark: '#d0a284', hair: '#241a2b', hair2: '#5e1b31',
    suit: '#231a26', suitHi: '#38283d', trim: '#f6f2f4',
    accent: '#ff3450', accent2: '#ff8f9e', glow: 'rgba(255,52,80,0.95)',
  },
};

// ------------------------------------------------------------------ Pose ---
export interface Pose {
  hx: number; hy: number;      // décalage du bassin
  lean: number; head: number;  // torse / tête
  armB: [number, number];      // bras arrière  [épaule, coude]
  armF: [number, number];      // bras avant
  legB: [number, number];      // jambe arrière [hanche, genou]
  legF: [number, number];
  sq: number;                  // squash & stretch (1 = neutre)
}

export const P = (
  hx: number, hy: number, lean: number, head: number,
  armB: [number, number], armF: [number, number],
  legB: [number, number], legF: [number, number], sq = 1,
): Pose => ({ hx, hy, lean, head, armB, armF, legB, legF, sq });

const pair = (a: [number, number], b: [number, number], t: number): [number, number] =>
  [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    hx: lerp(a.hx, b.hx, t), hy: lerp(a.hy, b.hy, t),
    lean: lerp(a.lean, b.lean, t), head: lerp(a.head, b.head, t),
    armB: pair(a.armB, b.armB, t), armF: pair(a.armF, b.armF, t),
    legB: pair(a.legB, b.legB, t), legF: pair(a.legF, b.legF, t),
    sq: lerp(a.sq, b.sq, t),
  };
}

const D = Math.PI / 180;

// Bibliothèque de poses. Angle 0 = vers le bas, positif = vers l'avant.
export const POSE = {
  idle:  P(0, 0, 6 * D, -3 * D, [6 * D, 124 * D], [30 * D, 60 * D], [-20 * D, 16 * D], [20 * D, -14 * D]),
  idle2: P(0, 2.5, 8 * D, -1 * D, [4 * D, 128 * D], [26 * D, 64 * D], [-18 * D, 14 * D], [18 * D, -12 * D], 0.985),
  walkA: P(3, -1, 10 * D, -4 * D, [-20 * D, 100 * D], [44 * D, 44 * D], [-38 * D, 30 * D], [40 * D, -34 * D]),
  walkB: P(3, 1, 8 * D, -2 * D, [40 * D, 60 * D], [-14 * D, 96 * D], [38 * D, -34 * D], [-34 * D, 28 * D]),
  backA: P(-3, -1, -4 * D, 2 * D, [8 * D, 120 * D], [22 * D, 76 * D], [28 * D, -24 * D], [-26 * D, 20 * D]),
  backB: P(-3, 1, -2 * D, 4 * D, [10 * D, 118 * D], [26 * D, 72 * D], [-24 * D, 20 * D], [30 * D, -26 * D]),
  crouch: P(0, 26, 20 * D, -8 * D, [20 * D, 110 * D], [34 * D, 86 * D], [-55 * D, 110 * D], [55 * D, -110 * D], 0.94),
  block: P(-4, 4, -6 * D, 4 * D, [26 * D, 118 * D], [34 * D, 114 * D], [-22 * D, 18 * D], [26 * D, -20 * D], 0.97),
  jump:  P(0, -6, 12 * D, -8 * D, [-24 * D, 70 * D], [40 * D, 50 * D], [-45 * D, 85 * D], [40 * D, -85 * D], 1.06),
  fall:  P(0, -2, -4 * D, -12 * D, [-40 * D, 50 * D], [56 * D, 30 * D], [-30 * D, 40 * D], [35 * D, -25 * D], 1.03),
  land:  P(0, 20, 22 * D, 6 * D, [24 * D, 90 * D], [36 * D, 70 * D], [-40 * D, 70 * D], [42 * D, -72 * D], 0.9),
  hurt:  P(-7, 2, -24 * D, 18 * D, [162 * D, 22 * D], [170 * D, 16 * D], [22 * D, -18 * D], [-26 * D, 26 * D], 1.02),
  ko:    P(-12, 46, -62 * D, 34 * D, [172 * D, 10 * D], [178 * D, 6 * D], [48 * D, 26 * D], [-8 * D, 52 * D], 0.95),
  win:   P(0, -2, -4 * D, -6 * D, [26 * D, 54 * D], [158 * D, 14 * D], [-16 * D, 12 * D], [20 * D, -14 * D], 1.02),

  // attaques
  jabWind:   P(-4, 0, -8 * D, 4 * D, [10 * D, 118 * D], [2 * D, 132 * D], [-18 * D, 16 * D], [22 * D, -16 * D]),
  jab:       P(8, 0, 16 * D, -4 * D, [6 * D, 126 * D], [82 * D, 6 * D], [-28 * D, 18 * D], [32 * D, -24 * D], 1.03),
  crossWind: P(-6, 1, -16 * D, 6 * D, [0 * D, 142 * D], [36 * D, 84 * D], [-16 * D, 16 * D], [24 * D, -18 * D]),
  cross:     P(10, 0, 22 * D, -6 * D, [86 * D, 5 * D], [14 * D, 122 * D], [-32 * D, 20 * D], [36 * D, -26 * D], 1.04),
  kickWind:  P(-5, 2, -10 * D, 4 * D, [12 * D, 112 * D], [30 * D, 82 * D], [-22 * D, 20 * D], [26 * D, -44 * D]),
  kick:      P(6, -4, 16 * D, -4 * D, [18 * D, 84 * D], [50 * D, 42 * D], [-28 * D, 18 * D], [96 * D, -8 * D], 1.05),
  spinKick:  P(4, -10, 34 * D, 10 * D, [102 * D, 18 * D], [120 * D, 10 * D], [-44 * D, 34 * D], [114 * D, -16 * D], 1.06),
  upper:     P(4, 8, -14 * D, -14 * D, [12 * D, 114 * D], [150 * D, 12 * D], [-22 * D, 20 * D], [28 * D, -22 * D], 1.08),
  airAtk:    P(2, -4, 26 * D, 4 * D, [-28 * D, 40 * D], [78 * D, 6 * D], [-52 * D, 64 * D], [46 * D, -42 * D], 1.04),

  castWind:     P(-6, 2, -14 * D, 8 * D, [14 * D, 122 * D], [20 * D, 126 * D], [-18 * D, 18 * D], [24 * D, -18 * D], 0.98),
  cast:         P(6, -2, 14 * D, -6 * D, [24 * D, 104 * D], [86 * D, 4 * D], [-26 * D, 18 * D], [30 * D, -22 * D], 1.04),
  dash:         P(6, 6, 42 * D, -14 * D, [-38 * D, 22 * D], [68 * D, 10 * D], [-58 * D, 48 * D], [60 * D, -46 * D], 1.05),
  guard:        P(-2, 2, -4 * D, -2 * D, [28 * D, 116 * D], [36 * D, 112 * D], [-22 * D, 20 * D], [26 * D, -22 * D]),
  burst:        P(0, 10, -8 * D, -10 * D, [138 * D, -18 * D], [146 * D, -24 * D], [-30 * D, 30 * D], [34 * D, -32 * D], 1.04),
  superCharge:  P(0, 6, -10 * D, -16 * D, [-26 * D, 34 * D], [-32 * D, 38 * D], [-22 * D, 22 * D], [26 * D, -24 * D], 1.02),
  superBlast:   P(4, -8, 18 * D, -10 * D, [78 * D, 6 * D], [84 * D, 3 * D], [-34 * D, 24 * D], [38 * D, -28 * D], 1.1),
} as const;

// --------------------------------------------------- Animation secondaire --
/** Chaîne verlet : cheveux, pans de manteau, queues. */
export class Strand {
  pts: { x: number; y: number; px: number; py: number }[] = [];
  constructor(public n: number, public seg: number, public grav = 320, public stiff = 1) {
    for (let i = 0; i < n; i++) this.pts.push({ x: 0, y: i * seg, px: 0, py: i * seg });
  }
  reset(x: number, y: number): void {
    for (const p of this.pts) { p.x = x; p.y = y; p.px = x; p.py = y; }
  }
  update(dt: number, ax: number, ay: number, windX: number): void {
    const p0 = this.pts[0];
    p0.x = ax; p0.y = ay; p0.px = ax; p0.py = ay;
    for (let i = 1; i < this.pts.length; i++) {
      const p = this.pts[i];
      const vx = (p.x - p.px) * 0.86 + windX * dt;
      const vy = (p.y - p.py) * 0.86;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + this.grav * dt * dt * 60;
    }
    for (let k = 0; k < 3; k++) {
      for (let i = 1; i < this.pts.length; i++) {
        const a = this.pts[i - 1], b = this.pts[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = ((d - this.seg) / d) * this.stiff;
        b.x -= dx * diff; b.y -= dy * diff;
      }
    }
  }
}

// ------------------------------------------------------------- Primitives --
function bone(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  w0: number, w1: number, color: string,
): void {
  const dx = x1 - x0, dy = y1 - y0;
  const d = Math.hypot(dx, dy) || 0.0001;
  const nx = -dy / d, ny = dx / d;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0, y0 + ny * w0);
  ctx.lineTo(x1 + nx * w1, y1 + ny * w1);
  ctx.lineTo(x1 - nx * w1, y1 - ny * w1);
  ctx.lineTo(x0 - nx * w0, y0 - ny * w0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); ctx.arc(x0, y0, w0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x1, y1, w1, 0, Math.PI * 2); ctx.fill();
}

const pt = (x: number, y: number, a: number, len: number) => ({ x: x + Math.sin(a) * len, y: y + Math.cos(a) * len });

export interface Joints {
  pelvis: { x: number; y: number }; chest: { x: number; y: number }; head: { x: number; y: number };
  shB: { x: number; y: number }; elB: { x: number; y: number }; haB: { x: number; y: number };
  shF: { x: number; y: number }; elF: { x: number; y: number }; haF: { x: number; y: number };
  kneeB: { x: number; y: number }; footB: { x: number; y: number };
  kneeF: { x: number; y: number }; footF: { x: number; y: number };
  headAngle: number;
}

const L = { torso: 40, neck: 22, arm: 24, fore: 22, thigh: 31, shin: 31, headR: 13.5 };

export function solve(pose: Pose): Joints {
  const pelvis = { x: pose.hx, y: -62 + pose.hy };
  const chest = pt(pelvis.x, pelvis.y, Math.PI + pose.lean, L.torso * pose.sq);
  const headAngle = pose.lean + pose.head;
  const head = pt(chest.x, chest.y, Math.PI + headAngle, L.neck);
  const shB = { x: chest.x - Math.sin(pose.lean) * 2 - 3, y: chest.y + 4 };
  const shF = { x: chest.x - Math.sin(pose.lean) * 2 + 4, y: chest.y + 5 };
  const elB = pt(shB.x, shB.y, pose.armB[0], L.arm);
  const haB = pt(elB.x, elB.y, pose.armB[0] + pose.armB[1], L.fore);
  const elF = pt(shF.x, shF.y, pose.armF[0], L.arm);
  const haF = pt(elF.x, elF.y, pose.armF[0] + pose.armF[1], L.fore);
  const kneeB = pt(pelvis.x - 3, pelvis.y + 2, pose.legB[0], L.thigh);
  const footB = pt(kneeB.x, kneeB.y, pose.legB[0] + pose.legB[1], L.shin);
  const kneeF = pt(pelvis.x + 3, pelvis.y + 2, pose.legF[0], L.thigh);
  const footF = pt(kneeF.x, kneeF.y, pose.legF[0] + pose.legF[1], L.shin);
  return { pelvis, chest, head, shB, elB, haB, shF, elF, haF, kneeB, footB, kneeF, footF, headAngle };
}

// ------------------------------------------------------------- Personnage --
export interface DrawOpts {
  id: CharId;
  pose: Pose;
  joints: Joints;
  hair: Strand[];
  coat: Strand[];
  flash: number;       // 0..1 flash blanc (impact)
  tint: number;        // 0..1 teinte accent (charge)
  weapon: boolean;     // arme sortie
  alpha: number;
}

function shoe(ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette, dir = 1): void {
  ctx.fillStyle = pal.trim;
  ctx.beginPath();
  ctx.moveTo(x - 6 * dir, y - 5); ctx.lineTo(x + 11 * dir, y - 1);
  ctx.quadraticCurveTo(x + 13 * dir, y + 5, x + 6 * dir, y + 5);
  ctx.lineTo(x - 7 * dir, y + 5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = pal.accent;
  ctx.fillRect(x - 7 * dir, y + 2.5, 19 * dir, 2.6);
}

function hand(ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette, r = 5): void {
  ctx.fillStyle = pal.suitHi;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha *= 0.55;
  ctx.beginPath(); ctx.arc(x, y, r * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.55;
}

/** Dessine le combattant dans l'espace local (origine = pieds, +x = devant). */
export function drawFighter(ctx: CanvasRenderingContext2D, o: DrawOpts): void {
  const pal = PALETTES[o.id];
  const j = o.joints;
  ctx.globalAlpha = o.alpha;

  // --- rétro-éclairage : détache la silhouette du décor sombre ---
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = o.alpha * 0.13;
  ctx.drawImage(glowSprite(pal.accent), -62, -176, 124, 200);
  ctx.restore();

  // --- pans de manteau (derrière) ---
  ctx.fillStyle = pal.suit;
  for (const c of o.coat) {
    ctx.beginPath();
    ctx.moveTo(c.pts[0].x, c.pts[0].y - 7);
    for (const p of c.pts) ctx.lineTo(p.x, p.y);
    for (let i = c.pts.length - 1; i >= 0; i--) {
      const w = 11 * (1 - i / c.pts.length) + 3;
      ctx.lineTo(c.pts[i].x + w, c.pts[i].y - 2);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.6; ctx.globalAlpha = o.alpha * 0.75;
  for (const c of o.coat) {
    ctx.beginPath();
    c.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.globalAlpha = o.alpha;

  // --- cheveux arrière ---
  for (const s of o.hair) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(s.pts[0].x, s.pts[0].y);
    for (const p of s.pts) ctx.lineTo(p.x, p.y);
    for (let i = s.pts.length - 1; i >= 0; i--) {
      const w = 7 * (1 - i / s.pts.length) + 1.5;
      ctx.lineTo(s.pts[i].x + w, s.pts[i].y - 1);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.hair2; ctx.lineWidth = 1.3;
    ctx.beginPath();
    s.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }

  // --- membres arrière ---
  bone(ctx, j.pelvis.x - 3, j.pelvis.y + 2, j.kneeB.x, j.kneeB.y, 9, 6.8, pal.suit);
  bone(ctx, j.kneeB.x, j.kneeB.y, j.footB.x, j.footB.y, 6.8, 5, pal.suit);
  shoe(ctx, j.footB.x, j.footB.y, { ...pal, trim: pal.suitHi });
  bone(ctx, j.shB.x, j.shB.y, j.elB.x, j.elB.y, 7, 5.6, pal.suit);
  bone(ctx, j.elB.x, j.elB.y, j.haB.x, j.haB.y, 5.6, 4.6, pal.suitHi);
  hand(ctx, j.haB.x, j.haB.y, pal, 4.6);

  // --- torse ---
  const tg = ctx.createLinearGradient(j.pelvis.x, j.pelvis.y, j.chest.x, j.chest.y - 6);
  tg.addColorStop(0, pal.suit);
  tg.addColorStop(1, pal.suitHi);
  bone(ctx, j.pelvis.x, j.pelvis.y, j.chest.x, j.chest.y, 11.5, 13, '#000');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(j.pelvis.x - 10, j.pelvis.y + 3);
  ctx.lineTo(j.chest.x - 13, j.chest.y + 1);
  ctx.lineTo(j.chest.x + 13, j.chest.y + 1);
  ctx.lineTo(j.pelvis.x + 10, j.pelvis.y + 3);
  ctx.closePath(); ctx.fill();
  // ceinture
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha = o.alpha * 0.95;
  ctx.beginPath();
  ctx.moveTo(j.pelvis.x - 10.5, j.pelvis.y - 1);
  ctx.lineTo(j.pelvis.x + 10.5, j.pelvis.y - 1);
  ctx.lineTo(j.pelvis.x + 10, j.pelvis.y + 4);
  ctx.lineTo(j.pelvis.x - 10, j.pelvis.y + 4);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = o.alpha;

  // --- jambe avant ---
  bone(ctx, j.pelvis.x + 3, j.pelvis.y + 2, j.kneeF.x, j.kneeF.y, 9.6, 7.2, pal.suitHi);
  bone(ctx, j.kneeF.x, j.kneeF.y, j.footF.x, j.footF.y, 7.2, 5.4, pal.suitHi);
  shoe(ctx, j.footF.x, j.footF.y, pal);

  // --- cou ---
  bone(ctx, j.chest.x + 1, j.chest.y - 2, j.head.x, j.head.y + 7, 5.4, 5, pal.skinDark);

  // --- détails par personnage (buste / tête) ---
  details[o.id](ctx, o, j, pal);

  // --- bras avant ---
  bone(ctx, j.shF.x, j.shF.y, j.elF.x, j.elF.y, 7.4, 6, pal.suitHi);
  if (o.id === 'mika') {
    // manche large du haori
    ctx.fillStyle = pal.trim;
    bone(ctx, j.elF.x, j.elF.y, j.haF.x, j.haF.y, 5.6, 6.8, pal.trim);
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = o.alpha * 0.9;
    ctx.beginPath(); ctx.arc(j.haF.x, j.haF.y, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = o.alpha;
  } else {
    bone(ctx, j.elF.x, j.elF.y, j.haF.x, j.haF.y, 6, 5, pal.suit);
  }
  hand(ctx, j.haF.x, j.haF.y, pal, 5);

  if (o.weapon && o.id === 'kira') {
    // katana
    const a = Math.atan2(j.haF.y - j.elF.y, j.haF.x - j.elF.x);
    ctx.save();
    ctx.translate(j.haF.x, j.haF.y);
    ctx.rotate(a);
    ctx.fillStyle = '#2a2430';
    ctx.fillRect(-14, -2, 16, 4);
    const g = ctx.createLinearGradient(0, 0, 76, 0);
    g.addColorStop(0, '#f6f2f4'); g.addColorStop(1, pal.accent);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(2, -2.6); ctx.lineTo(70, -3.4); ctx.lineTo(80, 0); ctx.lineTo(70, 2.6); ctx.lineTo(2, 2.6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // --- liseré lumineux sur le contour avant ---
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = o.alpha * 0.5;
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(j.pelvis.x + 8, j.pelvis.y + 1); ctx.lineTo(j.chest.x + 10, j.chest.y + 3);
  ctx.moveTo(j.shF.x + 4, j.shF.y); ctx.lineTo(j.elF.x + 4, j.elF.y); ctx.lineTo(j.haF.x + 3, j.haF.y);
  ctx.moveTo(j.pelvis.x + 9, j.pelvis.y + 3); ctx.lineTo(j.kneeF.x + 6, j.kneeF.y); ctx.lineTo(j.footF.x + 4, j.footF.y - 2);
  ctx.stroke();
  ctx.globalAlpha = o.alpha * 0.35;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(j.head.x + 3, j.head.y, L.headR - 0.5, -1.5, 1.2);
  ctx.stroke();
  ctx.restore();

  // --- flash blanc d'impact ---
  if (o.flash > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = o.flash * 0.75;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(j.pelvis.x, j.pelvis.y - 18, 34, 56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------ détails par perso --
type Detail = (ctx: CanvasRenderingContext2D, o: DrawOpts, j: Joints, pal: Palette) => void;

function face(ctx: CanvasRenderingContext2D, j: Joints, pal: Palette, o: DrawOpts, eyeTilt = 0): void {
  ctx.save();
  ctx.translate(j.head.x, j.head.y);
  ctx.rotate(j.headAngle * 0.8);
  // masse de cheveux derrière le crâne
  ctx.fillStyle = pal.hair2;
  ctx.beginPath(); ctx.ellipse(-3.5, -0.5, L.headR * 1.0, L.headR * 1.04, 0, 0, Math.PI * 2); ctx.fill();
  // visage
  ctx.fillStyle = pal.skin;
  ctx.beginPath(); ctx.ellipse(2.6, 1.4, L.headR * 0.84, L.headR * 0.94, 0, 0, Math.PI * 2); ctx.fill();
  // ombre de mâchoire
  ctx.globalAlpha = o.alpha * 0.3;
  ctx.fillStyle = pal.skinDark;
  ctx.beginPath(); ctx.ellipse(-0.5, 4, L.headR * 0.6, L.headR * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = o.alpha;
  // yeux : base sombre + iris lumineux (lisibles sur peau claire)
  ctx.fillStyle = '#1b1624';
  ctx.beginPath(); ctx.ellipse(7, -0.6 + eyeTilt, 2.7, 2.3, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(1.8, -0.2 + eyeTilt, 2.2, 2, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = pal.accent;
  ctx.beginPath(); ctx.ellipse(7.3, -0.6 + eyeTilt, 1.5, 1.25, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(2.1, -0.2 + eyeTilt, 1.2, 1.05, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // sourcils
  ctx.strokeStyle = pal.hair;
  ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(4.6, -4.4); ctx.lineTo(9.4, -3.6);
  ctx.moveTo(0.2, -3.8); ctx.lineTo(3.4, -3.4);
  ctx.stroke();
  // bouche
  ctx.strokeStyle = pal.skinDark; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(6, 6.4); ctx.lineTo(9, 6.1); ctx.stroke();
  ctx.restore();
}

const details: Record<CharId, Detail> = {
  // --- MIKA : haori blanc/or, couettes, rubans, talismans ---
  mika: (ctx, o, j, pal) => {
    // haori ouvert
    ctx.fillStyle = pal.trim;
    ctx.beginPath();
    ctx.moveTo(j.chest.x - 13, j.chest.y + 1);
    ctx.lineTo(j.chest.x - 17, j.chest.y + 16);
    ctx.lineTo(j.pelvis.x - 11, j.pelvis.y + 6);
    ctx.lineTo(j.pelvis.x - 6, j.pelvis.y - 2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(j.chest.x + 12, j.chest.y + 1);
    ctx.lineTo(j.chest.x + 16, j.chest.y + 15);
    ctx.lineTo(j.pelvis.x + 11, j.pelvis.y + 5);
    ctx.lineTo(j.pelvis.x + 6, j.pelvis.y - 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.fillRect(j.chest.x + 12, j.chest.y + 2, 3, 12);
    face(ctx, j, pal, o);
    // frange + couettes hautes
    ctx.save();
    ctx.translate(j.head.x, j.head.y); ctx.rotate(j.headAngle * 0.8);
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(-13, 2); ctx.quadraticCurveTo(-14, -16, 2, -15);
    ctx.quadraticCurveTo(15, -14, 12, 1);
    ctx.lineTo(8, -3); ctx.lineTo(4, 2); ctx.lineTo(0, -4); ctx.lineTo(-5, 1); ctx.lineTo(-9, -4);
    ctx.closePath(); ctx.fill();
    // nœud doré
    ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.ellipse(-8, -13.5, 4.6, 3.2, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-3, -15.5, 3.8, 2.6, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  // --- RAY : cheveux blancs en piques, casque audio ---
  ray: (ctx, o, j, pal) => {
    ctx.fillStyle = pal.trim;
    ctx.beginPath();
    ctx.moveTo(j.chest.x - 12, j.chest.y + 2);
    ctx.lineTo(j.chest.x - 5, j.chest.y + 4);
    ctx.lineTo(j.pelvis.x - 2, j.pelvis.y - 1);
    ctx.lineTo(j.pelvis.x - 9, j.pelvis.y - 1);
    ctx.closePath(); ctx.fill();
    face(ctx, j, pal, o);
    ctx.save();
    ctx.translate(j.head.x, j.head.y); ctx.rotate(j.headAngle * 0.8);
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(-14, 1);
    ctx.lineTo(-16, -11); ctx.lineTo(-8, -8); ctx.lineTo(-9, -19); ctx.lineTo(-1, -10);
    ctx.lineTo(3, -21); ctx.lineTo(7, -9); ctx.lineTo(14, -15); ctx.lineTo(13, -2);
    ctx.lineTo(8, -5); ctx.lineTo(3, 0); ctx.lineTo(-4, -4); ctx.lineTo(-9, 2);
    ctx.closePath(); ctx.fill();
    // casque
    ctx.strokeStyle = pal.suitHi; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -2, 14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = pal.suitHi;
    ctx.beginPath(); ctx.ellipse(-8, 2, 4.6, 5.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.arc(-8, 2, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  // --- ZEN : afro, t-shirt blanc sous veste ouverte ---
  zen: (ctx, o, j, pal) => {
    ctx.fillStyle = pal.trim;
    ctx.beginPath();
    ctx.moveTo(j.chest.x - 7, j.chest.y + 2);
    ctx.lineTo(j.chest.x + 7, j.chest.y + 2);
    ctx.lineTo(j.pelvis.x + 6, j.pelvis.y - 1);
    ctx.lineTo(j.pelvis.x - 6, j.pelvis.y - 1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = o.alpha * 0.9;
    ctx.beginPath();
    const mx = (j.chest.x + j.pelvis.x) / 2, my = (j.chest.y + j.pelvis.y) / 2 - 2;
    ctx.moveTo(mx, my - 5); ctx.lineTo(mx + 4.5, my + 2); ctx.lineTo(mx - 4.5, my + 2);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = o.alpha;
    face(ctx, j, pal, o);
    ctx.save();
    ctx.translate(j.head.x, j.head.y); ctx.rotate(j.headAngle * 0.8);
    ctx.fillStyle = pal.hair;
    for (const [dx, dy, r] of [[-9, -8, 8], [0, -13, 9], [9, -8, 7.5], [-12, 0, 6], [12, -1, 5.5], [-2, -16, 6]]) {
      ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = pal.hair2;
    ctx.globalAlpha = o.alpha * 0.6;
    for (const [dx, dy, r] of [[-7, -12, 4], [4, -15, 3.4], [10, -9, 3]]) {
      ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = o.alpha;
    ctx.restore();
  },

  // --- KIRA : haori blanc/rouge, masque de renard, longue chevelure ---
  kira: (ctx, o, j, pal) => {
    ctx.fillStyle = pal.trim;
    ctx.beginPath();
    ctx.moveTo(j.chest.x - 13, j.chest.y + 1);
    ctx.lineTo(j.chest.x - 18, j.chest.y + 20);
    ctx.lineTo(j.pelvis.x - 10, j.pelvis.y + 10);
    ctx.lineTo(j.pelvis.x - 5, j.pelvis.y - 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = o.alpha * 0.85;
    ctx.beginPath();
    ctx.moveTo(j.chest.x - 13, j.chest.y + 10);
    ctx.lineTo(j.chest.x - 16.5, j.chest.y + 19);
    ctx.lineTo(j.pelvis.x - 10, j.pelvis.y + 9);
    ctx.lineTo(j.pelvis.x - 8, j.pelvis.y + 3);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = o.alpha;
    face(ctx, j, pal, o);
    ctx.save();
    ctx.translate(j.head.x, j.head.y); ctx.rotate(j.headAngle * 0.8);
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(-14, 4); ctx.quadraticCurveTo(-16, -15, 1, -16);
    ctx.quadraticCurveTo(15, -15, 13, 3);
    ctx.lineTo(9, -2); ctx.lineTo(5, 3); ctx.lineTo(1, -3); ctx.lineTo(-4, 2); ctx.lineTo(-9, -3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.hair2;
    ctx.globalAlpha = o.alpha * 0.55;
    ctx.beginPath(); ctx.ellipse(-6, -9, 5, 7, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = o.alpha;
    // masque kitsune sur le côté de la tête
    ctx.translate(-10, -12); ctx.rotate(-0.55);
    ctx.fillStyle = '#f7f3f4';
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 5.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4.6, -3); ctx.lineTo(-5.8, -8.6); ctx.lineTo(-1.2, -5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4.2, -3); ctx.lineTo(5.8, -8.6); ctx.lineTo(1.2, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.ellipse(-2, -0.4, 1.5, 0.8, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2, -0.4, 1.5, 0.8, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-0.8, 1.8, 1.6, 2.6);
    ctx.restore();
  },
};

/** Ombre portée au sol. */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, groundY: number, height: number, scale: number): void {
  const k = clamp(1 - height / 260, 0.25, 1);
  ctx.save();
  ctx.globalAlpha = 0.42 * k;
  ctx.fillStyle = '#05040a';
  ctx.beginPath();
  ctx.ellipse(x, groundY + 2, 34 * scale * k, 8 * scale * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
