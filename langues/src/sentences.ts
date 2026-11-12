import { useEffect, useState } from 'react';

/** Phrase Tatoeba : texte, traduction, numéro, lecture annotée, auteurs, 1 si traduction anglaise. */
export type DictSentence = [
  text: string, fr: string, id: number, reading: string,
  author: number, authorFr: number, english?: 1,
];
interface SentenceFile { v: 2; s: DictSentence[]; a: string[] }
export interface Sentences { sentences: DictSentence[]; authors: string[] }

// Chargé seulement quand on ouvre l'écran « Phrases » ou la page des sources : ce fichier
// contient des dizaines de milliers de phrases et pèse plusieurs mégaoctets.
const files = import.meta.glob<SentenceFile>('./dict/[a-z][a-z]-sentences.json', { import: 'default' });
const cache = new Map<string, Promise<Sentences | null>>();

export const hasSentences = (code: string) => `./dict/${code}-sentences.json` in files;

export function loadSentences(code: string): Promise<Sentences | null> {
  const loader = files[`./dict/${code}-sentences.json`];
  if (!loader) return Promise.resolve(null);
  let p = cache.get(code);
  if (!p) {
    p = loader().then((d) => ({ sentences: d.s, authors: d.a })).catch(() => null);
    cache.set(code, p);
  }
  return p;
}

/** Phrases de la langue : `undefined` pendant le chargement, `null` s'il n'y en a pas. */
export function useSentences(code: string): Sentences | null | undefined {
  const [s, setS] = useState<{ code: string; data: Sentences | null }>();
  useEffect(() => {
    let live = true;
    loadSentences(code).then((data) => live && setS({ code, data }));
    return () => { live = false; };
  }, [code]);
  return s?.code === code ? s.data : undefined;
}
