import { useEffect, useState } from 'react';
import { resolveFile } from './explain';

/** Phrase Tatoeba : texte, traduction, numéro, lecture annotée, auteurs, 1 si la traduction est de repli. */
export type DictSentence = [
  text: string, tr: string, id: number, reading: string,
  author: number, authorTr: number, fallback?: 1,
];
interface SentenceFile { v: 2; s: DictSentence[]; a: string[] }
export interface Sentences { sentences: DictSentence[]; authors: string[]; explain: string }

// Chargé seulement quand on ouvre l'écran « Phrases » ou la page des sources : ce fichier
// contient des milliers de phrases et pèse plusieurs mégaoctets.
const files = import.meta.glob<SentenceFile>('./dict/[a-z][a-z]-[a-z][a-z]-sentences.json', { import: 'default' });
const cache = new Map<string, Promise<Sentences | null>>();
const pathOf = (code: string, explain: string) => `./dict/${code}-${explain}-sentences.json`;

export const hasSentences = (code: string) => Object.keys(files).some((k) => k.startsWith(`./dict/${code}-`));

export function loadSentences(code: string, locale: string): Promise<Sentences | null> {
  const found = resolveFile(files, code, locale, pathOf);
  if (!found) return Promise.resolve(null);
  const [explain, key] = found;
  const ck = `${code}|${explain}`;
  let p = cache.get(ck);
  if (!p) {
    p = files[key]().then((d) => ({ sentences: d.s, authors: d.a, explain })).catch(() => null);
    cache.set(ck, p);
  }
  return p;
}

/** Phrases de la langue : `undefined` pendant le chargement, `null` s'il n'y en a pas. */
export function useSentences(code: string, locale: string): Sentences | null | undefined {
  const [s, setS] = useState<{ key: string; data: Sentences | null }>();
  const key = `${code}|${locale}`;
  useEffect(() => {
    let live = true;
    loadSentences(code, locale).then((data) => live && setS({ key, data }));
    return () => { live = false; };
  }, [code, locale, key]);
  return s?.key === key ? s.data : undefined;
}
