// ---------------------------------------------------------------------------
// Neon Clash — identité graphique des combattants.
// Les poses viennent des fiches de personnage (voir tools/cut_sprites.py) ;
// ce module ne garde que les couleurs et l'ombre portée.
// ---------------------------------------------------------------------------
import { clamp } from './core';

export type CharId = 'mika' | 'ray' | 'zen' | 'kira';

export interface Palette {
  accent: string; accent2: string; glow: string;
}

export const PALETTES: Record<CharId, Palette> = {
  mika: { accent: '#ffc820', accent2: '#ffe987', glow: 'rgba(255,200,32,0.95)' },
  ray: { accent: '#3ba7ff', accent2: '#9ddcff', glow: 'rgba(59,167,255,0.95)' },
  zen: { accent: '#a35cff', accent2: '#d7b2ff', glow: 'rgba(163,92,255,0.95)' },
  kira: { accent: '#ff3450', accent2: '#ff8f9e', glow: 'rgba(255,52,80,0.95)' },
};

/** Ombre portée au sol, resserrée quand le combattant s'élève. */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, groundY: number, height: number, scale: number): void {
  const k = clamp(1 - height / 260, 0.25, 1);
  ctx.save();
  ctx.globalAlpha = 0.45 * k;
  ctx.fillStyle = '#05040a';
  ctx.beginPath();
  ctx.ellipse(x, groundY + 2, 38 * scale * k, 9 * scale * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
