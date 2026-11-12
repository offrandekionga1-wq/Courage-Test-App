import { useEffect, useState } from 'react';
import type { Lesson, Word } from './types';

/** Leçons de vocabulaire produites par scripts/build-lessons.py : seuls les indices sont stockés. */
interface RawLesson {
  id: string; title: string; level: string; intro: string;
  words: number[];
  quiz: { q: string; choices: string[]; answer: number }[];
}
interface LessonFile { v: 1; lessons: RawLesson[] }

const files = import.meta.glob<LessonFile>('./dict/[a-z][a-z]-lessons.json', { import: 'default' });
const cache = new Map<string, Promise<RawLesson[]>>();

export const hasLessons = (code: string) => `./dict/${code}-lessons.json` in files;

export function loadLessons(code: string): Promise<RawLesson[]> {
  const loader = files[`./dict/${code}-lessons.json`];
  if (!loader) return Promise.resolve([]);
  let p = cache.get(code);
  if (!p) {
    p = loader().then((d) => d.lessons).catch(() => []);
    cache.set(code, p);
  }
  return p;
}

/** Les leçons de vocabulaire, remplies avec les mots du dictionnaire déjà chargé. */
export function useVocabLessons(code: string, words: Word[]): Lesson[] | undefined {
  const [raw, setRaw] = useState<{ code: string; lessons: RawLesson[] }>();
  useEffect(() => {
    let live = true;
    loadLessons(code).then((lessons) => live && setRaw({ code, lessons }));
    return () => { live = false; };
  }, [code]);
  if (raw?.code !== code) return undefined;
  if (!words.length) return [];
  return raw.lessons.map((l): Lesson => {
    const picked = l.words.map((i) => words[i]).filter(Boolean);
    return {
      id: l.id,
      kind: 'vocab',
      title: l.title,
      level: l.level,
      intro: l.intro,
      sections: [],
      phrases: picked
        .filter((w) => w.example)
        .slice(0, 12)
        .map((w) => ({ text: w.example!, fr: w.exampleFr ?? '', reading: w.exampleReading, en: w.exampleEn })),
      quiz: l.quiz,
      words: picked,
    };
  });
}
