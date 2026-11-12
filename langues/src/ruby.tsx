import type { ReactNode } from 'react';

/** Un morceau de texte, avec sa lecture quand il s'agit de kanji. */
type Segment = [text: string, reading: string];

const TOKEN = /\[([^\]|]+)((?:\|[^\]|]*)+)\]/g;

/**
 * Découpe une transcription Tatoeba en segments.
 *
 * Le format note la lecture des kanji entre crochets : « [場所|ば|しょ]とか » signifie que 場 se lit
 * « ば » et 所 « しょ ». Quand il y a autant de lectures que de caractères, chacune va avec le sien ;
 * sinon la lecture porte sur tout le groupe.
 */
export function parseFurigana(annotated: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of annotated.matchAll(TOKEN)) {
    if (m.index > last) out.push([annotated.slice(last, m.index), '']);
    const body = m[1];
    const readings = m[2].slice(1).split('|');
    if (readings.length === body.length) {
      body.split('').forEach((ch, i) => out.push([ch, readings[i]]));
    } else {
      out.push([body, readings.join('')]);
    }
    last = m.index + m[0].length;
  }
  if (last < annotated.length) out.push([annotated.slice(last), '']);
  return out;
}

export const hasFurigana = (s?: string) => !!s && s.includes('[') && s.includes('|');

/** La lecture n'apporte rien quand elle redit le texte (phrase sans kanji). */
export const readingWorthShowing = (text: string, reading?: string) =>
  !!reading && !hasFurigana(reading) && reading !== text;

/** Texte japonais avec les furigana au-dessus des kanji. */
export function Ruby({ annotated, className }: { annotated: string; className?: string }) {
  const segments = parseFurigana(annotated);
  return (
    <span className={className}>
      {segments.map(([text, reading], i): ReactNode =>
        reading
          ? <ruby key={i}>{text}<rt>{reading}</rt></ruby>
          : <span key={i}>{text}</span>)}
    </span>
  );
}

/** Le texte sans les annotations, pour la synthèse vocale et la recherche. */
export const plainText = (annotated: string) => annotated.replace(TOKEN, (_m, body) => body);
