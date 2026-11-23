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
  private bus: GainNode | null = null;      // bus des bruitages
  private crunch: WaveShaperNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  enabled = true;
  private onReady: ((ctx: AudioContext, master: GainNode) => void) | null = null;

  /** Appelé dès que le contexte existe : sert à brancher la musique. */
  whenReady(fn: (ctx: AudioContext, master: GainNode) => void): void {
    this.onReady = fn;
    if (this.ctx && this.master) fn(this.ctx, this.master);
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      const AC = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);

      // léger écrêtage : donne du corps aux impacts sans saturer la sortie
      this.crunch = this.ctx.createWaveShaper();
      const n = 1024;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * 2.2);
      }
      this.crunch.curve = curve;
      this.crunch.oversample = '2x';

      this.bus = this.ctx.createGain();
      this.bus.gain.value = this.enabled ? 0.55 : 0;
      this.bus.connect(this.crunch);
      this.crunch.connect(this.master);
      this.onReady?.(this.ctx, this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  unlock(): void { this.ensure(); }
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.bus) this.bus.gain.value = on ? 0.55 : 0;
  }

  private env(node: AudioNode, t0: number, a: number, d: number, peak: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g);
    g.connect(this.bus!);
    return g;
  }

  private noise(): AudioBufferSourceNode {
    const ctx = this.ctx!;
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 1.2);
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
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

  /** Souffle d'un coup : bande de bruit qui monte puis s'ouvre. */
  whoosh(vol = 0.3): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 2.4;
    f.frequency.setValueAtTime(320, t0);
    f.frequency.exponentialRampToValueAtTime(2600, t0 + 0.16);
    f.frequency.exponentialRampToValueAtTime(900, t0 + 0.26);
    n.connect(f);
    this.env(f, t0, 0.025, 0.24, vol);
    n.start(t0); n.stop(t0 + 0.34);
  }

  /**
   * Impact : trois couches — un claquement très court, un corps grave qui
   * descend, et une queue bruitée. C'est ce qui donne du poids au coup.
   */
  hit(power = 1): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const p = Math.min(power, 2.6);

    const n = this.noise();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2600;
    n.connect(hp);
    this.env(hp, t0, 0.001, 0.035, 0.3 * p);
    n.start(t0); n.stop(t0 + 0.08);

    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(260 / Math.sqrt(p), t0);
    body.frequency.exponentialRampToValueAtTime(58, t0 + 0.14);
    this.env(body, t0, 0.003, 0.16, 0.5 * p);
    body.start(t0); body.stop(t0 + 0.26);

    const n2 = this.noise();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t0);
    lp.frequency.exponentialRampToValueAtTime(220, t0 + 0.18);
    n2.connect(lp);
    this.env(lp, t0, 0.004, 0.2, 0.26 * p);
    n2.start(t0); n2.stop(t0 + 0.3);

    if (p > 1.4) {
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(90, t0);
      sub.frequency.exponentialRampToValueAtTime(38, t0 + 0.3);
      this.env(sub, t0, 0.006, 0.34, 0.4);
      sub.start(t0); sub.stop(t0 + 0.42);
    }
  }

  /** Garde : choc métallique, partiels inharmoniques. */
  block(): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const [f0, v] of [[1180, 0.12], [1790, 0.09], [2630, 0.07], [3910, 0.05]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.86, t0 + 0.26);
      this.env(o, t0, 0.002, 0.26, v);
      o.start(t0); o.stop(t0 + 0.36);
    }
    const n = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 3400;
    n.connect(f);
    this.env(f, t0, 0.002, 0.07, 0.2);
    n.start(t0); n.stop(t0 + 0.12);
  }

  zap(): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 9;
    f.frequency.setValueAtTime(3200, t0);
    f.frequency.exponentialRampToValueAtTime(520, t0 + 0.3);
    n.connect(f);
    this.env(f, t0, 0.003, 0.3, 0.3);
    n.start(t0); n.stop(t0 + 0.4);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(760, t0);
    o.frequency.exponentialRampToValueAtTime(70, t0 + 0.28);
    this.env(o, t0, 0.004, 0.3, 0.18);
    o.start(t0); o.stop(t0 + 0.4);
  }

  boom(): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1400, t0);
    f.frequency.exponentialRampToValueAtTime(70, t0 + 0.8);
    n.connect(f);
    this.env(f, t0, 0.008, 0.9, 0.5);
    n.start(t0); n.stop(t0 + 1.1);
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, t0);
    sub.frequency.exponentialRampToValueAtTime(28, t0 + 0.8);
    this.env(sub, t0, 0.006, 0.85, 0.55);
    sub.start(t0); sub.stop(t0 + 1.05);
  }

  /** Montée avant une technique chargée. */
  charge(dur = 0.5): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t0);
    o.frequency.exponentialRampToValueAtTime(900, t0 + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(300, t0);
    f.frequency.exponentialRampToValueAtTime(3200, t0 + dur);
    o.connect(f);
    this.env(f, t0, dur * 0.7, dur * 0.4, 0.18);
    o.start(t0); o.stop(t0 + dur + 0.1);
  }

  step(): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 520;
    n.connect(f);
    this.env(f, t0, 0.003, 0.06, 0.09);
    n.start(t0); n.stop(t0 + 0.1);
  }

  land(): void {
    const ctx = this.ensure(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t0);
    o.frequency.exponentialRampToValueAtTime(44, t0 + 0.16);
    this.env(o, t0, 0.004, 0.2, 0.26);
    o.start(t0); o.stop(t0 + 0.3);
    const n = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    n.connect(f);
    this.env(f, t0, 0.004, 0.14, 0.14);
    n.start(t0); n.stop(t0 + 0.22);
  }

  ui(up = true): void { this.tone(up ? 620 : 400, 0.08, 'triangle', 0.12, up ? 920 : 280); }

  fanfare(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.32, 'triangle', 0.16), i * 95));
  }
}
export const Sfx = new SfxEngine();

/** Retour haptique court (Android). Silencieux là où c'est indisponible. */
export function buzz(ms: number): void {
  try { navigator.vibrate?.(ms); } catch { /* non supporté */ }
}

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
