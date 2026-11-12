// Conversation et génération de contenu, quel que soit le fournisseur d'IA choisi.
import { ask, parseJson, type Msg } from './ai';
import type { ChatTurn, Language, Lesson, Pack, Phrase, Verb, Word } from './types';

export { explainError } from './ai';

export interface AiOpts {
  provider: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}

// ───────────── Conversation ─────────────

export const SCENARIOS = [
  'Conversation libre',
  'Première rencontre',
  'Au café',
  'Au restaurant',
  'Demander son chemin',
  'Faire les courses',
  "À l'hôtel",
  'Entretien d’embauche',
];

function chatSystem(lang: Language, level: string, scenario: string, uiLang: string) {
  return `Tu es un partenaire de conversation pour quelqu'un qui apprend la langue suivante : ${lang.name} (${lang.native}).
Niveau de l'élève : ${level}. Situation jouée : ${scenario}.
Les explications et traductions doivent être rédigées dans la langue dont le code est « ${uiLang} ».

Tu joues un interlocuteur natif dans cette situation et tu fais avancer l'échange : réponds, puis relance par une question ou une remarque. Parle uniquement en ${lang.name}, avec un vocabulaire et des phrases adaptés au niveau de l'élève, en une à trois phrases. Si l'élève écrit dans sa propre langue, réponds quand même en ${lang.name} et montre-lui dans la correction comment dire ce qu'il voulait dire.

Réponds toujours exactement sous cette forme, sans rien avant ni après :
<reply>ta réplique en ${lang.name}, dans son écriture habituelle</reply>
<fr>traduction de ta réplique</fr>
<fix>correction du dernier message de l'élève avec la phrase corrigée, ou vide s'il était correct ou s'il n'y a pas encore de message</fix>

La réplique est lue à voix haute par une synthèse vocale : n'y mets ni romanisation, ni parenthèses, ni émojis.`;
}

const tag = (s: string, t: string) => {
  const m = s.match(new RegExp(`<${t}>([\\s\\S]*?)(</${t}>|$)`));
  return m ? m[1].trim() : '';
};

export function parseTurn(raw: string): ChatTurn {
  const text = tag(raw, 'reply') || raw.replace(/<[^>]*>?/g, '').trim();
  return { role: 'assistant', text, fr: tag(raw, 'fr') || undefined, fix: tag(raw, 'fix') || undefined };
}

export async function chat(
  o: AiOpts & { lang: Language; level: string; scenario: string; turns: ChatTurn[]; uiLang: string },
  onPartial: (t: ChatTurn) => void,
): Promise<ChatTurn> {
  const messages: Msg[] = o.turns.length
    ? o.turns.map((t) => ({
        role: t.role,
        content: t.role === 'user' ? t.text : `<reply>${t.text}</reply>\n<fr>${t.fr ?? ''}</fr>\n<fix>${t.fix ?? ''}</fix>`,
      }))
    : [{ role: 'user', content: '(Commence la conversation : salue-moi et lance la situation.)' }];

  const raw = await ask({
    ...o,
    system: chatSystem(o.lang, o.level, o.scenario, o.uiLang),
    messages,
    maxTokens: 2000,
    onText: (soFar) => onPartial(parseTurn(soFar)),
  });
  return parseTurn(raw);
}

// ───────────── Génération de contenu ─────────────

const SYSTEM = (uiLang: string) =>
  `Tu rédiges le contenu d'une application d'apprentissage des langues. Toutes les explications, traductions et consignes doivent être écrites dans la langue dont le code est « ${uiLang} ». Le contenu doit être exact, naturel pour un locuteur natif et adapté au niveau demandé. Dans le doute sur une forme, choisis un autre exemple dont tu es sûr.
Réponds uniquement par un objet JSON valide, sans texte autour et sans balises Markdown.`;

const blank = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim() : undefined);
const str = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

export interface GenOpts extends AiOpts {
  lang: Language;
  level: string;
  pack: Pack;
  uiLang: string;
  topic?: string;
}

const about = (o: GenOpts) =>
  `Langue étudiée : ${o.lang.name} (${o.lang.native}). Niveau : ${o.level}.${o.topic ? ` Sujet demandé : ${o.topic}.` : ''}`;

async function gen<T>(o: GenOpts, prompt: string, shape: string): Promise<T> {
  const raw = await ask({
    provider: o.provider, apiKey: o.apiKey, model: o.model, signal: o.signal,
    system: SYSTEM(o.uiLang),
    messages: [{ role: 'user', content: `${about(o)}\n${prompt}\n\nFormat attendu :\n${shape}` }],
    json: true,
    maxTokens: 16000,
  });
  return parseJson<T>(raw);
}

const WORD_SHAPE = `{"words":[{"term":"mot dans la langue étudiée","reading":"romanisation si l'écriture n'est pas latine, sinon \\"\\"","fr":"traduction","theme":"thème, un ou deux mots","example":"phrase d'exemple","exampleFr":"traduction de l'exemple"}]}`;
const VERB_SHAPE = `{"verbs":[{"infinitive":"infinitif","reading":"romanisation ou \\"\\"","fr":"traduction","note":"remarque utile ou \\"\\"","tenses":[{"name":"nom du temps","forms":[{"label":"pronom sujet","form":"forme conjuguée","reading":"romanisation ou \\"\\""}]}]}]}`;
const LESSON_SHAPE = `{"title":"titre","level":"niveau","intro":"introduction","sections":[{"heading":"titre de section","body":"explication"}],"phrases":[{"text":"phrase dans la langue étudiée","reading":"romanisation ou \\"\\"","fr":"traduction"}],"quiz":[{"q":"question","choices":["a","b","c"],"answer":0}]}`;

interface RawWord { term?: string; reading?: string; fr?: string; theme?: string; example?: string; exampleFr?: string }
interface RawForm { label?: string; form?: string; reading?: string }
interface RawVerb { infinitive?: string; reading?: string; fr?: string; note?: string; tenses?: { name?: string; forms?: RawForm[] }[] }
interface RawLesson {
  title?: string; level?: string; intro?: string;
  sections?: { heading?: string; body?: string }[];
  phrases?: { text?: string; reading?: string; fr?: string }[];
  quiz?: { q?: string; choices?: string[]; answer?: number }[];
}

export async function generateWords(o: GenOpts, n = 15): Promise<Word[]> {
  const known = o.pack.words.slice(-400).map((w) => w.term).join(', ');
  const out = await gen<{ words?: RawWord[] }>(o,
    `Propose ${n} nouveaux mots ou expressions utiles, ${o.topic ? `tous sur le thème « ${o.topic} » (mets ce thème dans le champ theme)` : 'regroupés sous un ou deux thèmes'}.\nMots déjà connus, à ne pas répéter : ${known || 'aucun'}.`,
    WORD_SHAPE);
  return (out.words ?? [])
    .filter((w) => str(w.term) && str(w.fr))
    .map((w) => ({
      id: `${o.lang.code}:${str(w.term)}`, term: str(w.term), reading: blank(w.reading), fr: str(w.fr),
      theme: str(w.theme) || 'Divers', example: blank(w.example), exampleFr: blank(w.exampleFr),
    }));
}

export async function generateVerbs(o: GenOpts, n = 3): Promise<Verb[]> {
  const known = o.pack.verbs.slice(-100).map((v) => v.infinitive).join(', ');
  const out = await gen<{ verbs?: RawVerb[] }>(o,
    `Propose ${n} nouveaux verbes courants avec leurs formes essentielles (temps ou aspects principaux, toutes les personnes quand la langue conjugue selon la personne). Si la langue ne conjugue pas ses verbes, donne à la place les constructions qui expriment la négation, l'aspect et le futur, avec une courte phrase pour chacune.\nVerbes déjà présents, à ne pas répéter : ${known || 'aucun'}.`,
    VERB_SHAPE);
  return (out.verbs ?? [])
    .filter((v) => str(v.infinitive))
    .map((v) => ({
      id: `${o.lang.code}:${str(v.infinitive)}`, infinitive: str(v.infinitive), reading: blank(v.reading),
      fr: str(v.fr), note: blank(v.note),
      tenses: (v.tenses ?? []).map((t) => ({
        name: str(t.name),
        forms: (t.forms ?? []).filter((f) => str(f.form)).map((f) => ({ label: str(f.label), form: str(f.form), reading: blank(f.reading) })),
      })).filter((t) => t.forms.length),
    }));
}

export async function generateLesson(o: GenOpts, kind?: 'grammar'): Promise<Lesson> {
  const known = o.pack.lessons.filter((l) => l.kind === kind).map((l) => l.title).join(' ; ');
  const askFor = kind === 'grammar'
    ? `Rédige un nouveau point de grammaire précis et bien délimité (règle, exceptions, erreurs fréquentes), avec une introduction, trois ou quatre sections, cinq à huit phrases d'exemple traduites, et un quiz de trois ou quatre questions à choix multiples.\nPoints de grammaire déjà traités : ${known || 'aucun'}.`
    : `Rédige une nouvelle leçon qui fait suite aux précédentes : une introduction, trois ou quatre sections d'explication, cinq à huit phrases d'exemple avec leur traduction, et un quiz de trois ou quatre questions à choix multiples.\nLeçons déjà faites : ${known || 'aucune'}.`;
  const l = await gen<RawLesson>(o, askFor, LESSON_SHAPE);
  return {
    id: `${o.lang.code}:${kind ? 'g' : 'x'}${Date.now()}`,
    kind,
    title: str(l.title) || 'Leçon',
    level: str(l.level) || o.level,
    intro: str(l.intro),
    sections: (l.sections ?? []).filter((s) => str(s.body)).map((s) => ({ heading: str(s.heading), body: str(s.body) })),
    phrases: (l.phrases ?? []).filter((p) => str(p.text)).map((p) => ({ text: str(p.text), reading: blank(p.reading), fr: str(p.fr) })),
    quiz: (l.quiz ?? []).filter((q) => str(q.q) && Array.isArray(q.choices) && q.choices.length > 1
      && typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.choices.length)
      .map((q) => ({ q: str(q.q), choices: q.choices!.map(str), answer: q.answer! })),
  };
}

/** Traduit en français les phrases d'une leçon tirée d'un guide en anglais. */
export async function translatePhrases(o: AiOpts & { uiLang: string }, phrases: Phrase[]): Promise<string[]> {
  const list = phrases.map((p, i) => `${i + 1}. ${p.fr}`).join('\n');
  const raw = await ask({
    provider: o.provider, apiKey: o.apiKey, model: o.model, signal: o.signal,
    system: `Tu traduis des amorces de guide de conversation vers la langue dont le code est « ${o.uiLang} ». Réponds uniquement par un objet JSON, sans texte autour.`,
    messages: [{ role: 'user', content: `Traduis chacune de ces lignes. Garde l'ordre et le nombre de lignes.\n\n${list}\n\nFormat attendu :\n{"lines":["traduction 1","traduction 2"]}` }],
    json: true,
    maxTokens: 8000,
  });
  const out = parseJson<{ lines?: string[] }>(raw);
  return (out.lines ?? []).map(str);
}

const THEMES = [
  'Famille et relations', 'Nourriture et boissons', 'Voyage et transports', 'Maison et vie quotidienne',
  'Travail et études', 'Santé et corps', 'Nature et météo', 'Vêtements et achats',
  'Loisirs et culture', 'Émotions et caractère', 'Temps et calendrier', 'Ville et lieux publics',
];

export interface CourseStep { label: string; run: (o: GenOpts) => Promise<Partial<Pack>> }

/** Les étapes du cours complet : 12 thèmes de 25 mots, 12 verbes, 6 leçons et 6 points de grammaire. */
export function courseSteps(): CourseStep[] {
  return [
    ...THEMES.map((t): CourseStep => ({ label: `Vocabulaire : ${t}`, run: async (o) => ({ words: await generateWords({ ...o, topic: t }, 25) }) })),
    ...[0, 1, 2].map((i): CourseStep => ({ label: `Conjugaison ${i + 1}/3`, run: async (o) => ({ verbs: await generateVerbs(o, 4) }) })),
    ...[0, 1, 2, 3, 4, 5].map((i): CourseStep => ({ label: `Grammaire ${i + 1}/6`, run: async (o) => ({ lessons: [await generateLesson(o, 'grammar')] }) })),
    ...[0, 1, 2, 3, 4, 5].map((i): CourseStep => ({ label: `Leçon ${i + 1}/6`, run: async (o) => ({ lessons: [await generateLesson(o)] }) })),
  ];
}

/** Mise à jour complète d'une langue : mots, verbes et une leçon. */
export async function generateUpdate(o: GenOpts, onStep: (s: string) => void): Promise<Partial<Pack>> {
  onStep('Vocabulaire…');
  const words = await generateWords(o);
  onStep('Conjugaison…');
  const verbs = await generateVerbs(o);
  onStep('Leçon…');
  const lessons = [await generateLesson(o)];
  return { words, verbs, lessons };
}
