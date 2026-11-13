// Conversation et génération de contenu, quel que soit le fournisseur d'IA choisi.
import { ask, parseJson, type Msg } from './ai';
import { languageName, term } from './terms';
import type { ChatTurn, Language, Lesson, Pack, Phrase, Verb, Word } from './types';

export { explainError } from './ai';

export interface AiOpts {
  provider: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}

// ───────────── Conversation ─────────────

export const SCENARIOS = ['@s_free', '@s_meet', '@s_cafe', '@s_restaurant', '@s_directions', '@s_shopping', '@s_hotel', '@s_interview'];

/** Nom anglais d'une langue, pour les consignes données à l'IA. */
export function englishName(code: string, fallback = code): string {
  return languageName(code, 'en', fallback);
}

function chatSystem(lang: Language, level: string, scenario: string, uiLang: string) {
  const studied = englishName(lang.code, lang.name);
  const own = englishName(uiLang);
  return `You are a conversation partner for someone learning ${studied} (${lang.native}). The learner's own language is ${own}.
Learner level: ${term(level, 'en')}. Role-play situation: ${term(scenario, 'en')}.

Play a native speaker in this situation and keep the exchange going: answer, then follow up with a question or remark. Speak only ${studied}, with vocabulary and sentences suited to the learner's level, in one to three sentences. If the learner writes in their own language, still answer in ${studied} and show them in the correction how to say what they meant.

The translation and the correction MUST be written in ${own}, never in French or English unless that is the learner's language.

Always answer exactly in this form, with nothing before or after:
<reply>your line in ${studied}, in its usual script</reply>
<fr>translation of your line into ${own}</fr>
<fix>correction of the learner's last message, explained in ${own}, with the corrected sentence; empty if it was correct or if there is no message yet</fix>

The reply is read aloud by a speech synthesiser: no romanisation, brackets or emojis in it.`;
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
    : [{ role: 'user', content: '(Start the conversation: greet me and set up the situation.)' }];

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
  `You write content for a language-learning app. Every explanation, translation, title and instruction MUST be written in ${englishName(uiLang)} (the learner's own language), never in another language. The content must be accurate, natural for a native speaker and suited to the requested level. If unsure about a form, pick another example you are sure of.
Answer only with a valid JSON object, no text around it and no Markdown fences.`;

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
  `Language studied: ${englishName(o.lang.code, o.lang.name)} (${o.lang.native}). Level: ${term(o.level, 'en')}.${o.topic ? ` Requested topic: ${o.topic}.` : ''} Write translations and explanations in ${englishName(o.uiLang)}.`;

async function gen<T>(o: GenOpts, prompt: string, shape: string): Promise<T> {
  const raw = await ask({
    provider: o.provider, apiKey: o.apiKey, model: o.model, signal: o.signal,
    system: SYSTEM(o.uiLang),
    messages: [{ role: 'user', content: `${about(o)}\n${prompt}\n\nExpected format:\n${shape}` }],
    json: true,
    maxTokens: 16000,
  });
  return parseJson<T>(raw);
}

const WORD_SHAPE = `{"words":[{"term":"word in the studied language","reading":"romanisation if the script is not Latin, else \\"\\"","fr":"translation in the learner's language","theme":"topic, one or two words, in the learner's language","example":"example sentence","exampleFr":"translation of the example in the learner's language"}]}`;
const VERB_SHAPE = `{"verbs":[{"infinitive":"infinitive","reading":"romanisation or \\"\\"","fr":"translation in the learner's language","note":"useful remark in the learner's language or \\"\\"","tenses":[{"name":"tense name in the learner's language","forms":[{"label":"subject pronoun","form":"conjugated form","reading":"romanisation or \\"\\""}]}]}]}`;
const LESSON_SHAPE = `{"title":"title","level":"A1, A2, B1, B2, C1 or C2","intro":"introduction","sections":[{"heading":"section title","body":"explanation"}],"phrases":[{"text":"sentence in the studied language","reading":"romanisation or \\"\\"","fr":"translation"}],"quiz":[{"q":"question","choices":["a","b","c"],"answer":0}]}`;

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
    `Suggest ${n} new useful words or expressions, ${o.topic ? `all about the topic “${o.topic}” (put that topic in the theme field)` : 'grouped under one or two topics'}.\nWords already known, do not repeat: ${known || 'none'}.`,
    WORD_SHAPE);
  return (out.words ?? [])
    .filter((w) => str(w.term) && str(w.fr))
    .map((w) => ({
      id: `${o.lang.code}:${str(w.term)}`, term: str(w.term), reading: blank(w.reading), fr: str(w.fr),
      theme: str(w.theme) || '…', example: blank(w.example), exampleFr: blank(w.exampleFr),
    }));
}

export async function generateVerbs(o: GenOpts, n = 3): Promise<Verb[]> {
  const known = o.pack.verbs.slice(-100).map((v) => v.infinitive).join(', ');
  const out = await gen<{ verbs?: RawVerb[] }>(o,
    `Suggest ${n} new common verbs with their essential forms (main tenses or aspects, every person when the language conjugates by person). If the language does not conjugate verbs, give instead the constructions for negation, aspect and future, with a short sentence for each.\nVerbs already present, do not repeat: ${known || 'none'}.`,
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
    ? `Write a new, precise and well-bounded grammar point (rule, exceptions, common mistakes), with an introduction, three or four sections, five to eight translated example sentences, and a quiz of three or four multiple-choice questions.\nGrammar points already covered: ${known || 'none'}.`
    : `Write a new lesson that follows on from the previous ones: an introduction, three or four explanatory sections, five to eight example sentences with their translation, and a quiz of three or four multiple-choice questions.\nLessons already done: ${known || 'none'}.`;
  const l = await gen<RawLesson>(o, askFor, LESSON_SHAPE);
  return {
    id: `${o.lang.code}:${kind ? 'g' : 'x'}${Date.now()}`,
    kind,
    title: str(l.title) || '…',
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
    system: `You translate phrasebook prompts into ${englishName(o.uiLang)}. Answer only with a JSON object, no text around it.`,
    messages: [{ role: 'user', content: `Translate each of these lines. Keep the order and the number of lines.\n\n${list}\n\nExpected format:\n{"lines":["translation 1","translation 2"]}` }],
    json: true,
    maxTokens: 8000,
  });
  const out = parseJson<{ lines?: string[] }>(raw);
  return (out.lines ?? []).map(str);
}

const THEMES = [
  'family and relationships', 'food and drink', 'travel and transport', 'home and daily life',
  'work and study', 'health and the body', 'nature and weather', 'clothes and shopping',
  'leisure and culture', 'emotions and character', 'time and the calendar', 'the city and public places',
];

export interface CourseStep { label: string; run: (o: GenOpts) => Promise<Partial<Pack>> }

/** Les étapes du cours complet : 12 thèmes de 25 mots, 12 verbes, 6 leçons et 6 points de grammaire. */
export function courseSteps(): CourseStep[] {
  return [
    ...THEMES.map((t): CourseStep => ({ label: `nav.vocab|${THEMES.indexOf(t) + 1}/12`, run: async (o) => ({ words: await generateWords({ ...o, topic: t }, 25) }) })),
    ...[0, 1, 2].map((i): CourseStep => ({ label: `nav.conj|${i + 1}/3`, run: async (o) => ({ verbs: await generateVerbs(o, 4) }) })),
    ...[0, 1, 2, 3, 4, 5].map((i): CourseStep => ({ label: `lessons.grammar|${i + 1}/6`, run: async (o) => ({ lessons: [await generateLesson(o, 'grammar')] }) })),
    ...[0, 1, 2, 3, 4, 5].map((i): CourseStep => ({ label: `lessons.lesson|${i + 1}/6`, run: async (o) => ({ lessons: [await generateLesson(o)] }) })),
  ];
}

/** Mise à jour complète d'une langue : mots, verbes et une leçon. */
export async function generateUpdate(o: GenOpts, onStep: (s: string) => void): Promise<Partial<Pack>> {
  onStep('nav.vocab');
  const words = await generateWords(o);
  onStep('nav.conj');
  const verbs = await generateVerbs(o);
  onStep('lessons.lesson');
  const lessons = [await generateLesson(o)];
  return { words, verbs, lessons };
}
