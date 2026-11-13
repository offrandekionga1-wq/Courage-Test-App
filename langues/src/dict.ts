import { useEffect, useState } from 'react';
import type { Verb, Word } from './types';
import { resolveFile } from './explain';

/** Exemple attaché à un mot : texte, traduction, lecture annotée, 1 si la traduction est de repli. */
type RawExample = [text: string, tr: string, reading: string, fallback: 0 | 1];
/** Mot : terme, lecture, définition, « en » si la définition est de repli, exemple éventuel. */
export type DictWord = [term: string, reading: string, gloss: string, flag: string, example?: RawExample];
interface RawVerb {
  id: string; infinitive: string; en: string; note: string;
  tenses: { name: string; forms: { label: string; form: string }[] }[];
}
export interface DictFile { v: 3; w: DictWord[] }
interface VerbFile { v: 1; vb: RawVerb[] }
export interface Dict {
  words: Word[];
  verbs: Verb[];
  /** Langue dans laquelle sont rédigées les définitions de ce dictionnaire. */
  explain: string;
  /** Identifiants des mots et verbes dont la définition n'est pas dans la langue de l'apprenant. */
  enGloss: Set<string>;
}

// Un fichier par paire (langue étudiée, langue d'explication), chargé à la demande : Vite en fait
// un fragment séparé, embarqué dans l'appli. Les phrases vivent dans un fichier à part (voir
// sentences.ts), de même que les tableaux de conjugaison, communs à toutes les langues d'explication.
const files = import.meta.glob<DictFile>('./dict/[a-z][a-z]-[a-z][a-z].json', { import: 'default' });
const verbFiles = import.meta.glob<VerbFile>('./dict/[a-z][a-z]-verbs.json', { import: 'default' });
const cache = new Map<string, Promise<Dict | null>>();

const pathOf = (code: string, explain: string) => `./dict/${code}-${explain}.json`;
export const hasDict = (code: string) => Object.keys(files).some((k) => k.startsWith(`./dict/${code}-`));

export function loadDict(code: string, locale: string): Promise<Dict | null> {
  const found = resolveFile(files, code, locale, pathOf);
  if (!found) return Promise.resolve(null);
  const [explain, key] = found;
  const ck = `${code}|${explain}`;
  let p = cache.get(ck);
  if (!p) {
    const vLoader = verbFiles[`./dict/${code}-verbs.json`];
    p = Promise.all([files[key](), vLoader ? vLoader() : Promise.resolve(null)]).then(([d, vf]) => {
      const enGloss = new Set<string>();
      const seen = new Set<string>();
      const byTerm = new Map<string, string>();
      const words: Word[] = d.w.map((r, i) => {
        let id = `${code}:d:${r[0]}`;
        if (seen.has(id)) id += `#${i}`;
        seen.add(id);
        // Une définition anglaise est « de repli » sauf si c'est justement la langue demandée.
        if (r[3] === 'en' && explain !== 'en') enGloss.add(id);
        byTerm.set(r[0].toLowerCase(), r[2]);
        const ex = r[4];
        const band = Math.floor(i / 500) * 500;
        return {
          id, term: r[0], reading: r[1] || undefined, fr: r[2],
          theme: `${band + 1}–${band + 500}`,
          example: ex?.[0], exampleFr: ex?.[1],
          exampleReading: ex?.[2] || undefined, exampleEn: ex?.[3] === 1,
        };
      });
      // Les verbes portent une définition anglaise ; celle du dictionnaire de l'apprenant la remplace.
      const verbs: Verb[] = (vf?.vb ?? []).map((v) => {
        const own = byTerm.get(v.infinitive.toLowerCase());
        if (!own && explain !== 'en') enGloss.add(v.id);
        return {
          id: v.id, infinitive: v.infinitive, fr: own ?? v.en, note: v.note || undefined,
          tenses: v.tenses.map((t) => ({ name: t.name, forms: t.forms.map((f) => ({ label: f.label, form: f.form })) })),
        };
      });
      return { words, verbs, explain, enGloss };
    }).catch(() => null);
    cache.set(ck, p);
  }
  return p;
}

/** Dictionnaire de la langue : `undefined` pendant le chargement, `null` s'il n'existe pas. */
export function useDict(code: string, locale: string): Dict | null | undefined {
  const [d, setD] = useState<{ key: string; dict: Dict | null } | undefined>();
  const key = `${code}|${locale}`;
  useEffect(() => {
    let live = true;
    loadDict(code, locale).then((dict) => live && setD({ key, dict }));
    return () => { live = false; };
  }, [code, locale, key]);
  return d?.key === key ? d.dict : undefined;
}
