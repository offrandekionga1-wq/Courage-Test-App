// Connexion à Claude : conversation simulée et génération de nouveau contenu.
// La clé API reste sur le téléphone et les requêtes partent directement vers l'API Anthropic.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { ChatTurn, Language, Lesson, Pack, Verb, Word } from './types';

const BETAS = ['server-side-fallback-2026-07-01'];

const client = (apiKey: string) => new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

export function explainError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Clé API refusée. Vérifiez-la dans les réglages.';
  if (e instanceof Anthropic.PermissionDeniedError) return "Cette clé n'a pas accès à ce modèle.";
  if (e instanceof Anthropic.NotFoundError) return 'Modèle introuvable. Vérifiez son nom dans les réglages.';
  if (e instanceof Anthropic.RateLimitError) return 'Trop de requêtes. Réessayez dans un instant.';
  if (e instanceof Anthropic.APIConnectionError) return 'Pas de connexion. Claude a besoin du réseau.';
  if (e instanceof Anthropic.APIError) return `Erreur de l'API (${e.status}) : ${e.message}`;
  return e instanceof Error ? e.message : 'Erreur inconnue.';
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

function chatSystem(lang: Language, level: string, scenario: string) {
  return `Tu es un partenaire de conversation pour un francophone qui apprend la langue suivante : ${lang.name} (${lang.native}).
Niveau de l'élève : ${level}. Situation jouée : ${scenario}.

Tu joues un interlocuteur natif dans cette situation et tu fais avancer l'échange : réponds, puis relance par une question ou une remarque. Parle uniquement en ${lang.name}, avec un vocabulaire et des phrases adaptés au niveau de l'élève, en une à trois phrases. Si l'élève écrit en français, réponds quand même en ${lang.name} et montre-lui dans la correction comment dire ce qu'il voulait dire.

Réponds toujours exactement sous cette forme, sans rien avant ni après :
<reply>ta réplique en ${lang.name}, dans son écriture habituelle</reply>
<fr>traduction française de ta réplique</fr>
<fix>en français : correction du dernier message de l'élève avec la phrase corrigée, ou vide s'il était correct ou s'il n'y a pas encore de message</fix>

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
  o: { apiKey: string; model: string; lang: Language; level: string; scenario: string; turns: ChatTurn[] },
  onPartial: (t: ChatTurn) => void,
): Promise<ChatTurn> {
  const messages: Anthropic.Beta.BetaMessageParam[] = o.turns.length
    ? o.turns.map((t) => ({
        role: t.role,
        content: t.role === 'user' ? t.text : `<reply>${t.text}</reply>\n<fr>${t.fr ?? ''}</fr>\n<fix>${t.fix ?? ''}</fix>`,
      }))
    : [{ role: 'user', content: '(Commence la conversation : salue-moi et lance la situation.)' }];

  const stream = client(o.apiKey).beta.messages.stream({
    model: o.model,
    max_tokens: 4000,
    betas: BETAS,
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: chatSystem(o.lang, o.level, o.scenario),
    messages,
  });
  let raw = '';
  stream.on('text', (d) => { raw += d; onPartial(parseTurn(raw)); });
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') throw new Error("Claude n'a pas pu répondre à ce message.");
  return parseTurn(raw);
}

// ───────────── Génération de contenu ─────────────

const WordZ = z.object({
  term: z.string().describe("Le mot ou l'expression dans la langue étudiée, dans son écriture habituelle"),
  reading: z.string().describe('Romanisation ou prononciation si l’écriture n’est pas latine, sinon chaîne vide'),
  fr: z.string().describe('Traduction française'),
  theme: z.string().describe('Thème en français, un ou deux mots'),
  example: z.string().describe('Phrase d’exemple simple dans la langue étudiée'),
  exampleFr: z.string().describe('Traduction française de l’exemple'),
});
const VerbZ = z.object({
  infinitive: z.string(),
  reading: z.string().describe('Romanisation si nécessaire, sinon chaîne vide'),
  fr: z.string(),
  note: z.string().describe('Remarque utile en français (groupe, irrégularité), ou chaîne vide'),
  tenses: z.array(z.object({
    name: z.string().describe('Nom du temps, de l’aspect ou du groupe de formes, en français'),
    forms: z.array(z.object({
      label: z.string().describe('Pronom sujet ou nom de la forme'),
      form: z.string(),
      reading: z.string().describe('Romanisation si nécessaire, sinon chaîne vide'),
    })),
  })),
});
const LessonZ = z.object({
  title: z.string(),
  level: z.string(),
  intro: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
  phrases: z.array(z.object({ text: z.string(), reading: z.string(), fr: z.string() })),
  quiz: z.array(z.object({
    q: z.string(),
    choices: z.array(z.string()),
    answer: z.number().describe('Indice (à partir de 0) de la bonne réponse dans choices'),
  })),
});

const blank = (s: string) => (s.trim() ? s.trim() : undefined);

async function generate<T extends z.ZodType>(apiKey: string, model: string, schema: T, prompt: string): Promise<z.infer<T>> {
  const res = await client(apiKey).beta.messages.parse({
    model,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: 'default',
    output_config: { effort: 'medium', format: zodOutputFormat(schema) },
    system: "Tu rédiges le contenu d'une application d'apprentissage des langues destinée à des francophones. Toutes les explications sont en français. Le contenu doit être exact, naturel pour un locuteur natif et adapté au niveau demandé. Dans le doute sur une forme, choisis un autre exemple dont tu es sûr.",
    messages: [{ role: 'user', content: prompt }],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error("Claude n'a pas renvoyé de contenu exploitable.");
  return res.parsed_output;
}

interface GenOpts { apiKey: string; model: string; lang: Language; level: string; pack: Pack; topic?: string }
const about = (o: GenOpts) => `Langue : ${o.lang.name} (${o.lang.native}). Niveau : ${o.level}.${o.topic ? ` Sujet demandé : ${o.topic}.` : ''}`;

export async function generateWords(o: GenOpts, n = 15): Promise<Word[]> {
  const known = o.pack.words.map((w) => w.term).join(', ');
  const out = await generate(o.apiKey, o.model, z.object({ words: z.array(WordZ) }),
    `${about(o)}\nPropose ${n} nouveaux mots ou expressions utiles, regroupés sous un ou deux thèmes.\nMots déjà connus, à ne pas répéter : ${known || 'aucun'}.`);
  return out.words.map((w) => ({
    id: `${o.lang.code}:${w.term}`, term: w.term, reading: blank(w.reading), fr: w.fr, theme: w.theme,
    example: blank(w.example), exampleFr: blank(w.exampleFr),
  }));
}

export async function generateVerbs(o: GenOpts, n = 3): Promise<Verb[]> {
  const known = o.pack.verbs.map((v) => v.infinitive).join(', ');
  const out = await generate(o.apiKey, o.model, z.object({ verbs: z.array(VerbZ) }),
    `${about(o)}\nPropose ${n} nouveaux verbes courants avec leurs formes essentielles (temps ou aspects principaux, toutes les personnes quand la langue conjugue selon la personne). Si la langue ne conjugue pas ses verbes, donne à la place les constructions qui expriment la négation, l'aspect et le futur, avec une courte phrase pour chacune.\nVerbes déjà présents, à ne pas répéter : ${known || 'aucun'}.`);
  return out.verbs.map((v) => ({
    id: `${o.lang.code}:${v.infinitive}`, infinitive: v.infinitive, reading: blank(v.reading), fr: v.fr, note: blank(v.note),
    tenses: v.tenses.map((t) => ({ name: t.name, forms: t.forms.map((f) => ({ label: f.label, form: f.form, reading: blank(f.reading) })) })),
  }));
}

export async function generateLesson(o: GenOpts): Promise<Lesson> {
  const known = o.pack.lessons.map((l) => l.title).join(' ; ');
  const l = await generate(o.apiKey, o.model, LessonZ,
    `${about(o)}\nRédige une nouvelle leçon qui fait suite aux précédentes : une introduction, trois ou quatre sections d'explication, cinq à huit phrases d'exemple avec leur traduction, et un quiz de trois ou quatre questions à choix multiples.\nLeçons déjà faites : ${known || 'aucune'}.`);
  return {
    id: `${o.lang.code}:g${Date.now()}`, title: l.title, level: l.level, intro: l.intro, sections: l.sections,
    phrases: l.phrases.map((p) => ({ text: p.text, reading: blank(p.reading), fr: p.fr })),
    quiz: l.quiz.filter((q) => q.answer >= 0 && q.answer < q.choices.length),
  };
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
