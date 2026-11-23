// ---------------------------------------------------------------------------
// Neon Clash — noyau: maths, aléatoire, boucle de jeu, audio procédural, entrées
// ---------------------------------------------------------------------------

export const VW = 960; // largeur logique
export const VH = 540; // hauteur logique
export const GROUND_Y = 452; // ligne de sol dans l'espace logique

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const ease = {
  out: (t: number) => 1 - (1 - t) * (1 - t),
  in: (t: number) => t * t,
  outBack: (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
  outElastic: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * 2.1) + 1,
};

let seed = 1337;
export function rnd(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
export const rr = (a: number, b: number) => a + rnd() * (b - a);
export const ri = (a: number, b: number) => Math.floor(rr(a, b + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

export function approach(v: number, target: number, step: number): number {
  if (v < target) return Math.min(v + step, target);
  if (v > target) return Math.max(v - step, target);
  return v;
}

export interface Vec { x: number; y: number }

export function aabb(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// --------------------------------------------------------------- Audio -----
// Tous les sons sont synthétisés : aucun fichier audio dans l'APK.
class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  unlock(): void { this.ensure(); }
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.5 : 0;
  }

  private env(node: AudioNode, t0: number, a: number, d: number, peak: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g);
    g.connect(this.master!);
    return g;
  }

  private noise(dur: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    this.env(o, t0, 0.008, dur, vol);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  whoosh(vol = 0.22): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = this.noise(0.22);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(380, t0);
    f.frequency.exponentialRampToValueAtTime(1800, t0 + 0.2);
    n.connect(f);
    this.env(f, t0, 0.03, 0.2, vol);
    n.start(t0); n.stop(t0 + 0.3);
  }

  hit(power = 1): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = this.noise(0.16);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2600, t0);
    f.frequency.exponentialRampToValueAtTime(260, t0 + 0.14);
    n.connect(f);
    this.env(f, t0, 0.004, 0.14, 0.34 * power);
    n.start(t0); n.stop(t0 + 0.2);
    this.tone(120 * (1 / power), 0.12, 'square', 0.14 * power, 48);
  }

  block(): void {
    const ctx = this.ensure(); if (!ctx) return;
    this.tone(880, 0.1, 'triangle', 0.16, 1500);
    const t0 = ctx.currentTime;
    const n = this.noise(0.1);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2200;
    n.connect(f);
    this.env(f, t0, 0.003, 0.09, 0.2);
    n.start(t0); n.stop(t0 + 0.12);
  }

  zap(): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = this.noise(0.3);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(2400, t0);
    f.frequency.exponentialRampToValueAtTime(600, t0 + 0.28);
    n.connect(f);
    this.env(f, t0, 0.005, 0.28, 0.26);
    n.start(t0); n.stop(t0 + 0.34);
    this.tone(220, 0.3, 'sawtooth', 0.12, 70);
  }

  boom(): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = this.noise(0.8);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t0);
    f.frequency.exponentialRampToValueAtTime(70, t0 + 0.7);
    n.connect(f);
    this.env(f, t0, 0.01, 0.75, 0.5);
    n.start(t0); n.stop(t0 + 0.9);
    this.tone(70, 0.7, 'sine', 0.3, 32);
  }

  ui(up = true): void { this.tone(up ? 660 : 420, 0.09, 'triangle', 0.16, up ? 980 : 300); }

  fanfare(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.2), i * 95));
  }
}
export const Sfx = new SfxEngine();

// -------------------------------------------------------------- Entrées ----
export interface Pad {
  left: boolean; right: boolean; up: boolean; down: boolean;
  atk: boolean; sp: boolean; ult: boolean;
  // fronts montants consommables
  atkEdge: boolean; spEdge: boolean; ultEdge: boolean; upEdge: boolean;
}
export const newPad = (): Pad => ({
  left: false, right: false, up: false, down: false,
  atk: false, sp: false, ult: false,
  atkEdge: false, spEdge: false, ultEdge: false, upEdge: false,
});
export function clearEdges(p: Pad): void {
  p.atkEdge = false; p.spEdge = false; p.ultEdge = false; p.upEdge = false;
}

// ---------------------------------------------------------------- Loop -----
export class Loop {
  private raf = 0;
  private last = 0;
  private acc = 0;
  running = false;
  constructor(private step: (dt: number) => void, private render: () => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.25) dt = 0.25; // onglet revenu au premier plan
      this.acc += dt;
      const FIXED = 1 / 60;
      let guard = 0;
      while (this.acc >= FIXED && guard < 5) { this.step(FIXED); this.acc -= FIXED; guard++; }
      if (guard >= 5) this.acc = 0;
      this.render();
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop(): void { this.running = false; cancelAnimationFrame(this.raf); }
}
