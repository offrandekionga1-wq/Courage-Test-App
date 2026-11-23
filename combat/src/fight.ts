// ---------------------------------------------------------------------------
// Neon Clash — scène de combat : physique, touches, IA, caméra, décor, HUD data
// ---------------------------------------------------------------------------
import {
  VW, VH, GROUND_Y, clamp, lerp, rr, ease, Pad, Sfx, aabb, approach,
} from './core';
import {
  CharId, Pose, POSE, blend, solve, drawFighter, drawShadow, Strand, PALETTES, Joints,
} from './art';
import { Fx, FloatText, Shock, glowSprite } from './vfx';
import { ROSTER, Character, Move, ProjSpec, GameApi, FighterRef } from './roster';

const HURT_W = 52;
const STAND_H = 150;
const CROUCH_H = 98;
const GRAVITY = 1800;
const STAGE_MIN = 60;
const STAGE_MAX = VW - 60;

export type Phase = 'intro' | 'fight' | 'ko' | 'over';

interface Ghost { pose: Pose; x: number; y: number; face: number; t: number; life: number; scale: number }

interface Proj {
  x: number; y: number; vx: number; vy: number; spec: ProjSpec;
  owner: Fighter; t: number; rot: number; dead: boolean;
}

export class Fighter implements FighterRef {
  cfg: Character;
  x = 0; y = GROUND_Y;
  vx = 0; vy = 0;
  face: 1 | -1 = 1;
  hp: number; maxHp: number;
  meter = 0;
  state: 'idle' | 'walk' | 'back' | 'crouch' | 'jump' | 'block' | 'hurt' | 'ko' | 'attack' | 'win' = 'idle';
  stateT = 0;
  pose: Pose = POSE.idle;
  hair: Strand[] = [];
  coat: Strand[] = [];
  move: Move | null = null;
  moveT = 0;
  movePhase: 'startup' | 'active' | 'recovery' = 'startup';
  prevPose: Pose = POSE.idle;
  hitFlags = new Set<string>();
  hitsDone = 0;
  hitstop = 0;
  hitstun = 0;
  blockstun = 0;
  flash = 0;
  guard = 0;
  invul = 0;
  airborne = false;
  combo = 0;
  comboT = 0;
  jumpsLeft = 1;
  ghosts: Ghost[] = [];
  ghostTimer = 0;
  ghostLife = 0;
  wonRounds = 0;
  anim = 0;
  superLock = 0;
  idleBreath = 0;

  constructor(public id: CharId, public idx: 0 | 1) {
    this.cfg = ROSTER[id];
    this.maxHp = this.cfg.stats.hp;
    this.hp = this.maxHp;
    this.hair = [new Strand(6, 7, 260), new Strand(5, 6, 240)];
    this.coat = [new Strand(6, 9, 300), new Strand(5, 8, 280)];
  }

  get scale(): number { return this.cfg.stats.scale; }
  get cx(): number { return this.x; }
  get cy(): number { return this.y - 76 * this.scale; }
  get height(): number { return (this.state === 'crouch' ? CROUCH_H : STAND_H) * this.scale; }
  get busy(): boolean { return this.state === 'attack' || this.state === 'hurt' || this.state === 'ko'; }

  resetRound(x: number, face: 1 | -1): void {
    this.x = x; this.y = GROUND_Y; this.vx = 0; this.vy = 0;
    this.face = face;
    this.hp = this.maxHp;
    this.state = 'idle'; this.stateT = 0;
    this.move = null; this.hitstun = 0; this.blockstun = 0; this.hitstop = 0;
    this.airborne = false; this.combo = 0; this.guard = 0; this.invul = 0;
    this.flash = 0; this.ghosts.length = 0; this.jumpsLeft = 1; this.superLock = 0;
    this.pose = POSE.idle;
    const j = solve(this.pose);
    for (const s of this.hair) s.reset(this.x, this.y + j.head.y * this.scale);
    for (const s of this.coat) s.reset(this.x, this.y - 60 * this.scale);
  }

  hurtbox(): { x: number; y: number; w: number; h: number } {
    const w = HURT_W * this.scale;
    const h = this.height;
    return { x: this.x - w / 2, y: this.y - h, w, h };
  }

  hitbox(): { x: number; y: number; w: number; h: number } | null {
    if (!this.move || this.movePhase !== 'active' || this.move.noHitbox) return null;
    const b = this.move.box, s = this.scale;
    const w = b.w * s, h = b.h * s;
    const x = this.face > 0 ? this.x + b.x * s : this.x - b.x * s - w;
    return { x, y: this.y + b.y * s, w, h };
  }

  startMove(m: Move, api: GameApi): void {
    if (m.cost && this.meter < m.cost) return;
    if (m.cost) this.meter -= m.cost;
    this.move = m; this.moveT = 0; this.movePhase = 'startup';
    this.state = 'attack'; this.stateT = 0;
    this.hitFlags.clear(); this.hitsDone = 0;
    this.prevPose = this.pose;
    if (m.invul) this.invul = m.startup + m.active;
    if (m.guardTime) this.guard = m.guardTime;
    if (m.superMove) this.superLock = m.startup;
    m.onStart?.(this, api);
    if (m.sfx === 'whoosh') Sfx.whoosh();
  }

  /** Pose courante selon l'état. */
  computePose(dt: number): void {
    this.anim += dt;
    let target: Pose;
    if (this.state === 'attack' && this.move) {
      const m = this.move;
      const t = this.moveT;
      if (t < m.startup) {
        const k = t / m.startup;
        const wind = blend(this.prevPose, m.poses[0], Math.min(1, k * 3));
        target = blend(wind, m.poses[1], ease.in(k));
      } else if (t < m.startup + m.active) {
        target = m.poses[1];
      } else {
        const k = (t - m.startup - m.active) / Math.max(0.001, m.recovery);
        target = blend(m.poses[1], m.poses[2], ease.out(clamp(k, 0, 1)));
      }
      this.pose = target;
      return;
    }
    switch (this.state) {
      case 'walk': {
        const k = (Math.sin(this.anim * 9) + 1) / 2;
        target = blend(POSE.walkA, POSE.walkB, k);
        break;
      }
      case 'back': {
        const k = (Math.sin(this.anim * 8) + 1) / 2;
        target = blend(POSE.backA, POSE.backB, k);
        break;
      }
      case 'crouch': target = POSE.crouch; break;
      case 'block': target = POSE.block; break;
      case 'jump': target = this.vy < -60 ? POSE.jump : POSE.fall; break;
      case 'hurt': {
        const k = clamp(this.hitstun / 0.3, 0, 1);
        target = blend(this.airborne ? POSE.fall : POSE.idle, POSE.hurt, k);
        break;
      }
      case 'ko': target = POSE.ko; break;
      case 'win': {
        const k = (Math.sin(this.anim * 3) + 1) / 2;
        target = blend(POSE.win, POSE.idle2, k * 0.5);
        break;
      }
      default: {
        this.idleBreath += dt;
        const k = (Math.sin(this.idleBreath * 2.6) + 1) / 2;
        target = blend(POSE.idle, POSE.idle2, k);
      }
    }
    const rate = 1 - Math.pow(0.00008, dt);
    this.pose = blend(this.pose, target, rate);
  }

  joints(): Joints { return solve(this.pose); }

  updateStrands(dt: number): void {
    const j = this.joints();
    const s = this.scale;
    const hx = this.x + this.face * j.head.x * s;
    const hy = this.y + j.head.y * s;
    const wind = -this.face * (this.vx * 0.5 + 20);
    this.hair[0].update(dt, hx - this.face * 9 * s, hy - 6 * s, wind);
    this.hair[1].update(dt, hx - this.face * 12 * s, hy + 2 * s, wind * 0.8);
    const bx = this.x + this.face * j.chest.x * s;
    const by = this.y + (j.chest.y + 10) * s;
    this.coat[0].update(dt, bx - this.face * 11 * s, by, wind * 1.15);
    this.coat[1].update(dt, bx - this.face * 5 * s, by + 6 * s, wind * 0.95);
  }

  pushGhost(life: number): void {
    this.ghosts.push({ pose: this.pose, x: this.x, y: this.y, face: this.face, t: 0, life, scale: this.scale });
    if (this.ghosts.length > 10) this.ghosts.shift();
  }
}

// ------------------------------------------------------------------ Stage --
interface StageCfg { sky: [string, string]; accent: string; far: string; near: string; name: string }
const STAGES: Record<CharId, StageCfg> = {
  mika: { sky: ['#1a1405', '#070609'], accent: '#ffc820', far: '#2a2008', near: '#0d0a06', name: 'Sanctuaire doré' },
  ray: { sky: ['#071428', '#05070f'], accent: '#3ba7ff', far: '#0d2440', near: '#060a14', name: 'Orage néon' },
  zen: { sky: ['#140a24', '#07060c'], accent: '#a35cff', far: '#231238', near: '#0b0712', name: 'Faille du vide' },
  kira: { sky: ['#1d070e', '#08050a'], accent: '#ff3450', far: '#300a16', near: '#100609', name: 'Torii écarlate' },
};

// ------------------------------------------------------------------ Scene --
export interface HudState {
  hp: [number, number]; hpMax: [number, number]; meter: [number, number];
  rounds: [number, number]; time: number; combo: [number, number];
  phase: Phase; banner: string; bannerColor: string;
}

export class FightScene implements GameApi {
  fx = new Fx();
  f0: Fighter; f1: Fighter;
  projs: Proj[] = [];
  phase: Phase = 'intro';
  phaseT = 0;
  round = 1;
  roundTime = 90;
  timeScale = 1;
  slowT = 0;
  shakeAmt = 0;
  shakeT = 0;
  camX = VW / 2; camY = 0; camZoom = 1;
  flashColor = '#fff'; flashA = 0; flashDecay = 2.6;
  bannerText = ''; bannerColor = '#fff'; bannerT = 0;
  cinT = 0; cinOwner: Fighter | null = null;
  stage: StageCfg;
  winner: 0 | 1 | -1 = -1;
  onMatchEnd: ((w: 0 | 1) => void) | null = null;
  cpu: 1 | 0 | -1 = 1;      // index contrôlé par l'IA (-1 = aucun)
  difficulty = 1;           // 0.6 facile · 1 normal · 1.4 difficile
  private aiT = 0;
  private aiPlan: 'rush' | 'space' | 'turtle' = 'rush';
  private bgParts: { x: number; y: number; z: number; s: number }[] = [];
  private roundsToWin = 2;

  constructor(a: CharId, b: CharId, opts?: { cpu?: 1 | 0 | -1; difficulty?: number; rounds?: number }) {
    this.f0 = new Fighter(a, 0);
    this.f1 = new Fighter(b, 1);
    this.stage = STAGES[b];
    this.cpu = opts?.cpu ?? 1;
    this.difficulty = opts?.difficulty ?? 1;
    this.roundsToWin = opts?.rounds ?? 2;
    for (let i = 0; i < 46; i++) {
      this.bgParts.push({ x: rr(0, VW), y: rr(40, GROUND_Y), z: rr(0.3, 1), s: rr(1, 2.8) });
    }
    this.startRound(true);
  }

  // ------------------------------------------------------------- GameApi --
  shake(a: number): void { this.shakeAmt = Math.max(this.shakeAmt, a); this.shakeT = 0.3; }
  flash(color: string, alpha: number, time = 0.35): void {
    this.flashColor = color; this.flashA = Math.max(this.flashA, alpha); this.flashDecay = 1 / time;
  }
  slow(time: number, scale = 0.25): void { this.slowT = time; this.timeScale = scale; }
  banner(text: string, color: string): void { this.bannerText = text; this.bannerColor = color; this.bannerT = 1.3; }
  cinematic(owner: FighterRef, time: number): void {
    this.cinT = time; this.cinOwner = owner === this.f0 ? this.f0 : this.f1;
    this.slow(0.5, 0.18);
  }
  afterimage(owner: FighterRef, life = 0.3): void {
    const f = owner === this.f0 ? this.f0 : this.f1;
    f.ghostTimer = life; f.ghostLife = life;
  }
  spawnProj(owner: FighterRef, spec: ProjSpec, dy = 0): void {
    const f = owner === this.f0 ? this.f0 : this.f1;
    this.projs.push({
      x: f.x + f.face * 42, y: f.y + (spec.dy + dy) * f.scale,
      vx: f.face * spec.speed, vy: 0, spec, owner: f, t: 0, rot: 0, dead: false,
    });
  }
  hitAll(owner: FighterRef, damage: number, kbx: number, kby: number, hitstun: number): void {
    const f = owner === this.f0 ? this.f0 : this.f1;
    const o = f === this.f0 ? this.f1 : this.f0;
    this.applyHit(f, o, damage, kbx, kby, hitstun, false);
  }

  // --------------------------------------------------------------- Rounds --
  startRound(first = false): void {
    this.f0.resetRound(VW * 0.33, 1);
    this.f1.resetRound(VW * 0.67, -1);
    this.f0.meter = first ? 0 : this.f0.meter * 0.5;
    this.f1.meter = first ? 0 : this.f1.meter * 0.5;
    this.projs.length = 0;
    this.fx.clear();
    this.phase = 'intro'; this.phaseT = 0;
    this.roundTime = 90;
    this.winner = -1;
    this.banner(`ROUND ${this.round}`, '#ffffff');
  }

  // ------------------------------------------------------------ Boucle ----
  update(dt: number, pads: [Pad, Pad]): void {
    // ralenti global
    if (this.slowT > 0) {
      this.slowT -= dt;
      if (this.slowT <= 0) this.timeScale = 1;
    }
    const sdt = dt * this.timeScale;
    this.phaseT += sdt;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.flashA = Math.max(0, this.flashA - this.flashDecay * dt);
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeAmt = 0; }
    if (this.cinT > 0) this.cinT -= dt;

    if (this.phase === 'intro') {
      if (this.phaseT > 1.5) { this.phase = 'fight'; this.phaseT = 0; this.banner('FIGHT !', this.f0.cfg.color); Sfx.fanfare(); }
    } else if (this.phase === 'fight') {
      this.roundTime = Math.max(0, this.roundTime - sdt);
      if (this.roundTime <= 0) this.endRound(this.f0.hp >= this.f1.hp ? 0 : 1, true);
    } else if (this.phase === 'ko') {
      if (this.phaseT > 2.4) this.nextRound();
    }

    // IA
    if (this.cpu === 0 || this.cpu === 1) {
      const ci: 0 | 1 = this.cpu;
      if (this.phase === 'fight') {
        this.ai(sdt, ci === 0 ? this.f0 : this.f1, ci === 0 ? this.f1 : this.f0, pads[ci]);
      } else {
        const p = pads[ci];
        p.left = p.right = p.up = p.down = p.atk = p.sp = p.ult = false;
        p.atkEdge = p.spEdge = p.ultEdge = p.upEdge = false;
      }
    }

    const fighting = this.phase === 'fight';
    this.updateFighter(this.f0, this.f1, pads[0], sdt, fighting);
    this.updateFighter(this.f1, this.f0, pads[1], sdt, fighting);
    this.resolveCollisions();
    if (fighting) {
      this.checkHits(this.f0, this.f1);
      this.checkHits(this.f1, this.f0);
    }
    this.updateProjs(sdt);
    this.fx.update(sdt);
    this.updateCamera(dt);
  }

  private updateFighter(f: Fighter, o: Fighter, pad: Pad, dt: number, live: boolean): void {
    // orientation
    if (!f.busy && f.state !== 'jump') f.face = o.x > f.x ? 1 : -1;

    if (f.hitstop > 0) { f.hitstop -= dt; f.computePose(0); f.updateStrands(dt); return; }
    f.stateT += dt;
    f.flash = Math.max(0, f.flash - dt * 4);
    f.guard = Math.max(0, f.guard - dt);
    f.invul = Math.max(0, f.invul - dt);
    f.superLock = Math.max(0, f.superLock - dt);
    if (f.comboT > 0) { f.comboT -= dt; if (f.comboT <= 0) f.combo = 0; }

    // traînée fantôme
    if (f.ghostTimer > 0) {
      f.ghostTimer -= dt;
      f.pushGhost(0.22);
    }
    for (let i = f.ghosts.length - 1; i >= 0; i--) {
      f.ghosts[i].t += dt;
      if (f.ghosts[i].t >= f.ghosts[i].life) f.ghosts.splice(i, 1);
    }

    if (f.state === 'ko') {
      f.vy += GRAVITY * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vx *= Math.pow(0.9, dt * 60);
      if (f.y >= GROUND_Y) { f.y = GROUND_Y; f.vy = 0; f.vx *= 0.7; }
      f.x = clamp(f.x, STAGE_MIN, STAGE_MAX);
      f.computePose(dt); f.updateStrands(dt);
      return;
    }

    // dégâts subis
    if (f.hitstun > 0) {
      f.hitstun -= dt;
      f.state = 'hurt';
      f.vy += GRAVITY * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vx *= Math.pow(0.93, dt * 60);
      if (f.y >= GROUND_Y) {
        f.y = GROUND_Y; f.vy = 0; f.vx *= 0.6;
        if (f.airborne) { f.airborne = false; this.fx.dust(f.x, GROUND_Y, 0, 6); }
      }
      f.x = clamp(f.x, STAGE_MIN, STAGE_MAX);
      if (f.hitstun <= 0 && f.y >= GROUND_Y) { f.state = 'idle'; f.vx = 0; f.jumpsLeft = 1; }
      f.computePose(dt); f.updateStrands(dt);
      return;
    }
    if (f.blockstun > 0) {
      f.blockstun -= dt;
      f.state = 'block';
      f.x += f.vx * dt; f.vx *= Math.pow(0.86, dt * 60);
      f.x = clamp(f.x, STAGE_MIN, STAGE_MAX);
      f.computePose(dt); f.updateStrands(dt);
      return;
    }

    // attaque en cours
    if (f.state === 'attack' && f.move) {
      const m = f.move;
      const prevT = f.moveT;
      f.moveT += dt;
      const total = m.startup + m.active + m.recovery;
      const activeStart = m.startup, activeEnd = m.startup + m.active;

      if (prevT < activeStart && f.moveT >= activeStart) {
        f.movePhase = 'active';
        m.onStrike?.(f, this);
        if (m.dashX) f.vx = f.face * m.dashX;
        if (m.dashY) { f.vy = m.dashY; f.airborne = true; }
      } else if (f.moveT >= activeEnd) {
        f.movePhase = 'recovery';
      }
      m.onTick?.(f, this);

      // multi-touches
      if (m.hits && m.hits > 1 && f.movePhase === 'active') {
        const step = m.active / m.hits;
        if (f.moveT - activeStart > f.hitsDone * step) { f.hitFlags.clear(); f.hitsDone++; }
      }

      f.vy += GRAVITY * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vx *= Math.pow(m.dashX ? 0.9 : 0.8, dt * 60);
      if (f.y >= GROUND_Y) {
        f.y = GROUND_Y;
        if (f.airborne) { f.airborne = false; this.fx.dust(f.x, GROUND_Y); }
        f.vy = 0;
      }
      f.x = clamp(f.x, STAGE_MIN, STAGE_MAX);

      if (f.moveT >= total) {
        f.move = null;
        f.state = f.y < GROUND_Y - 1 ? 'jump' : 'idle';
        f.vx = 0;
      }
      f.computePose(dt); f.updateStrands(dt);
      return;
    }

    // --- contrôle libre ---
    const st = f.cfg.stats;
    const fwd = f.face > 0 ? pad.right : pad.left;
    const bwd = f.face > 0 ? pad.left : pad.right;
    const grounded = f.y >= GROUND_Y - 0.5;

    if (live) {
      if (grounded) {
        if (pad.ultEdge && f.meter >= 100) { f.startMove(f.cfg.ult, this); return; }
        if (pad.spEdge) {
          const sp = f.cfg.specials;
          const m = pad.up ? sp.up : bwd ? sp.back : fwd ? sp.forward : sp.neutral;
          if (!m.cost || f.meter >= m.cost) { f.startMove(m, this); return; }
          Sfx.ui(false);
        }
        if (pad.atkEdge) {
          const chain = f.combo > 0 && f.comboT > 0;
          const m = pad.down ? f.cfg.normals.launcher
            : pad.up ? f.cfg.normals.heavy
            : chain && f.combo % 3 === 2 ? f.cfg.normals.heavy
            : chain && f.combo % 3 === 1 ? f.cfg.normals.medium
            : f.cfg.normals.light;
          f.startMove(m, this);
          return;
        }
        if (pad.upEdge && f.jumpsLeft > 0) {
          f.vy = -st.jump; f.jumpsLeft--; f.state = 'jump'; f.airborne = true;
          this.fx.dust(f.x, GROUND_Y, 0, 5);
          Sfx.tone(300, 0.1, 'sine', 0.1, 620);
        } else if (pad.down) {
          f.state = 'crouch'; f.vx = 0;
        } else if (bwd) {
          f.state = 'block'; f.vx = -f.face * st.back * 0.55;
        } else if (fwd) {
          f.state = 'walk'; f.vx = f.face * st.walk;
          if (Math.random() < 0.08) this.fx.dust(f.x - f.face * 10, GROUND_Y, -f.face, 1);
        } else {
          f.state = 'idle'; f.vx = 0;
        }
      } else {
        f.state = 'jump';
        if (pad.atkEdge) { f.startMove(f.cfg.normals.air, this); return; }
        if (pad.spEdge && f.meter >= (f.cfg.specials.up.cost ?? 0)) { f.startMove(f.cfg.specials.up, this); return; }
        const dir = (pad.right ? 1 : 0) + (pad.left ? -1 : 0);
        f.vx = approach(f.vx, dir * st.walk * 1.1, 900 * dt);
      }
    } else {
      f.state = this.phase === 'over' && this.winner === f.idx ? 'win' : 'idle';
      f.vx = 0;
    }

    f.vy += GRAVITY * dt;
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.y >= GROUND_Y) {
      if (f.airborne) { this.fx.dust(f.x, GROUND_Y, 0, 7); Sfx.tone(140, 0.08, 'sine', 0.1, 60); }
      f.y = GROUND_Y; f.vy = 0; f.airborne = false; f.jumpsLeft = 1;
      if (f.state === 'jump') f.state = 'idle';
    }
    f.x = clamp(f.x, STAGE_MIN, STAGE_MAX);
    f.computePose(dt);
    f.updateStrands(dt);
  }

  private resolveCollisions(): void {
    const a = this.f0, b = this.f1;
    const minD = 46 * ((a.scale + b.scale) / 2);
    const d = b.x - a.x;
    if (Math.abs(d) < minD && a.state !== 'ko' && b.state !== 'ko') {
      const push = (minD - Math.abs(d)) / 2 * Math.sign(d || 1);
      a.x -= push; b.x += push;
      a.x = clamp(a.x, STAGE_MIN, STAGE_MAX);
      b.x = clamp(b.x, STAGE_MIN, STAGE_MAX);
    }
  }

  private checkHits(att: Fighter, def: Fighter): void {
    const hb = att.hitbox();
    if (!hb || !att.move) return;
    const key = `${def.idx}:${att.hitsDone}`;
    if (att.hitFlags.has(key)) return;
    const d = def.hurtbox();
    if (!aabb(hb.x, hb.y, hb.w, hb.h, d.x, d.y, d.w, d.h)) return;
    att.hitFlags.add(key);
    const m = att.move;
    this.applyHit(att, def, m.damage, m.kbx, m.kby, m.hitstun, !!m.launcher, m.gain ?? 8);
  }

  private applyHit(
    att: Fighter, def: Fighter, damage: number, kbx: number, kby: number,
    hitstun: number, launcher: boolean, gain = 8,
  ): void {
    if (def.state === 'ko' || def.invul > 0) return;
    const hx = (att.x + def.x) / 2 + att.face * 10;
    const hy = def.y - def.height * 0.55;
    const pal = PALETTES[att.id];

    const blocking = def.state === 'block' && !def.airborne;
    const guarded = def.guard > 0;

    if (blocking || guarded) {
      const chip = Math.round(damage * (guarded ? 0.18 : 0.25));
      def.hp = Math.max(0, def.hp - chip);
      def.blockstun = Math.max(def.blockstun, 0.16);
      def.vx = att.face * kbx * 0.3;
      att.hitstop = 0.05; def.hitstop = 0.05;
      this.fx.giz(new Shock(hx, hy, guarded ? pal.accent : '#cfe4ff', 0.25, 34));
      this.fx.burst(hx, hy, '#cfe4ff', 8, 160);
      this.fx.giz(new FloatText(hx, hy - 30, guarded ? 'BARRIÈRE' : 'GARDE', '#cfe4ff', 0.6, 18));
      this.shake(3);
      Sfx.block();
      def.meter = Math.min(100, def.meter + 3);
      return;
    }

    const crit = att.id === 'kira' && Math.random() < 0.18;
    const dmg = Math.round(damage * (crit ? 1.6 : 1));
    def.hp = Math.max(0, def.hp - dmg);
    def.hitstun = hitstun;
    def.state = 'hurt';
    def.move = null;
    def.flash = 1;
    def.vx = att.face * kbx;
    def.vy = kby;
    if (kby < -120 || launcher) { def.airborne = true; def.jumpsLeft = 0; }
    def.combo = 0;

    att.combo++; att.comboT = 1.6;
    att.meter = Math.min(100, att.meter + gain);
    def.meter = Math.min(100, def.meter + gain * 0.4);

    const power = clamp(dmg / 60, 0.6, 2.2);
    const stop = clamp(0.045 + dmg * 0.0012, 0.05, 0.16);
    att.hitstop = stop; def.hitstop = stop;
    this.fx.impact(hx, hy, pal.accent, power);
    this.fx.burst(hx, hy, '#ffffff', 8, 220);
    this.shake(4 + power * 5);
    Sfx.hit(power);
    if (crit) this.fx.giz(new FloatText(hx + att.face * 36, hy - 76, 'CRITIQUE !', '#ff8f9e', 0.8, 24));
    if (att.combo >= 2) {
      this.fx.giz(new FloatText(att.x - att.face * 54, att.y - 196 - (att.combo % 3) * 22, `${att.combo} COMBO`, pal.accent2, 0.9, 26));
    }

    if (def.hp <= 0) this.ko(att, def);
  }

  private ko(att: Fighter, def: Fighter): void {
    def.state = 'ko'; def.hitstun = 0;
    def.vx = att.face * 320; def.vy = -380; def.airborne = true;
    this.phase = 'ko'; this.phaseT = 0;
    this.winner = att.idx;
    att.wonRounds++;
    this.slow(1.5, 0.22);
    this.shake(16);
    this.flash('#ffffff', 0.5);
    this.banner('K.O.', PALETTES[att.id].accent);
    this.fx.impact(def.x, def.y - 80, PALETTES[att.id].accent, 2.4);
    Sfx.boom();
    setTimeout(() => Sfx.fanfare(), 500);
  }

  private endRound(winnerIdx: 0 | 1, timeout: boolean): void {
    this.winner = winnerIdx;
    (winnerIdx === 0 ? this.f0 : this.f1).wonRounds++;
    this.phase = 'ko'; this.phaseT = 0;
    this.banner(timeout ? 'TEMPS ÉCOULÉ' : 'K.O.', '#ffffff');
    this.slow(1.2, 0.3);
  }

  private nextRound(): void {
    const w = this.f0.wonRounds >= this.roundsToWin ? 0 : this.f1.wonRounds >= this.roundsToWin ? 1 : -1;
    if (w >= 0) {
      this.phase = 'over'; this.phaseT = 0;
      const win = w === 0 ? this.f0 : this.f1;
      win.state = 'win';
      this.banner('VICTOIRE', PALETTES[win.id].accent);
      this.onMatchEnd?.(w as 0 | 1);
      return;
    }
    this.round++;
    this.startRound();
  }

  // ----------------------------------------------------------- Projectiles -
  private updateProjs(dt: number): void {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += (p.spec.spin ?? 0) * dt;
      const pal = PALETTES[p.owner.id];
      if (Math.random() < 0.7) this.fx.trail(p.x, p.y, pal.accent, 1);
      const target = p.owner === this.f0 ? this.f1 : this.f0;
      const hb = target.hurtbox();
      const w = p.spec.w, h = p.spec.h;
      if (!p.dead && aabb(p.x - w / 2, p.y - h / 2, w, h, hb.x, hb.y, hb.w, hb.h)) {
        this.applyHit(p.owner, target, p.spec.damage, p.spec.kbx, p.spec.kby, p.spec.hitstun, false, 6);
        this.fx.impact(p.x, p.y, pal.accent, 1.1);
        if (!p.spec.pierce) p.dead = true;
      }
      if (p.dead || p.t > p.spec.life || p.x < -60 || p.x > VW + 60) {
        if (!p.dead) this.fx.burst(p.x, p.y, pal.accent, 8, 150);
        this.projs.splice(i, 1);
      }
    }
  }

  // --------------------------------------------------------------- Caméra --
  private updateCamera(dt: number): void {
    const mid = (this.f0.x + this.f1.x) / 2;
    const dist = Math.abs(this.f0.x - this.f1.x);
    let targetZoom = clamp(1.26 - dist / 1100, 1, 1.22);
    let tx = mid;
    let ty = (Math.min(this.f0.y, this.f1.y) - GROUND_Y) * 0.18;
    if (this.cinT > 0 && this.cinOwner) {
      targetZoom = 1.42;
      tx = this.cinOwner.x;
      ty = -24;
    }
    this.camZoom = lerp(this.camZoom, targetZoom, 1 - Math.pow(0.002, dt));
    const halfW = VW / 2 / this.camZoom;
    this.camX = lerp(this.camX, clamp(tx, halfW, VW - halfW), 1 - Math.pow(0.004, dt));
    this.camY = lerp(this.camY, ty, 1 - Math.pow(0.01, dt));
  }

  // ------------------------------------------------------------------- IA --
  private ai(dt: number, me: Fighter, foe: Fighter, pad: Pad): void {
    pad.left = pad.right = pad.up = pad.down = false;
    pad.atkEdge = pad.spEdge = pad.ultEdge = pad.upEdge = false;
    pad.atk = pad.sp = pad.ult = false;
    if (me.busy || me.hitstun > 0 || me.blockstun > 0) return;

    this.aiT -= dt;
    const dist = Math.abs(foe.x - me.x);
    const toFoe = Math.sign(foe.x - me.x);
    const d = this.difficulty;

    if (this.aiT <= 0) {
      this.aiT = rr(0.16, 0.42) / d;
      const r = Math.random();
      this.aiPlan = r < 0.56 * d ? 'rush' : r < 0.82 ? 'space' : 'turtle';
    }

    // réaction défensive : garde si l'adversaire attaque près
    const foeAttacking = foe.state === 'attack' && foe.movePhase !== 'recovery';
    if (foeAttacking && dist < 150 && Math.random() < 0.06 * d) {
      pad[toFoe > 0 ? 'left' : 'right'] = true;
      return;
    }
    // esquive des projectiles
    const inc = this.projs.find((p) => p.owner !== me && Math.abs(p.x - me.x) < 240 && Math.sign(p.vx) === -toFoe * -1);
    if (inc && Math.random() < 0.08 * d) {
      if (Math.random() < 0.5) pad.up = pad.upEdge = true;
      else pad[toFoe > 0 ? 'left' : 'right'] = true;
      return;
    }

    if (me.meter >= 100 && dist < 220 && Math.random() < 0.035 * d) { pad.ult = pad.ultEdge = true; return; }

    if (this.aiPlan === 'turtle') {
      pad[toFoe > 0 ? 'left' : 'right'] = true;
      if (me.meter >= 25 && Math.random() < 0.012 * d) { pad.sp = pad.spEdge = true; }
      return;
    }

    if (dist > 330) {
      if (this.aiPlan === 'space' && Math.random() < 0.02 * d) { pad.sp = pad.spEdge = true; return; }
      pad[toFoe > 0 ? 'right' : 'left'] = true;
      if (Math.random() < 0.006) { pad.up = pad.upEdge = true; }
      return;
    }
    if (dist > 150) {
      if (Math.random() < 0.035 * d) { pad.sp = pad.spEdge = true; pad[toFoe > 0 ? 'right' : 'left'] = true; return; }
      pad[toFoe > 0 ? 'right' : 'left'] = true;
      return;
    }
    // à portée
    if (foe.airborne && Math.random() < 0.05 * d) { pad.up = true; pad.sp = pad.spEdge = true; return; }
    if (Math.random() < 0.12 * d) {
      pad.atk = pad.atkEdge = true;
      if (Math.random() < 0.2) pad.down = true;
      return;
    }
    if (Math.random() < 0.02) pad[toFoe > 0 ? 'left' : 'right'] = true;
  }

  hud(): HudState {
    return {
      hp: [this.f0.hp, this.f1.hp],
      hpMax: [this.f0.maxHp, this.f1.maxHp],
      meter: [this.f0.meter, this.f1.meter],
      rounds: [this.f0.wonRounds, this.f1.wonRounds],
      time: Math.ceil(this.roundTime),
      combo: [this.f0.combo, this.f1.combo],
      phase: this.phase,
      banner: this.bannerT > 0 ? this.bannerText : '',
      bannerColor: this.bannerColor,
    };
  }

  // ---------------------------------------------------------------- Rendu --
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = '#05040a';
    ctx.fillRect(0, 0, VW, VH);

    const shX = this.shakeAmt ? rr(-this.shakeAmt, this.shakeAmt) : 0;
    const shY = this.shakeAmt ? rr(-this.shakeAmt, this.shakeAmt) : 0;
    ctx.translate(VW / 2 + shX, VH / 2 + shY);
    ctx.scale(this.camZoom, this.camZoom);
    ctx.translate(-this.camX, -(VH / 2 + this.camY));

    this.drawStage(ctx);

    // combattants (celui en attaque devant)
    const order: Fighter[] = this.f0.state === 'attack' ? [this.f1, this.f0] : [this.f0, this.f1];
    for (const f of order) this.drawFighterFull(ctx, f);
    this.drawProjs(ctx);
    this.fx.draw(ctx);

    ctx.restore();

    if (this.flashA > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.flashA;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    }
    if (this.cinT > 0) this.drawCinematic(ctx);
  }

  private drawStage(ctx: CanvasRenderingContext2D): void {
    const s = this.stage;
    const g = ctx.createLinearGradient(0, -60, 0, GROUND_Y + 80);
    g.addColorStop(0, s.sky[0]);
    g.addColorStop(1, s.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(-200, -200, VW + 400, VH + 400);

    // halo central
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16;
    const img = glowSprite(s.accent);
    ctx.drawImage(img, VW / 2 - 360, GROUND_Y - 420, 720, 560);
    ctx.restore();

    // lune / sceau
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = s.accent;
    ctx.beginPath(); ctx.arc(VW * 0.74, 128, 86, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // silhouettes lointaines
    ctx.fillStyle = s.far;
    for (let i = 0; i < 11; i++) {
      const w = 60 + ((i * 97) % 70);
      const h = 90 + ((i * 53) % 180);
      const x = -40 + i * 95;
      ctx.fillRect(x, GROUND_Y - h, w, h);
    }
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = s.accent;
    for (let i = 0; i < 11; i++) {
      const h = 90 + ((i * 53) % 180);
      const x = -40 + i * 95;
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 8 + k * 13, GROUND_Y - h + 16 + ((i + k) % 5) * 22, 4, 7);
    }
    ctx.restore();

    // torii / portiques proches
    ctx.fillStyle = s.near;
    for (const [x, sc] of [[120, 1], [VW - 150, 1.15]] as [number, number][]) {
      ctx.save();
      ctx.translate(x, GROUND_Y);
      ctx.scale(sc, sc);
      ctx.fillRect(-52, -210, 13, 210);
      ctx.fillRect(40, -210, 13, 210);
      ctx.fillRect(-76, -216, 152, 15);
      ctx.fillRect(-62, -182, 124, 10);
      ctx.restore();
    }

    // particules d'ambiance
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.bgParts) {
      const y = ((p.y + performance.now() * 0.012 * p.z) % (GROUND_Y - 40)) + 40;
      ctx.globalAlpha = 0.1 + p.z * 0.25;
      ctx.fillStyle = s.accent;
      ctx.fillRect(p.x, y, p.s, p.s * 2.4);
    }
    ctx.restore();

    // sol
    const fg = ctx.createLinearGradient(0, GROUND_Y - 6, 0, VH + 60);
    fg.addColorStop(0, '#15121c');
    fg.addColorStop(1, '#05040a');
    ctx.fillStyle = fg;
    ctx.fillRect(-200, GROUND_Y, VW + 400, VH);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = s.accent;
    ctx.fillRect(-200, GROUND_Y - 2, VW + 400, 2.4);
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 22; i++) {
      const x = -100 + i * 52;
      ctx.fillRect(x, GROUND_Y + 4, 30, 1.4);
    }
    ctx.restore();
  }

  private drawFighterFull(ctx: CanvasRenderingContext2D, f: Fighter): void {
    const pal = PALETTES[f.id];
    drawShadow(ctx, f.x, GROUND_Y, GROUND_Y - f.y, f.scale);

    // rémanences
    for (const gh of f.ghosts) {
      const k = 1 - gh.t / gh.life;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(gh.x, gh.y);
      ctx.scale(gh.face * gh.scale, gh.scale);
      ctx.globalAlpha = k * 0.4;
      const j = solve(gh.pose);
      drawFighter(ctx, {
        id: f.id, pose: gh.pose, joints: j, hair: f.hair, coat: f.coat,
        flash: 1, tint: 1, weapon: false, alpha: k * 0.45,
      });
      ctx.restore();
    }

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.face * f.scale, f.scale);
    const j = f.joints();
    // aura de jauge pleine
    if (f.meter >= 100 && f.state !== 'ko') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28 + Math.sin(performance.now() * 0.006) * 0.1;
      ctx.drawImage(glowSprite(pal.accent), -66, -186, 132, 210);
      ctx.restore();
      if (Math.random() < 0.3) {
        this.fx.add({
          x: f.x + rr(-22, 22), y: f.y - rr(0, 140), vx: rr(-14, 14), vy: rr(-70, -26),
          color: pal.accent, kind: 'ember', size: rr(2.5, 5), max: rr(0.4, 0.8),
        });
      }
    }
    // mèches/pans dans l'espace local
    const lx = (wx: number) => (wx - f.x) * f.face / f.scale;
    const ly = (wy: number) => (wy - f.y) / f.scale;
    const localHair = f.hair.map((s) => ({ pts: s.pts.map((p) => ({ x: lx(p.x), y: ly(p.y), px: 0, py: 0 })) })) as unknown as Strand[];
    const localCoat = f.coat.map((s) => ({ pts: s.pts.map((p) => ({ x: lx(p.x), y: ly(p.y), px: 0, py: 0 })) })) as unknown as Strand[];
    drawFighter(ctx, {
      id: f.id, pose: f.pose, joints: j, hair: localHair, coat: localCoat,
      flash: f.flash, tint: 0, weapon: f.state === 'attack', alpha: 1,
    });
    ctx.restore();
  }

  private drawProjs(ctx: CanvasRenderingContext2D): void {
    for (const p of this.projs) {
      const pal = PALETTES[p.owner.id];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 1 + Math.sin(p.t * 24) * 0.08;
      switch (p.spec.kind) {
        case 'card': {
          ctx.drawImage(glowSprite(pal.accent), -32, -32, 64, 64);
          ctx.rotate(p.rot);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#17120a';
          ctx.fillRect(-11, -17, 22, 34);
          ctx.strokeStyle = pal.accent; ctx.lineWidth = 2;
          ctx.strokeRect(-11, -17, 22, 34);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = pal.accent;
          for (let i = 0; i < 3; i++) ctx.fillRect(-5, -9 + i * 8, 10, 2);
          break;
        }
        case 'ball': {
          ctx.drawImage(glowSprite(pal.accent), -46 * pulse, -46 * pulse, 92 * pulse, 92 * pulse);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(0, 0, 9 * pulse, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = pal.accent2; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 17 * pulse, p.t * 9, p.t * 9 + 4); ctx.stroke();
          break;
        }
        case 'fox': {
          ctx.scale(Math.sign(p.vx), 1);
          ctx.drawImage(glowSprite(pal.accent), -52, -40, 104, 80);
          ctx.fillStyle = pal.accent2;
          ctx.beginPath();
          ctx.moveTo(-26, 0); ctx.lineTo(-6, -16); ctx.lineTo(2, -4);
          ctx.lineTo(22, -10); ctx.lineTo(26, 2); ctx.lineTo(4, 14); ctx.lineTo(-16, 10);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.ellipse(10, -2, 4, 2.4, -0.2, 0, Math.PI * 2); ctx.fill();
          break;
        }
        default: {
          ctx.drawImage(glowSprite(pal.accent), -40, -40, 80, 80);
        }
      }
      ctx.restore();
    }
  }

  private drawCinematic(ctx: CanvasRenderingContext2D): void {
    const k = clamp(this.cinT / 1.1, 0, 1);
    const a = Math.sin(k * Math.PI) * 0.9;
    const f = this.cinOwner!;
    const pal = PALETTES[f.id];
    ctx.save();
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = '#05040a';
    ctx.fillRect(0, 0, VW, 70);
    ctx.fillRect(0, VH - 70, VW, 70);
    ctx.globalAlpha = a;
    ctx.fillStyle = pal.accent;
    ctx.fillRect(0, 68, VW, 3);
    ctx.fillRect(0, VH - 71, VW, 3);
    ctx.restore();
  }
}

export { STAGES };
