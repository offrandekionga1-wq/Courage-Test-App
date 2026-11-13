import { useEffect, useMemo, useState } from 'react';
import type { Lesson, QuizItem, Word } from './types';
import { term } from './terms';
import type { T } from './i18n';

/** Leçons de vocabulaire produites par scripts/build-lessons.py : seuls les mots (graphies) sont stockés. */
interface RawLesson { id: string; t: string; k: number; level: string; words: string[] }
interface LessonFile { v: 2; lessons: RawLesson[] }

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

/** Quiz de la leçon : retrouver le sens d'un mot parmi les définitions des autres mots. */
export function makeQuiz(items: { term: string; gloss: string }[], t: T, pick = 6): QuizItem[] {
  if (items.length < 4) return [];
  const quiz: QuizItem[] = [];
  const step = Math.max(1, Math.floor(items.length / pick));
  for (let n = 0; n < Math.min(pick * step, items.length); n += step) {
    const { term: w, gloss } = items[n];
    const others = items.filter((x, i) => i !== n && x.gloss !== gloss).map((x) => x.gloss);
    if (others.length < 3) break;
    const picks = [0, 1, 2].map((k) => others[(n * 5 + k * 7) % others.length]);
    if (new Set([...picks, gloss]).size < 4) continue;
    quiz.push({ q: t('quiz.meaning', { term: w }), choices: [picks[0], gloss, picks[1], picks[2]], answer: 1 });
  }
  return quiz;
}

/** Les leçons de vocabulaire, remplies avec les mots du dictionnaire déjà chargé. */
export function useVocabLessons(code: string, words: Word[], locale: string, t: T): Lesson[] | undefined {
  const [raw, setRaw] = useState<{ code: string; lessons: RawLesson[] }>();
  useEffect(() => {
    let live = true;
    loadLessons(code).then((lessons) => live && setRaw({ code, lessons }));
    return () => { live = false; };
  }, [code]);
  return useMemo(() => {
    if (raw?.code !== code) return undefined;
    if (!words.length) return [];
    const byTerm = new Map<string, Word>();
    for (const w of words) if (!byTerm.has(w.term)) byTerm.set(w.term, w);
    const out: Lesson[] = [];
    for (const l of raw.lessons) {
      const picked = l.words.map((x) => byTerm.get(x)).filter((w): w is Word => !!w);
      if (picked.length < 6) continue;   // le dictionnaire de cette langue d'explication n'a pas ces mots
      const theme = term(l.t, locale);
      out.push({
        id: l.id,
        kind: 'vocab',
        title: l.k ? `${theme} (${l.k})` : theme,
        level: l.level,
        intro: `${term(`intro.${l.level}`, locale)} ${t('lessons.theme')} : ${theme.toLowerCase()}.`,
        sections: [],
        phrases: picked
          .filter((w) => w.example)
          .slice(0, 12)
          .map((w) => ({ text: w.example!, fr: w.exampleFr ?? '', reading: w.exampleReading, en: w.exampleEn })),
        quiz: makeQuiz(picked.map((w) => ({ term: w.term, gloss: w.fr })), t),
        words: picked,
      });
    }
    return out;
  }, [raw, code, words, locale, t]);
}
