import { useEffect, useState } from 'react';
import type { Verb, Word } from './types';

/** Phrase d'exemple Tatoeba : texte, traduction, numéro, lecture, auteurs (indices dans `authors`). */
export type DictSentence = [text: string, fr: string, id: number, reading: string, author: number, authorFr: number];
/** Mot : terme, lecture, glose, indice de la phrase d'exemple (ou -1), « en » si la glose est anglaise. */
export type DictWord = [term: string, reading: string, gloss: string, example: number, flag?: 'en'];
interface RawVerb {
  id: string; infinitive: string; fr: string; note: string;
  tenses: { name: string; forms: { label: string; form: string }[] }[];
  /** 1 quand la définition vient d'une source anglaise. */
  en?: number;
}
export interface DictFile { v: 1; w: DictWord[]; s: DictSentence[]; a: string[]; vb?: RawVerb[] }
export interface Dict {
  words: Word[];
  sentences: DictSentence[];
  authors: string[];
  verbs: Verb[];
  /** Identifiants des mots et verbes dont la définition est en anglais. */
  enGloss: Set<string>;
}

// Un fichier par langue, chargé à la demande : Vite en fait un fragment séparé, embarqué dans
// l'appli. Rien n'est téléchargé au moment de l'usage.
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
        const band = Math.floor(i / 500) * 500;
        return {
          id, term: r[0], reading: r[1] || undefined, fr: r[2],
          theme: `${band + 1}–${band + 500}`,
          example: ex?.[0], exampleFr: ex?.[1], exampleReading: ex?.[3] || undefined,
        };
      });
      const verbs: Verb[] = (d.vb ?? []).map((v) => {
        if (v.en) enGloss.add(v.id);
        return {
          id: v.id, infinitive: v.infinitive, fr: v.fr, note: v.note || undefined,
          tenses: v.tenses.map((t) => ({ name: t.name, forms: t.forms.map((f) => ({ label: f.label, form: f.form })) })),
        };
      });
      return { words, sentences: d.s, authors: d.a, verbs, enGloss };
    }).catch(() => null);
    cache.set(code, p);
  }
  return p;
}

/** Dictionnaire de la langue : `undefined` pendant le chargement, `null` s'il n'existe pas. */
export function useDict(code: string): Dict | null | undefined {
  const [d, setD] = useState<{ code: string; dict: Dict | null } | undefined>();
  useEffect(() => {
    let live = true;
    loadDict(code).then((dict) => live && setD({ code, dict }));
    return () => { live = false; };
  }, [code]);
  return d?.code === code ? d.dict : undefined;
}
