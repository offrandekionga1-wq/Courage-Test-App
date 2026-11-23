// ---------------------------------------------------------------------------
// Neon Clash — musique.
// Aucune banque de sons libre n'étant accessible depuis l'atelier de build, la
// bande-son est jouée par un petit séquenceur Web Audio : rien à télécharger,
// rien à licencier, zéro octet dans l'APK.
// ---------------------------------------------------------------------------

type Mood = 'menu' | 'fight' | 'tense';

const NOTE = (semi: number) => 440 * Math.pow(2, semi / 12);

/** Motifs sur 16 doubles-croches ; -1 = silence, sinon degré de la gamme. */
const SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19];

const PATTERNS = {
  fight: {
    bpm: 148,
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1],
    bass: [0, -1, 0, -1, 3, -1, 0, -1, 5, -1, 5, -1, 3, -1, 2, -1],
    lead: [-1, -1, 7, -1, -1, 5, -1, -1, 7, 8, -1, 7, -1, 5, 3, -1],
    chordEvery: 8,
    chords: [[0, 3, 7], [0, 3, 7], [5, 8, 12], [3, 7, 10]],
  },
  tense: {
    bpm: 164,
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bass: [0, 0, -1, 0, 7, -1, 0, -1, 10, -1, 8, -1, 7, -1, 5, 3],
    lead: [12, -1, 10, -1, 8, -1, 7, -1, 10, -1, 12, -1, 14, -1, 12, 10],
    chordEvery: 4,
    chords: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [7, 10, 14]],
  },
  menu: {
    bpm: 92,
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass: [0, -1, -1, -1, -1, -1, 5, -1, -1, -1, -1, -1, 3, -1, -1, -1],
    lead: [-1, -1, -1, 7, -1, -1, -1, -1, -1, 10, -1, -1, -1, 7, -1, -1],
    chordEvery: 16,
    chords: [[0, 3, 7], [5, 8, 12]],
  },
} as const;

class MusicEngine {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private timer = 0;
  private step = 0;
  private nextTime = 0;
  private mood: Mood = 'menu';
  private root = -9;            // transposition en demi-tons
  enabled = true;
  playing = false;

  attach(ctx: AudioContext, master: GainNode): void {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.enabled ? 0.0001 : 0.0001;
    this.out.connect(master);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.stop();
  }

  /** `key` transpose le morceau : chaque arène a sa tonalité. */
  play(mood: Mood, key = -9): void {
    if (!this.enabled || !this.ctx || !this.out) return;
    if (this.playing && this.mood === mood && this.root === key) return;
    this.mood = mood;
    this.root = key;
    if (!this.playing) {
      this.playing = true;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.08;
      this.timer = window.setInterval(() => this.tick(), 25);
    }
    this.fade(mood === 'menu' ? 0.2 : 0.26, 0.8);
  }

  duck(on: boolean): void { this.fade(on ? 0.06 : (this.mood === 'menu' ? 0.2 : 0.26), 0.3); }

  stop(): void {
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = 0; }
    this.fade(0.0001, 0.4);
  }

  private fade(to: number, time: number): void {
    if (!this.ctx || !this.out) return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(Math.max(this.out.gain.value, 0.0001), t);
    this.out.gain.exponentialRampToValueAtTime(Math.max(to, 0.0001), t + time);
  }

  // ------------------------------------------------------------ voix ------
  private env(src: AudioNode, t: number, a: number, d: number, peak: number, dest?: AudioNode): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    src.connect(g);
    g.connect(dest ?? this.out!);
  }

  private noiseBuf: AudioBuffer | null = null;
  private noise(): AudioBufferSourceNode {
    const ctx = this.ctx!;
    if (!this.noiseBuf) {
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    return s;
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    this.env(o, t, 0.004, 0.2, 0.75);
    o.start(t); o.stop(t + 0.3);
  }

  private snare(t: number): void {
    const ctx = this.ctx!;
    const n = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.9;
    n.connect(f);
    this.env(f, t, 0.003, 0.14, 0.3);
    n.start(t); n.stop(t + 0.2);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    this.env(o, t, 0.003, 0.08, 0.16);
    o.start(t); o.stop(t + 0.14);
  }

  private hat(t: number, open: boolean): void {
    const ctx = this.ctx!;
    const n = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 8200;
    n.connect(f);
    this.env(f, t, 0.002, open ? 0.1 : 0.035, 0.1);
    n.start(t); n.stop(t + 0.16);
  }

  private bass(t: number, semi: number, dur: number): void {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(240, t + dur);
    f.Q.value = 7;
    for (const [type, det, vol] of [['sawtooth', 0, 0.3], ['square', -12, 0.18]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = NOTE(semi + det - 24);
      o.connect(f);
      o.start(t); o.stop(t + dur + 0.05);
      void vol;
    }
    this.env(f, t, 0.006, dur, 0.34);
  }

  private lead(t: number, semi: number, dur: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = NOTE(semi);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 2600;
    o.connect(f);
    this.env(f, t, 0.01, dur, 0.1);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private chord(t: number, semis: number[], dur: number): void {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1500;
    for (const s of semis) {
      for (const det of [-5, 5]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = NOTE(s - 12) * Math.pow(2, det / 1200);
        o.connect(f);
        o.start(t); o.stop(t + dur + 0.1);
      }
    }
    this.env(f, t, 0.12, dur, 0.055);
  }

  // ----------------------------------------------------------- séquence ---
  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    const pat = PATTERNS[this.mood];
    const stepDur = 60 / pat.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.25) {
      const t = this.nextTime;
      const i = this.step % 16;
      const bar = Math.floor(this.step / 16);
      if (pat.kick[i]) this.kick(t);
      if (pat.snare[i]) this.snare(t);
      if (pat.hat[i]) this.hat(t, i % 8 === 6);
      const b = pat.bass[i];
      if (b >= 0) this.bass(t, this.root + SCALE_MINOR[b % SCALE_MINOR.length], stepDur * 1.8);
      const l = pat.lead[i];
      if (l >= 0 && this.mood !== 'menu') this.lead(t, this.root + SCALE_MINOR[l % SCALE_MINOR.length], stepDur * 1.5);
      else if (l >= 0) this.lead(t, this.root + SCALE_MINOR[l % SCALE_MINOR.length], stepDur * 3);
      if (this.step % pat.chordEvery === 0) {
        const c = pat.chords[bar % pat.chords.length];
        this.chord(t, c.map((d) => this.root + SCALE_MINOR[d % SCALE_MINOR.length]), stepDur * pat.chordEvery);
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }

  /** Accord d'emphase joué au déclenchement d'une technique. */
  stinger(key: number, big = false): void {
    const ctx = this.ctx;
    if (!ctx || !this.enabled || !this.out) return;
    const t = ctx.currentTime;
    const semis = big ? [0, 7, 12, 19] : [0, 7, 12];
    for (const s of semis) {
      const o = ctx.createOscillator();
      o.type = big ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(NOTE(key + s - 12), t);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(5200, t);
      f.frequency.exponentialRampToValueAtTime(700, t + (big ? 1.1 : 0.5));
      o.connect(f);
      this.env(f, t, 0.008, big ? 1.1 : 0.45, big ? 0.16 : 0.1);
      o.start(t); o.stop(t + (big ? 1.3 : 0.6));
    }
  }
}

export const Music = new MusicEngine();
export type { Mood };
