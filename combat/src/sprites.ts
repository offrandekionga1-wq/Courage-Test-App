// ---------------------------------------------------------------------------
// Neon Clash — atlas de sprites découpés dans les fiches de personnage.
// (outils/cut_sprites.py produit <id>-sprites.webp et <id>-sprites.json)
// ---------------------------------------------------------------------------
import type { CharId } from './art';

export interface Frame { name: string; x: number; y: number; w: number; h: number; ax: number; ay: number }

export interface CharSprites {
  img: HTMLImageElement;
  ref: number;                       // hauteur de référence (pose debout)
  gs: Record<string, number>;        // correction d'échelle par rangée de la fiche
  frames: Frame[];
  groups: Record<string, Frame[]>;   // idle, move, jump, fall, atk
}

const store: Partial<Record<CharId, CharSprites>> = {};

const groupOf = (name: string) => name.replace(/\d+$/, '');

async function loadOne(id: CharId): Promise<CharSprites> {
  const [meta, img] = await Promise.all([
    fetch(`art/${id}-sprites.json`).then((r) => r.json() as Promise<{ ref: number; gs: Record<string, number>; frames: Frame[] }>),
    new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`sprite ${id}`));
      i.src = `art/${id}-sprites.webp`;
    }),
  ]);
  const groups: Record<string, Frame[]> = {};
  for (const f of meta.frames) (groups[groupOf(f.name)] ||= []).push(f);
  const s: CharSprites = { img, ref: meta.ref, gs: meta.gs ?? {}, frames: meta.frames, groups };
  store[id] = s;
  return s;
}

export function loadSprites(ids: CharId[]): Promise<CharSprites[]> {
  return Promise.all(ids.map((id) => store[id] ?? loadOne(id)));
}

export const spritesOf = (id: CharId): CharSprites | undefined => store[id];

export const groupName = (name: string) => groupOf(name);

/** Échelle propre à la rangée d'où vient l'image. */
export const frameScale = (s: CharSprites, f: Frame) => s.gs[groupOf(f.name)] ?? 1;

/** Résout « atk3 » : groupe + index borné au nombre réel d'images. */
export function frameOf(s: CharSprites, key: string): Frame {
  const g = groupOf(key);
  const list = s.groups[g] ?? s.groups.idle ?? s.frames;
  const n = parseInt(key.slice(g.length), 10);
  const i = Number.isFinite(n) ? Math.min(Math.max(0, n), list.length - 1) : 0;
  return list[i] ?? s.frames[0];
}

/** Image d'un cycle (idle, marche…) au temps t. */
export function cycle(s: CharSprites, group: string, t: number, fps: number, pingPong = false): Frame {
  const list = s.groups[group] ?? s.groups.idle ?? s.frames;
  if (list.length === 0) return s.frames[0];
  const n = list.length;
  let i = Math.floor(t * fps);
  if (pingPong && n > 2) {
    const period = n * 2 - 2;
    i = ((i % period) + period) % period;
    if (i >= n) i = period - i;
  } else {
    i = ((i % n) + n) % n;
  }
  return list[i];
}
