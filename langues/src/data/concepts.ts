import type { Word, Verb, Lesson, Tense } from '../types';

// Les 41 mots de départ, communs à toutes les langues (sens français + thème).
export const CONCEPTS: [fr: string, theme: string][] = [
  ['bonjour', 'Salutations'], ['bonjour (le matin)', 'Salutations'], ['bonsoir', 'Salutations'],
  ['au revoir', 'Salutations'], ['merci', 'Salutations'], ['de rien', 'Salutations'],
  ['pardon / désolé', 'Salutations'], ['oui', 'Salutations'], ['non', 'Salutations'],
  ["s'il vous plaît", 'Salutations'],
  ['un', 'Nombres'], ['deux', 'Nombres'], ['trois', 'Nombres'], ['quatre', 'Nombres'], ['cinq', 'Nombres'],
  ['six', 'Nombres'], ['sept', 'Nombres'], ['huit', 'Nombres'], ['neuf', 'Nombres'], ['dix', 'Nombres'],
  ['eau', 'Nourriture'], ['pain', 'Nourriture'], ['riz', 'Nourriture'], ['poisson', 'Nourriture'],
  ['viande', 'Nourriture'], ['thé', 'Nourriture'], ['fruit', 'Nourriture'], ['lait', 'Nourriture'],
  ['mère', 'Famille'], ['père', 'Famille'], ['ami', 'Famille'], ['enfant', 'Famille'], ['frère', 'Famille'],
  ['maison', 'Quotidien'], ['école', 'Quotidien'], ['travail', 'Quotidien'], ['livre', 'Quotidien'],
  ['jour', 'Quotidien'], ['nuit', 'Quotidien'], ['chien', 'Quotidien'], ['chat', 'Quotidien'],
];

/** Construit la liste de mots d'une langue : "terme" ou "terme|lecture", dans l'ordre de CONCEPTS. */
export function words(lang: string, terms: string[]): Word[] {
  return terms.map((t, i) => {
    const [term, reading] = t.split('|');
    return { id: `${lang}:${term}`, term, reading, fr: CONCEPTS[i][0], theme: CONCEPTS[i][1] };
  });
}

/** Verbe compact : chaque temps est [nom, "étiquette=forme|lecture", ...]. */
export function verb(lang: string, infinitive: string, fr: string, tenses: [string, ...string[]][], note?: string): Verb {
  const [inf, reading] = infinitive.split('|');
  const parsed: Tense[] = tenses.map(([name, ...forms]) => ({
    name,
    forms: forms.map((f) => {
      const [label, rest] = f.split('=');
      const [form, r] = rest.split('|');
      return { label, form, reading: r };
    }),
  }));
  return { id: `${lang}:${inf}`, infinitive: inf, reading, fr, note, tenses: parsed };
}

export function lesson(lang: string, n: number, l: Omit<Lesson, 'id'>): Lesson {
  return { id: `${lang}:l${n}`, ...l };
}
