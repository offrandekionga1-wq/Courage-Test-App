import { useEffect, useState } from 'react';
import type { Lesson } from './types';

/** Format des fichiers produits par scripts/build-courses.py (guides Wikivoyage). */
interface RawPhrase { t: string; f: string; r?: string; en?: number }
interface RawLesson {
  id: string; title: string; level: string; kind?: string;
  intro: string;
  sections: { heading: string; body: string }[];
  phrases: RawPhrase[];
  quiz: { q: string; choices: string[]; answer: number }[];
}
interface CourseFile { v: 1; lessons: RawLesson[]; source: string }

const files = import.meta.glob<CourseFile>('./dict/[a-z][a-z]-course.json', { import: 'default' });
const cache = new Map<string, Promise<Lesson[]>>();

export const hasCourse = (code: string) => `./dict/${code}-course.json` in files;

/** Leçons tirées du guide de conversation libre, chargées à la demande. */
export function loadCourse(code: string): Promise<Lesson[]> {
  const loader = files[`./dict/${code}-course.json`];
  if (!loader) return Promise.resolve([]);
  let p = cache.get(code);
  if (!p) {
    p = loader()
      .then((d) =>
        d.lessons.map((l): Lesson => ({
          id: l.id,
          kind: 'course',
          title: l.title,
          level: l.level,
          intro: l.intro,
          sections: l.sections,
          phrases: l.phrases.map((ph) => ({ text: ph.t, reading: ph.r || undefined, fr: ph.f, en: !!ph.en })),
          quiz: l.quiz,
        })),
      )
      .catch(() => []);
    cache.set(code, p);
  }
  return p;
}

/** Leçons du guide pour la langue, `undefined` tant que le chargement n'est pas fini. */
export function useCourse(code: string): Lesson[] | undefined {
  const [state, setState] = useState<{ code: string; lessons: Lesson[] }>();
  useEffect(() => {
    let live = true;
    loadCourse(code).then((lessons) => live && setState({ code, lessons }));
    return () => { live = false; };
  }, [code]);
  return state?.code === code ? state.lessons : undefined;
}
