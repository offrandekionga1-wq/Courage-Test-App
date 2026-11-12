import { useEffect, useState } from 'react';
import type { Verb, Word } from './types';

/** Exemple attaché à un mot : texte, traduction, lecture annotée, 1 si la traduction est anglaise. */
type RawExample = [text: string, fr: string, reading: string, english: 0 | 1];
/** Mot : terme, lecture, définition, « en » si la définition est anglaise, exemple éventuel. */
export type DictWord = [term: string, reading: string, gloss: string, flag: string, example?: RawExample];
interface RawVerb {
  id: string; infinitive: string; fr: string; note: string;
  tenses: { name: string; forms: { label: string; form: string }[] }[];
  /** 1 quand la définition vient d'une source anglaise. */
  en?: number;
}
export interface DictFile { v: 2; w: DictWord[]; vb?: RawVerb[] }
export interface Dict {
  words: Word[];
  verbs: Verb[];
  /** Identifiants des mots et verbes dont la définition est en anglais. */
  enGloss: Set<string>;
}

// Un fichier par langue, chargé à la demande : Vite en fait un fragment séparé, embarqué dans
// l'appli. Les phrases vivent dans un fichier à part (voir sentences.ts) : l'écran du vocabulaire
// n'a pas à charger plusieurs mégaoctets d'exemples dont il n'a pas besoin.
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
        if (r[3] === 'en') enGloss.add(id);
        const ex = r[4];
        const band = Math.floor(i / 500) * 500;
        return {
          id, term: r[0], reading: r[1] || undefined, fr: r[2],
          theme: `${band + 1}–${band + 500}`,
          example: ex?.[0], exampleFr: ex?.[1],
          exampleReading: ex?.[2] || undefined, exampleEn: ex?.[3] === 1,
        };
      });
      const verbs: Verb[] = (d.vb ?? []).map((v) => {
        if (v.en) enGloss.add(v.id);
        return {
          id: v.id, infinitive: v.infinitive, fr: v.fr, note: v.note || undefined,
          tenses: v.tenses.map((t) => ({ name: t.name, forms: t.forms.map((f) => ({ label: f.label, form: f.form })) })),
        };
      });
      return { words, verbs, enGloss };
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
