import { useEffect, useMemo, useState } from 'react';
import type { Lesson, QuizItem } from './types';
import { resolveFile } from './explain';
import { term } from './terms';
import type { T } from './i18n';

/** Format des fichiers produits par scripts/build-courses.py (guides Wikivoyage). */
interface RawPhrase { t: string; f: string; r?: string; en?: number }
interface RawLesson {
  id: string; title: string; level: string; kind?: string;
  intro: string;
  sections: { heading: string; body: string }[];
  phrases: RawPhrase[];
}
interface CourseFile { v: 2; lessons: RawLesson[]; source: string }

const files = import.meta.glob<CourseFile>('./dict/[a-z][a-z]-course-[a-z][a-z].json', { import: 'default' });
// Leçons de grammaire tirées des Wikilivres français : même forme, sans phrases ni quiz.
const grammarFiles = import.meta.glob<{ lessons: (RawLesson & { source?: string })[] }>('./dict/[a-z][a-z]-grammar.json', { import: 'default' });
const cache = new Map<string, Promise<{ explain: string; lessons: RawLesson[] } | null>>();

export const hasCourse = (code: string) => Object.keys(files).some((k) => k.startsWith(`./dict/${code}-`));

function loadRaw(code: string, locale: string) {
  const found = resolveFile(files, code, locale, (c, x) => `./dict/${c}-course-${x}.json`);
  if (!found) return Promise.resolve(null);
  const [explain, key] = found;
  const ck = `${code}|${explain}`;
  let p = cache.get(ck);
  if (!p) {
    p = files[key]().then((d) => ({ explain, lessons: d.lessons })).catch(() => null);
    cache.set(ck, p);
  }
  return p;
}

const CEFR: Record<string, string> = { '@beginner': 'A1', '@elementary': 'A2', '@intermediate': 'B1' };

/** Quiz « Comment dit-on… ? » : la bonne phrase et trois autres de la même leçon. */
function phraseQuiz(phrases: RawPhrase[], t: T, n = 4): QuizItem[] {
  const pool = phrases.filter((p) => p.t.length > 3 && p.t.length < 40);
  const quiz: QuizItem[] = [];
  if (pool.length < 4) return quiz;
  const step = Math.max(1, Math.floor(pool.length / n));
  for (let i = 0; i < Math.min(n * step, pool.length); i += step) {
    const good = pool[i];
    const others = pool.filter((p, j) => j !== i && p.t !== good.t);
    if (others.length < 3) break;
    const picks = [0, 1, 2].map((k) => others[(i * 7 + k * 3) % others.length]);
    if (new Set([...picks.map((p) => p.t), good.t]).size < 4) continue;
    quiz.push({ q: t('quiz.say', { text: good.f }), choices: [picks[0].t, good.t, picks[1].t, picks[2].t], answer: 1 });
  }
  return quiz;
}

/** Leçons du guide de conversation, dans la langue de l'apprenant (ou en repli), `undefined` pendant le chargement. */
export function useCourse(code: string, locale: string, t: T): Lesson[] | undefined {
  const [state, setState] = useState<{ key: string; data: { explain: string; lessons: RawLesson[] } | null }>();
  const key = `${code}|${locale}`;
  useEffect(() => {
    let live = true;
    loadRaw(code, locale).then((data) => live && setState({ key, data }));
    return () => { live = false; };
  }, [code, locale, key]);
  return useMemo(() => {
    if (state?.key !== key) return undefined;
    if (!state.data) return [];
    const { explain, lessons } = state.data;
    return lessons.map((l): Lesson => ({
      id: `${l.id}`,
      kind: l.kind === 'grammar' ? 'grammar' : 'course',
      title: term(l.title, locale),
      level: term(l.level, locale),
      cefr: CEFR[l.level] ?? 'A2',
      intro: term(l.intro, locale),
      sections: l.sections.map((s) => ({ heading: term(s.heading, locale), body: s.body })),
      phrases: l.phrases.map((ph) => ({ text: ph.t, reading: ph.r || undefined, fr: ph.f, en: !!ph.en })),
      quiz: phraseQuiz(l.phrases, t),
      explain: explain === locale ? undefined : explain,
    }));
  }, [state, key, locale, t]);
}

/** Leçons de grammaire des Wikilivres : elles n'existent qu'en français. */
export function useWikibooks(code: string, locale: string): Lesson[] | undefined {
  const [state, setState] = useState<{ code: string; lessons: Lesson[] }>();
  useEffect(() => {
    let live = true;
    const loader = locale === 'fr' ? grammarFiles[`./dict/${code}-grammar.json`] : undefined;
    if (!loader) { setState({ code: code + locale, lessons: [] }); return; }
    loader().then((d) => live && setState({
      code: code + locale,
      lessons: d.lessons.map((l): Lesson => ({
        id: l.id, kind: 'grammar', title: l.title, level: l.level, intro: l.intro,
        sections: l.sections, phrases: [], quiz: [], source: l.source,
      })),
    })).catch(() => live && setState({ code: code + locale, lessons: [] }));
    return () => { live = false; };
  }, [code, locale]);
  return state?.code === code + locale ? state.lessons : undefined;
}
