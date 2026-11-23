// ---------------------------------------------------------------------------
// Neon Clash — effets visuels : particules + "gizmos" (arcs, cercles runiques,
// éclairs, ondes de choc, piliers). Tout est dessiné par le code, en additif.
// ---------------------------------------------------------------------------
import { rr, ri, clamp, ease, lerp } from './core';

// Cache de halos radiaux : un petit canvas par couleur, redimensionné à la volée.
const glowCache = new Map<string, HTMLCanvasElement>();
export function glowSprite(color: string): HTMLCanvasElement {
  let c = glowCache.get(color);
  if (c) return c;
  const S = 64;
  c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 1;
  g.fillStyle = grad;
  g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
  glowCache.set(color, c);
  return c;
}

export type PKind = 'spark' | 'ember' | 'smoke' | 'shard' | 'card' | 'petal' | 'glow' | 'bit';

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string;
  kind: PKind; rot: number; vr: number; grav: number; drag: number;
  add: boolean; fade: number;
}

export interface Gizmo {
  t: number; life: number; dead: boolean;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export class Fx {
  parts: Particle[] = [];
  gizmos: Gizmo[] = [];
  private cap = 420;

  clear(): void { this.parts.length = 0; this.gizmos.length = 0; }

  add(p: Partial<Particle> & { x: number; y: number }): void {
    if (this.parts.length > this.cap) this.parts.shift();
    this.parts.push({
      vx: 0, vy: 0, life: 0, max: 0.6, size: 4, color: '#fff', kind: 'spark',
      rot: 0, vr: 0, grav: 0, drag: 0.92, add: true, fade: 1, ...p,
    });
  }
  giz(g: Gizmo): void { this.gizmos.push(g); }

  update(dt: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life += dt;
      if (p.life >= p.max) { this.parts.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    for (let i = this.gizmos.length - 1; i >= 0; i--) {
      const g = this.gizmos[i];
      g.t += dt;
      g.update(dt);
      if (g.dead || g.t >= g.life) this.gizmos.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // gizmos derrière les particules
    for (const g of this.gizmos) { ctx.save(); g.draw(ctx); ctx.restore(); }

    ctx.save();
    for (const p of this.parts) {
      const k = 1 - p.life / p.max;
      const a = clamp(Math.pow(k, p.fade), 0, 1);
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.globalAlpha = a;
      switch (p.kind) {
        case 'glow':
        case 'ember': {
          const s = p.size * (p.kind === 'ember' ? 0.6 + k * 0.8 : 1 + (1 - k) * 1.5);
          const img = glowSprite(p.color);
          ctx.drawImage(img, p.x - s, p.y - s, s * 2, s * 2);
          break;
        }
        case 'spark': {
          const len = 3 + Math.hypot(p.vx, p.vy) * 0.035;
          const ang = Math.atan2(p.vy, p.vx);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * k;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
          ctx.stroke();
          break;
        }
        case 'bit': {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          break;
        }
        case 'smoke': {
          const s = p.size * (1 + (1 - k) * 2.2);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = a * 0.5;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'shard': {
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-p.size * 2.2, 0); ctx.lineTo(0, -p.size * 0.5);
          ctx.lineTo(p.size * 2.2, 0); ctx.lineTo(0, p.size * 0.5);
          ctx.closePath(); ctx.fill();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          break;
        }
        case 'card': {
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(14,11,6,0.92)';
          ctx.fillRect(-p.size * 0.5, -p.size * 0.78, p.size, p.size * 1.56);
          ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
          ctx.strokeRect(-p.size * 0.5, -p.size * 0.78, p.size, p.size * 1.56);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = p.color;
          for (let i = 0; i < 3; i++) ctx.fillRect(-p.size * 0.24, -p.size * 0.4 + i * p.size * 0.38, p.size * 0.48, 1.6);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          break;
        }
        case 'petal': {
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          break;
        }
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ recettes ---
  burst(x: number, y: number, color: string, n = 14, speed = 240): void {
    for (let i = 0; i < n; i++) {
      const a = rr(0, Math.PI * 2), s = rr(speed * 0.35, speed);
      this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, kind: 'spark', size: rr(2, 4), max: rr(0.2, 0.45), drag: 0.88 });
    }
    this.add({ x, y, color: '#ffffff', kind: 'glow', size: 16, max: 0.16 });
    this.add({ x, y, color, kind: 'glow', size: 26, max: 0.3 });
  }

  impact(x: number, y: number, color: string, power = 1): void {
    this.burst(x, y, color, Math.round(12 * power), 260 * power);
    this.burst(x, y, '#ffffff', Math.round(6 * power), 180 * power);
    this.giz(new Shock(x, y, color, 0.3, 30 + 34 * power));
    for (let i = 0; i < 4 * power; i++) {
      this.add({ x, y, vx: rr(-70, 70), vy: rr(-120, -20), color, kind: 'shard', size: rr(2, 4), rot: rr(0, 6), vr: rr(-9, 9), max: rr(0.3, 0.6), grav: 420 });
    }
  }

  dust(x: number, y: number, dir = 0, n = 7): void {
    for (let i = 0; i < n; i++) {
      this.add({
        x: x + rr(-8, 8), y: y + rr(-3, 3), vx: rr(30, 120) * (dir === 0 ? (i % 2 ? 1 : -1) : dir),
        vy: rr(-50, -8), color: 'rgba(190,195,215,0.55)', kind: 'smoke', size: rr(4, 9),
        max: rr(0.35, 0.7), add: false, drag: 0.9,
      });
    }
  }

  trail(x: number, y: number, color: string, n = 1): void {
    for (let i = 0; i < n; i++) {
      this.add({ x: x + rr(-6, 6), y: y + rr(-14, 14), vx: rr(-24, 24), vy: rr(-40, 8), color, kind: 'ember', size: rr(3, 7), max: rr(0.25, 0.5), drag: 0.9 });
    }
  }
}

// ------------------------------------------------------------- Gizmos ------

export class Shock implements Gizmo {
  t = 0; dead = false;
  constructor(public x: number, public y: number, public color: string, public life: number, public maxR: number, public squash = 1) {}
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {
    const k = this.t / this.life;
    const r = ease.out(k) * this.maxR;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (1 - k) * 0.9;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(0.6, 5 * (1 - k));
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, r, r * this.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Arc de lame : croissant effilé qui balaie et s'efface. */
export class SlashArc implements Gizmo {
  t = 0; dead = false;
  constructor(
    public x: number, public y: number, public a0: number, public sweep: number,
    public radius: number, public color: string, public life = 0.26, public width = 20,
  ) {}
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {
    const k = this.t / this.life;
    const grow = ease.out(Math.min(1, k * 1.7));
    const alpha = 1 - ease.in(k);
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y);
    const steps = 18;
    for (let pass = 0; pass < 2; pass++) {
      const w = pass === 0 ? this.width : this.width * 0.34;
      ctx.globalAlpha = alpha * (pass === 0 ? 0.55 : 1);
      ctx.fillStyle = pass === 0 ? this.color : '#ffffff';
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = this.a0 + this.sweep * t * grow;
        const taper = Math.sin(Math.PI * t);
        const r = this.radius + taper * 2;
        const px = Math.cos(a) * (r + w * 0.5 * taper);
        const py = Math.sin(a) * (r + w * 0.5 * taper);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = this.a0 + this.sweep * t * grow;
        const taper = Math.sin(Math.PI * t);
        const r = this.radius - taper * 2;
        ctx.lineTo(Math.cos(a) * (r - w * 0.5 * taper), Math.sin(a) * (r - w * 0.5 * taper));
      }
      ctx.closePath(); ctx.fill();
    }
  }
}

/** Cercle runique : anneaux concentriques, graduations, glyphes tournants. */
export class RuneCircle implements Gizmo {
  t = 0; dead = false;
  spin = 0;
  constructor(
    public x: number, public y: number, public r: number, public color: string,
    public life = 0.8, public speed = 1.6, public tilt = 0.42,
  ) {}
  update(dt: number): void { this.spin += this.speed * dt; }
  draw(ctx: CanvasRenderingContext2D): void {
    const k = this.t / this.life;
    const pop = ease.outBack(Math.min(1, k * 3.2));
    const a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    const R = this.r * pop;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y);
    ctx.scale(1, this.tilt);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = a * 0.9;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a * 0.55;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.44, 0, Math.PI * 2); ctx.stroke();
    // graduations
    ctx.globalAlpha = a * 0.8;
    for (let i = 0; i < 24; i++) {
      const ang = this.spin + (i / 24) * Math.PI * 2;
      const l = i % 6 === 0 ? 10 : 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * R, Math.sin(ang) * R);
      ctx.lineTo(Math.cos(ang) * (R - l), Math.sin(ang) * (R - l));
      ctx.stroke();
    }
    // triangle interne
    ctx.globalAlpha = a * 0.7;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ang = -this.spin * 0.7 + (i / 3) * Math.PI * 2;
      const px = Math.cos(ang) * R * 0.72, py = Math.sin(ang) * R * 0.72;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
  }
}

/** Éclair fractal entre deux points, régénéré à chaque image. */
export class Bolt implements Gizmo {
  t = 0; dead = false;
  pts: number[][] = [];
  constructor(
    public x1: number, public y1: number, public x2: number, public y2: number,
    public color: string, public life = 0.22, public chaos = 26, public width = 3,
  ) { this.regen(); }
  regen(): void {
    const pts: number[][] = [[this.x1, this.y1], [this.x2, this.y2]];
    let amp = this.chaos;
    for (let pass = 0; pass < 4; pass++) {
      const out: number[][] = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const o = rr(-amp, amp);
        out.push([mx + nx * o, my + ny * o], b);
      }
      pts.length = 0; pts.push(...out);
      amp *= 0.52;
    }
    this.pts = pts;
  }
  update(): void { if (Math.random() < 0.6) this.regen(); }
  draw(ctx: CanvasRenderingContext2D): void {
    const k = this.t / this.life;
    const a = 1 - k * k;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? this.color : '#ffffff';
      ctx.lineWidth = pass === 0 ? this.width * 3 : this.width;
      ctx.globalAlpha = a * (pass === 0 ? 0.5 : 1);
      ctx.beginPath();
      this.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
      ctx.stroke();
    }
  }
}

/** Colonne d'énergie montante (jugement, super). */
export class Pillar implements Gizmo {
  t = 0; dead = false;
  constructor(public x: number, public y: number, public color: string, public life = 0.6, public w = 54, public h = 300) {}
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {
    const k = this.t / this.life;
    const grow = ease.out(Math.min(1, k * 2.6));
    const a = k > 0.5 ? 1 - (k - 0.5) / 0.5 : 1;
    const h = this.h * grow;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y);
    const g = ctx.createLinearGradient(0, 0, 0, -h);
    g.addColorStop(0, this.color);
    g.addColorStop(0.5, this.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = g;
    const w = this.w * (1 - k * 0.25);
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w * 0.16, -h, w * 0.32, h);
  }
}

/** Dôme de protection. */
export class Dome implements Gizmo {
  t = 0; dead = false;
  constructor(public get: () => { x: number; y: number }, public r: number, public color: string, public life: number) {}
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.get();
    const k = this.t / this.life;
    const pop = ease.outElastic(Math.min(1, k * 4));
    const a = (k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1) * 0.85;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    const R = this.r * pop;
    const g = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, this.color);
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a;
    ctx.strokeStyle = this.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    // facettes hexagonales
    ctx.globalAlpha = a * 0.4;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const ang = this.t * 1.2 + (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, R, R * Math.abs(Math.cos(ang)), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Silhouette de renard / sceau animal pour Kira. */
export class FoxSigil implements Gizmo {
  t = 0; dead = false;
  constructor(public x: number, public y: number, public s: number, public color: string, public life = 0.5, public dir = 1) {}
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {
    const k = this.t / this.life;
    const a = 1 - ease.in(k);
    const s = this.s * (0.8 + ease.out(k) * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir * s, s);
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    // museau + oreilles stylisés
    ctx.beginPath();
    ctx.moveTo(-1, 0.1); ctx.lineTo(-0.35, -0.75); ctx.lineTo(-0.1, -0.2);
    ctx.lineTo(0.35, -0.9); ctx.lineTo(0.5, -0.1); ctx.lineTo(1.1, 0.25);
    ctx.lineTo(0.2, 0.65); ctx.lineTo(-0.6, 0.5);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(0.18, -0.08, 0.17, 0.09, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-0.3, -0.05, 0.14, 0.08, -0.3, 0, Math.PI * 2); ctx.fill();
  }
}

/** Fissures / éclats de vide pour Zen. */
export class VoidRift implements Gizmo {
  t = 0; dead = false;
  spikes: number[] = [];
  constructor(public x: number, public y: number, public r: number, public color: string, public life = 0.7) {
    for (let i = 0; i < 14; i++) this.spikes.push(rr(0.55, 1.45));
  }
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {
    const k = this.t / this.life;
    const grow = ease.out(Math.min(1, k * 2));
    const a = 1 - ease.in(k);
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = this.color;
    const n = this.spikes.length;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r1 = this.r * grow * this.spikes[i];
      const r2 = this.r * grow * 0.28;
      const a1 = ang, a2 = ang + Math.PI / n;
      i === 0 ? ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1 * 0.9)
              : ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1 * 0.9);
      ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2 * 0.9);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, this.r * grow * 0.16, 0, Math.PI * 2); ctx.fill();
  }
}

/** Image d'effet découpée dans la fiche, dessinée en additif. */
export interface FxImgOpts {
  img: CanvasImageSource;
  sx: number; sy: number; sw: number; sh: number;
  x: number; y: number;
  size: number;                      // hauteur voulue à l'écran
  life?: number;
  from?: number; to?: number;        // échelle au début / à la fin
  rot?: number; spin?: number;
  flip?: number;                     // -1 pour retourner
  alpha?: number;
  tilt?: number;                     // aplatissement (cercles posés au sol)
  follow?: () => { x: number; y: number };
  fade?: 'out' | 'inOut';
}

export class FxImage implements Gizmo {
  t = 0; dead = false; life: number;
  constructor(public o: FxImgOpts) { this.life = o.life ?? 0.5; }
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {
    const o = this.o;
    const k = this.t / this.life;
    const grow = lerp(o.from ?? 0.7, o.to ?? 1.15, ease.out(k));
    const a = (o.alpha ?? 1) * (o.fade === 'inOut'
      ? Math.sin(Math.PI * Math.min(1, k))
      : 1 - ease.in(k));
    if (a <= 0.004) return;
    const p = o.follow ? o.follow() : { x: o.x, y: o.y };
    const scale = (o.size / o.sh) * grow;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    if (o.rot || o.spin) ctx.rotate((o.rot ?? 0) + (o.spin ?? 0) * this.t);
    ctx.scale((o.flip ?? 1) * scale, scale * (o.tilt ?? 1));
    ctx.drawImage(o.img, o.sx, o.sy, o.sw, o.sh, -o.sw / 2, -o.sh / 2, o.sw, o.sh);
  }
}

/** Texte flottant (dégâts, COMBO, etc.) */
export class FloatText implements Gizmo {
  t = 0; dead = false;
  constructor(
    public x: number, public y: number, public text: string, public color: string,
    public life = 0.75, public size = 26, public vy = -52,
  ) {}
  update(dt: number): void { this.y += this.vy * dt; this.vy *= Math.pow(0.9, dt * 60); }
  draw(ctx: CanvasRenderingContext2D): void {
    const k = this.t / this.life;
    const pop = ease.outBack(Math.min(1, k * 5));
    ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    ctx.translate(this.x, this.y);
    ctx.scale(pop, pop);
    ctx.font = `900 ${this.size}px Oxanium, Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(6,5,12,0.9)';
    ctx.strokeText(this.text, 0, 0);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
  }
}

export const randSpark = (n: number) => ri(n, n + 3);
