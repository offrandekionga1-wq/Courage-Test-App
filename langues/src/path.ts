import type { Lesson } from './types';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Parcours d'apprentissage : pour chaque niveau, les règles de grammaire, les situations de
 * conversation et les leçons de vocabulaire sont entrelacées, de sorte qu'on avance pas à pas en
 * découvrant à la fois des règles, des phrases utiles et des mots. Les leçons sans niveau (pages
 * de référence, leçons créées par l'IA) n'y figurent pas.
 */
export function buildPath(lessons: Lesson[]): Lesson[] {
  const out: Lesson[] = [];
  for (const lv of LEVELS) {
    const at = lessons.filter((l) => l.cefr === lv);
    const grammar = at.filter((l) => l.kind === 'grammar');
    const course = at.filter((l) => l.kind === 'course');
    const vocab = at.filter((l) => l.kind === 'vocab');
    // Les règles et les situations donnent le rythme ; le vocabulaire se répartit entre elles.
    const anchors: Lesson[] = [];
    for (let i = 0; i < Math.max(grammar.length, course.length); i++) {
      // Une situation concrète (« Premiers mots ») ouvre chaque niveau, puis vient la règle.
      if (course[i]) anchors.push(course[i]);
      if (grammar[i]) anchors.push(grammar[i]);
    }
    const per = anchors.length ? Math.max(1, Math.ceil(vocab.length / anchors.length)) : vocab.length;
    let v = 0;
    for (const a of anchors) {
      out.push(a);
      // Au début d'un niveau, peu de vocabulaire entre deux règles : on ne noie pas les bases.
      const take = Math.min(per, lv === 'A1' ? 2 : per);
      out.push(...vocab.slice(v, v + take));
      v += take;
    }
    out.push(...vocab.slice(v));
  }
  return out;
}

/** Première leçon du parcours qui n'est pas encore terminée. */
export function nextInPath(path: Lesson[], done: Record<string, true>): Lesson | undefined {
  return path.find((l) => !done[l.id]);
}

const OPEN_KEY = 'polyglotte.openLesson';
/** Demande à l'écran des leçons d'ouvrir une leçon précise (depuis l'accueil). */
export function requestOpen(id: string) {
  try { sessionStorage.setItem(OPEN_KEY, id); } catch { /* stockage indisponible */ }
}
export function takeOpenRequest(): string | null {
  try {
    const id = sessionStorage.getItem(OPEN_KEY);
    sessionStorage.removeItem(OPEN_KEY);
    return id;
  } catch {
    return null;
  }
}
