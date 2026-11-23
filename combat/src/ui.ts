// ---------------------------------------------------------------------------
// Neon Clash — interface DOM : écrans, HUD, contrôles tactiles.
// ---------------------------------------------------------------------------
import { CharId, ROSTER, ROSTER_IDS, Character } from './roster';
import { Sfx, Pad } from './core';
import type { HudState } from './fight';

export type Mode = '1p' | '2p' | 'training';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const screens = $('screens');

export const portrait = (id: CharId) => `art/${id}-portrait.webp`;
export const facePic = (id: CharId) => `art/${id}-face.webp`;

function h(tag: string, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function clickable(el: HTMLElement, fn: () => void): HTMLElement {
  el.addEventListener('click', (ev) => { ev.preventDefault(); Sfx.ui(); fn(); });
  return el;
}

export function clearScreens(): void { screens.innerHTML = ''; }

function screen(): HTMLElement {
  clearScreens();
  const s = h('div', 'screen');
  screens.appendChild(s);
  return s;
}

// =============================================================== Titre =====
export interface Settings { difficulty: number; sound: boolean }

export function titleScreen(
  st: Settings,
  onPlay: (m: Mode) => void,
  onHelp: () => void,
): void {
  const s = screen();
  s.classList.add('split');
  const colA = h('div', 'col');
  const colB = h('div', 'col');
  s.append(colA, colB);
  colA.appendChild(h('div', 'kicker', 'Arène de combat · 4 champions'));
  colA.appendChild(h('h1', 'title-xl', 'NEON<br>CLASH'));

  const menu = h('div', 'menu');
  menu.appendChild(clickable(
    h('button', 'mbtn primary', '<span>Combat solo<small>Affronte l’IA en 2 manches gagnantes</small></span><span class="arrow">▶</span>'),
    () => onPlay('1p'),
  ));
  menu.appendChild(clickable(
    h('button', 'mbtn', '<span>2 joueurs<small>Même appareil ou clavier</small></span><span class="arrow">▶</span>'),
    () => onPlay('2p'),
  ));
  menu.appendChild(clickable(
    h('button', 'mbtn', '<span>Entraînement<small>Adversaire passif, jauge infinie</small></span><span class="arrow">▶</span>'),
    () => onPlay('training'),
  ));
  menu.appendChild(clickable(h('button', 'mbtn', '<span>Coups spéciaux</span><span class="arrow">?</span>'), onHelp));
  colB.appendChild(menu);

  const row = h('div', 'row');
  const diffs: [string, number][] = [['Facile', 0.6], ['Normal', 1], ['Difficile', 1.5]];
  for (const [label, v] of diffs) {
    const c = h('button', `chip${st.difficulty === v ? ' on' : ''}`, label);
    clickable(c, () => {
      st.difficulty = v;
      row.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
      c.classList.add('on');
      save(st);
    });
    row.appendChild(c);
  }
  const snd = h('button', `chip${st.sound ? ' on' : ''}`, st.sound ? '♪ Son' : '✕ Son');
  clickable(snd, () => {
    st.sound = !st.sound;
    Sfx.setEnabled(st.sound);
    snd.classList.toggle('on', st.sound);
    snd.textContent = st.sound ? '♪ Son' : '✕ Son';
    save(st);
  });
  row.appendChild(snd);
  colB.appendChild(row);
}

export function save(st: Settings): void {
  try { localStorage.setItem('neonclash', JSON.stringify(st)); } catch { /* ignore */ }
}
export function load(): Settings {
  try {
    const raw = localStorage.getItem('neonclash');
    if (raw) return { difficulty: 1, sound: true, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch { /* ignore */ }
  return { difficulty: 1, sound: true };
}

// ====================================================== Sélection perso ====
export function selectScreen(
  mode: Mode,
  onDone: (p1: CharId, p2: CharId) => void,
  onBack: () => void,
): void {
  const s = screen();
  let p1: CharId | null = null;
  let p2: CharId | null = null;
  let turn: 1 | 2 = 1;

  const head = h('div', 'selhead');
  const title = h('h2', '', 'CHOISIS TON COMBATTANT');
  const turnLbl = h('span', 'turn p1', 'Joueur 1');
  head.append(title, turnLbl);
  s.appendChild(head);

  const cards = h('div', 'cards');
  const info = h('div', 'infobar');
  const cardEls: Record<string, HTMLElement> = {};

  const showInfo = (c: Character) => {
    info.innerHTML = '';
    const tags = h('div', 'tags');
    for (const t of [c.role, c.style, c.spec]) tags.appendChild(h('span', 'tag', t));
    info.append(tags, h('span', 'q', c.quote));
  };

  const refresh = () => {
    turnLbl.textContent = mode === '1p' && turn === 2 ? 'Adversaire' : turn === 1 ? 'Joueur 1' : 'Joueur 2';
    turnLbl.className = `turn ${turn === 1 ? 'p1' : 'p2'}`;
    for (const id of ROSTER_IDS) {
      const el = cardEls[id];
      el.classList.toggle('p1sel', p1 === id);
      el.classList.toggle('p2sel', p2 === id);
      el.classList.toggle('sel', (turn === 1 ? p1 : p2) === id);
    }
  };

  for (const id of ROSTER_IDS) {
    const c = ROSTER[id];
    const card = h('button', 'card');
    card.innerHTML =
      `<img src="${portrait(id)}" alt="${c.name}" />` +
      `<div class="veil"></div>` +
      `<div class="nm">${c.name}</div>` +
      `<div class="rl">${c.role}</div>` +
      `<div class="glowline" style="background:${c.color}"></div>`;
    card.addEventListener('pointerenter', () => showInfo(c));
    clickable(card, () => {
      showInfo(c);
      if (turn === 1) { p1 = id; turn = 2; refresh(); }
      else {
        p2 = id;
        refresh();
        setTimeout(() => onDone(p1!, p2!), 180);
      }
    });
    cardEls[id] = card;
    cards.appendChild(card);
  }
  s.append(cards, info);

  const row = h('div', 'row');
  if (mode === '1p') {
    row.appendChild(clickable(h('button', 'chip', 'Adversaire aléatoire'), () => {
      if (!p1) { p1 = ROSTER_IDS[Math.floor(Math.random() * 4)]; }
      p2 = ROSTER_IDS[Math.floor(Math.random() * 4)];
      refresh();
      setTimeout(() => onDone(p1!, p2!), 160);
    }));
  }
  row.appendChild(clickable(h('button', 'chip', '← Retour'), onBack));
  s.appendChild(row);
  showInfo(ROSTER[ROSTER_IDS[0]]);
  refresh();
}

// ============================================================ Écran VS =====
export function vsScreen(a: CharId, b: CharId, done: () => void): void {
  clearScreens();
  const s = h('div', 'screen');
  s.style.pointerEvents = 'none';
  const vs = h('div', 'vs');
  const l = h('div', 'fighter l'); l.innerHTML = `<img src="${portrait(a)}" alt="" />`;
  const r = h('div', 'fighter r'); r.innerHTML = `<img src="${portrait(b)}" alt="" />`;
  const w = h('div', 'word', 'VS');
  vs.append(l, r, w);
  s.appendChild(vs);
  screens.appendChild(s);
  Sfx.tone(180, 0.5, 'sawtooth', 0.22, 60);
  setTimeout(done, 1250);
}

// ============================================================== Pause ======
export function pauseScreen(onResume: () => void, onHelp: () => void, onQuit: () => void): void {
  clearScreens();
  const o = h('div', 'overlay');
  o.appendChild(h('div', 'title-xl', 'PAUSE'));
  const menu = h('div', 'menu');
  menu.appendChild(clickable(h('button', 'mbtn primary', '<span>Reprendre</span><span class="arrow">▶</span>'), onResume));
  menu.appendChild(clickable(h('button', 'mbtn', '<span>Coups spéciaux</span><span class="arrow">?</span>'), onHelp));
  menu.appendChild(clickable(h('button', 'mbtn', '<span>Quitter le combat</span><span class="arrow">✕</span>'), onQuit));
  o.appendChild(menu);
  screens.appendChild(o);
}

// ============================================================ Résultat =====
export function resultScreen(
  winner: CharId, loser: CharId, info: { rounds: string; combo: number; time: string },
  onRematch: () => void, onSelect: () => void, onMenu: () => void,
): void {
  clearScreens();
  const o = h('div', 'overlay split');
  const colA = h('div', 'col');
  const colB = h('div', 'col');
  o.append(colA, colB);
  const hero = h('div', 'result-hero');
  hero.innerHTML =
    `<img src="${portrait(winner)}" alt="" />` +
    `<div class="result-txt">` +
    `<div class="big" style="color:${ROSTER[winner].color}">${ROSTER[winner].name}</div>` +
    `<div class="big">L’EMPORTE</div>` +
    `<div class="sub">contre ${ROSTER[loser].name}</div>` +
    `<div class="stats">` +
    `<div>Manches<b>${info.rounds}</b></div>` +
    `<div>Meilleur combo<b>${info.combo}</b></div>` +
    `<div>Durée<b>${info.time}</b></div>` +
    `</div></div>`;
  colA.appendChild(hero);
  const menu = h('div', 'menu');
  menu.appendChild(clickable(h('button', 'mbtn primary', '<span>Revanche</span><span class="arrow">↻</span>'), onRematch));
  menu.appendChild(clickable(h('button', 'mbtn', '<span>Changer de personnage</span><span class="arrow">▶</span>'), onSelect));
  menu.appendChild(clickable(h('button', 'mbtn', '<span>Menu principal</span><span class="arrow">⌂</span>'), onMenu));
  colB.appendChild(menu);
  screens.appendChild(o);
}

// ================================================================ Aide =====
export function helpScreen(onClose: () => void, who: CharId = 'mika'): void {
  clearScreens();
  const o = h('div', 'overlay');
  const sheet = h('div', 'sheet');
  const c = ROSTER[who];
  const rows: [string, string, string][] = [
    ['ATK', 'Enchaînement', 'Appuie 3 fois : direct · crochet · coup retourné'],
    ['↓ + ATK', 'Uppercut', 'Projette l’adversaire en l’air'],
    ['↑ + ATK', 'Coup lourd', 'Lent mais très puissant'],
    ['SP', c.specials.neutral.name, 'Projectile à distance'],
    ['→ + SP', c.specials.forward.name, 'Charge rapide, invincible au départ'],
    ['↑ + SP', c.specials.up.name, 'Anti-aérien · 25% de jauge'],
    ['← + SP', c.specials.back.name, 'Barrière défensive · 20% de jauge'],
    ['ULT', c.ult.name, 'Super attaque · jauge pleine (100%)'],
    ['←', 'Garde', 'Recule pour bloquer les coups'],
    ['↑', 'Saut', 'ATK en l’air pour frapper de haut'],
  ];
  sheet.appendChild(h('h3', '', `Coups — ${c.name}`));
  sheet.appendChild(h('p', '', 'Les directions sont relatives à l’adversaire. Clavier : A/D ou ←/→, W saut, S accroupi, J attaque, K spécial, L ultime.'));
  for (const [k, n, d] of rows) {
    const mv = h('div', 'mv');
    mv.innerHTML = `<kbd>${k}</kbd><div class="d"><b>${n}</b><i>${d}</i></div>`;
    sheet.appendChild(mv);
  }
  const row = h('div', 'row');
  for (const id of ROSTER_IDS) {
    const chip = h('button', `chip${id === who ? ' on' : ''}`, ROSTER[id].name);
    clickable(chip, () => helpScreen(onClose, id));
    row.appendChild(chip);
  }
  sheet.appendChild(row);
  o.appendChild(sheet);
  o.appendChild(clickable(h('button', 'chip', 'Fermer'), onClose));
  screens.appendChild(o);
}

// ================================================================= HUD =====
export class Hud {
  root = $('hud');
  private els = {
    face: [$<HTMLImageElement>('face0'), $<HTMLImageElement>('face1')],
    name: [$('name0'), $('name1')],
    role: [$('role0'), $('role1')],
    hp: [$('hp0'), $('hp1')],
    lag: [$('lag0'), $('lag1')],
    mt: [$('mt0'), $('mt1')],
    pips: [$('pips0'), $('pips1')],
    combo: [$('combo0'), $('combo1')],
    timer: $('timer'),
    roundlbl: $('roundlbl'),
    banner: $('banner'),
  };
  private lastBanner = '';
  private lastCombo: [number, number] = [0, 0];

  show(on: boolean): void { this.root.classList.toggle('hidden', !on); }

  setup(a: CharId, b: CharId): void {
    [a, b].forEach((id, i) => {
      const c = ROSTER[id];
      this.els.face[i].src = facePic(id);
      this.els.name[i].textContent = c.name;
      this.els.role[i].textContent = c.role;
      this.els.name[i].style.color = c.color;
      this.els.face[i].style.borderColor = c.color;
      this.els.pips[i].innerHTML = '<s></s><s></s>';
    });
    this.lastBanner = '';
  }

  update(s: HudState, round: number): void {
    for (let i = 0; i < 2; i++) {
      const pct = (s.hp[i] / s.hpMax[i]) * 100;
      this.els.hp[i].style.width = `${pct}%`;
      this.els.hp[i].classList.toggle('low', pct < 30);
      this.els.lag[i].style.width = `${pct}%`;
      this.els.mt[i].style.width = `${s.meter[i]}%`;
      (this.els.mt[i].parentElement as HTMLElement).classList.toggle('full', s.meter[i] >= 100);
      const pips = this.els.pips[i].children;
      for (let k = 0; k < pips.length; k++) pips[k].classList.toggle('on', k < s.rounds[i]);

      const c = s.combo[i];
      if (c !== this.lastCombo[i]) {
        this.lastCombo[i] = c;
        const el = this.els.combo[i];
        if (c >= 2) {
          el.innerHTML = `<b>${c}</b><span>COMBO</span>`;
          el.classList.remove('show');
          void el.offsetWidth;
          el.classList.add('show');
        } else el.classList.remove('show');
      }
    }
    this.els.timer.textContent = String(s.time);
    this.els.timer.classList.toggle('urgent', s.time <= 10);
    this.els.roundlbl.textContent = `MANCHE ${round}`;

    if (s.banner !== this.lastBanner) {
      this.lastBanner = s.banner;
      const b = this.els.banner;
      if (s.banner) {
        b.textContent = s.banner;
        b.style.color = s.bannerColor;
        b.classList.remove('show');
        void b.offsetWidth;
        b.classList.add('show');
      } else b.classList.remove('show');
    }
  }
}

// ==================================================== Contrôles tactiles ===
export interface TouchCtl { setUlt(ready: boolean, pct: number): void; destroy(): void }

export function buildControls(mode: Mode, pads: [Pad, Pad]): TouchCtl {
  const L = $('ctlL'), R = $('ctlR');
  L.innerHTML = ''; R.innerHTML = '';
  const two = mode === '2p';
  L.classList.toggle('two', two); R.classList.toggle('two', two);
  const cleanup: (() => void)[] = [];
  const ultBtns: HTMLElement[] = [];
  const ultLabels: HTMLElement[] = [];

  const makeStick = (host: HTMLElement, pad: Pad, p2 = false) => {
    const st = h('div', `stick${p2 ? ' p2' : ''}`);
    const knob = h('i');
    st.appendChild(knob);
    host.appendChild(st);
    let pid = -1;
    const set = (dx: number, dy: number) => {
      const r = st.clientWidth / 2;
      const m = Math.hypot(dx, dy);
      const lim = Math.min(1, m / (r * 0.72));
      const nx = m ? (dx / m) * lim : 0, ny = m ? (dy / m) * lim : 0;
      knob.style.transform = `translate(calc(-50% + ${nx * r * 0.52}px), calc(-50% + ${ny * r * 0.52}px))`;
      const wasUp = pad.up;
      pad.left = nx < -0.34; pad.right = nx > 0.34;
      pad.up = ny < -0.45; pad.down = ny > 0.45;
      if (pad.up && !wasUp) pad.upEdge = true;
    };
    const reset = () => {
      knob.style.transform = 'translate(-50%, -50%)';
      pad.left = pad.right = pad.up = pad.down = false;
    };
    const down = (e: PointerEvent) => {
      if (pid >= 0) return;
      pid = e.pointerId; st.setPointerCapture(pid);
      const r = st.getBoundingClientRect();
      set(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      const r = st.getBoundingClientRect();
      set(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    };
    const up = (e: PointerEvent) => { if (e.pointerId !== pid) return; pid = -1; reset(); };
    st.addEventListener('pointerdown', down);
    st.addEventListener('pointermove', move);
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);
    cleanup.push(() => { st.removeEventListener('pointerdown', down); });
  };

  const makeBtn = (host: HTMLElement, cls: string, label: string, pad: Pad, key: 'atk' | 'sp' | 'ult') => {
    const b = h('button', `btn ${cls}`, `<span>${label}</span>${key === 'ult' ? '<em>0%</em>' : ''}`);
    host.appendChild(b);
    if (key === 'ult') { ultBtns.push(b); ultLabels.push(b.querySelector('em') as HTMLElement); }
    const down = (e: PointerEvent) => {
      e.preventDefault();
      b.classList.add('down');
      pad[key] = true;
      if (key === 'atk') pad.atkEdge = true;
      else if (key === 'sp') pad.spEdge = true;
      else pad.ultEdge = true;
    };
    const up = () => { b.classList.remove('down'); pad[key] = false; };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('pointercancel', up);
    cleanup.push(() => b.removeEventListener('pointerdown', down));
    return b;
  };

  if (two) {
    makeStick(L, pads[0]);
    const bl = h('div', 'btns'); L.appendChild(bl);
    makeBtn(bl, 'ult', 'U', pads[0], 'ult');
    makeBtn(bl, 'sp', 'SP', pads[0], 'sp');
    makeBtn(bl, 'atk', 'ATK', pads[0], 'atk');
    makeStick(R, pads[1], true);
    const br = h('div', 'btns'); R.appendChild(br);
    makeBtn(br, 'ult', 'U', pads[1], 'ult');
    makeBtn(br, 'sp', 'SP', pads[1], 'sp');
    makeBtn(br, 'atk', 'ATK', pads[1], 'atk');
  } else {
    makeStick(L, pads[0]);
    const br = h('div', 'btns'); R.appendChild(br);
    makeBtn(br, 'ult', 'ULT', pads[0], 'ult');
    makeBtn(br, 'sp', 'SP', pads[0], 'sp');
    makeBtn(br, 'atk', 'ATK', pads[0], 'atk');
  }

  return {
    setUlt(ready: boolean, pct: number): void {
      for (const b of ultBtns) b.classList.toggle('ready', ready);
      for (const l of ultLabels) l.textContent = `${Math.round(pct)}%`;
    },
    destroy(): void { cleanup.forEach((f) => f()); L.innerHTML = ''; R.innerHTML = ''; },
  };
}
