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
  // ── 41 à 98 : second lot ──
  ['rouge', 'Couleurs'], ['bleu', 'Couleurs'], ['vert', 'Couleurs'], ['jaune', 'Couleurs'], ['noir', 'Couleurs'], ['blanc', 'Couleurs'],
  ['tête', 'Corps'], ['main', 'Corps'], ['œil', 'Corps'], ['cœur', 'Corps'],
  ["aujourd'hui", 'Temps'], ['demain', 'Temps'], ['hier', 'Temps'], ['maintenant', 'Temps'], ['matin', 'Temps'],
  ['ville', 'Lieux'], ['route, chemin', 'Lieux'], ['gare', 'Lieux'], ['voiture', 'Lieux'], ['magasin', 'Lieux'], ['hôpital', 'Lieux'],
  ['manger', 'Verbes'], ['boire', 'Verbes'], ['aller', 'Verbes'], ['venir', 'Verbes'], ['voir', 'Verbes'], ['parler', 'Verbes'],
  ['vouloir', 'Verbes'], ['savoir', 'Verbes'], ['aimer', 'Verbes'], ['acheter', 'Verbes'], ['dormir', 'Verbes'], ['travailler', 'Verbes'],
  ['grand', 'Adjectifs'], ['petit', 'Adjectifs'], ['bon', 'Adjectifs'], ['nouveau', 'Adjectifs'], ['beau', 'Adjectifs'], ['chaud', 'Adjectifs'], ['froid', 'Adjectifs'],
  ['quoi', 'Questions'], ['qui', 'Questions'], ['où', 'Questions'], ['quand', 'Questions'], ['pourquoi', 'Questions'], ['comment', 'Questions'], ['combien', 'Questions'],
  ['je', 'Pronoms'], ['tu', 'Pronoms'], ['il / elle', 'Pronoms'], ['nous', 'Pronoms'], ['vous', 'Pronoms'], ['ils / elles', 'Pronoms'],
  ['soleil', 'Nature'], ['pluie', 'Nature'], ['montagne', 'Nature'], ['mer', 'Nature'], ['arbre', 'Nature'],
];

/** Construit la liste de mots d'une langue : "terme" ou "terme|lecture", dans l'ordre de CONCEPTS. */
export function words(lang: string, terms: string[], offset = 0): Word[] {
  const seen = new Set<string>();
  return terms.map((t, i) => {
    const [term, reading] = t.split('|');
    let id = `${lang}:${term}`;
    if (seen.has(id)) id += `#${offset + i}`; // même mot pour deux sens (ex. tagalog « araw »)
    seen.add(id);
    const [fr, theme] = CONCEPTS[offset + i];
    return { id, term, reading, fr, theme };
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

export function grammar(lang: string, n: number, l: Omit<Lesson, 'id' | 'kind'>): Lesson {
  return { id: `${lang}:g${n}`, kind: 'grammar', ...l };
}
