import { useEffect, useState } from 'react';
import type { Word } from './types';

/** Phrase d'exemple Tatoeba : texte, traduction française, numéro, lecture, auteurs (indices dans `a`). */
export type DictSentence = [text: string, fr: string, id: number, reading: string, author: number, authorFr: number];
/** Mot du dictionnaire : terme, lecture, glose, phrase d'exemple (indice ou -1), drapeau « en » si la glose est anglaise. */
export type DictWord = [term: string, reading: string, gloss: string, example: number, flag?: 'en'];
export interface DictFile { v: 1; w: DictWord[]; s: DictSentence[]; a: string[] }
export interface Dict { words: Word[]; sentences: DictSentence[]; authors: string[]; enGloss: Set<string> }

// Un fichier JSON par langue, chargé à la demande (Vite en fait un fragment séparé, embarqué dans l'appli : pas de réseau requis).
const files = import.meta.glob<DictFile>('./dict/[a-z][a-z].json', { import: 'default' });
const cache = new Map<string, Promise<Dict | null>>();

export const hasDict = (code: string) => `./dict/${code}.json` in files;

export function loadDict(code: string): Promise<Dict | null> {
  const loader = files[`./dict/${code}.json`];
  if (!loader) return Promise.resolve(null);
  let p = cache.get(code);
  if (!p) {
    p = loader().then((d) => {
      const enGloss = new Set<string>();
      const seen = new Set<string>();
      const words: Word[] = d.w.map((r, i) => {
        let id = `${code}:d:${r[0]}`;
        if (seen.has(id)) id += `#${i}`;
        seen.add(id);
        if (r[4] === 'en') enGloss.add(id);
        const ex = r[3] >= 0 ? d.s[r[3]] : undefined;
        return {
          id, term: r[0], reading: r[1] || undefined, fr: r[4] === 'en' ? `${r[2]} [EN]` : r[2],
          theme: `Fréquents ${Math.floor(i / 500) * 500 + 1}–${Math.floor(i / 500) * 500 + 500}`,
          example: ex?.[0], exampleFr: ex?.[1],
        };
      });
      return { words, sentences: d.s, authors: d.a, enGloss };
    }).catch(() => null);
    cache.set(code, p);
  }
  return p;
}

/** Dictionnaire de la langue, `undefined` pendant le chargement, `null` s'il n'existe pas. */
export function useDict(code: string): Dict | null | undefined {
  const [d, setD] = useState<{ code: string; dict: Dict | null } | undefined>();
  useEffect(() => {
    let live = true;
    loadDict(code).then((dict) => live && setD({ code, dict }));
    return () => { live = false; };
  }, [code]);
  return d?.code === code ? d.dict : undefined;
}
