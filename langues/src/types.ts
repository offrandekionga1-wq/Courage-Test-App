export interface Language {
  code: string;      // identifiant interne (ex. "ja")
  name: string;      // nom en français
  native: string;    // nom dans la langue
  flag: string;
  tts: string;       // étiquette BCP-47 pour la voix et la reconnaissance vocale
}

export interface Word {
  id: string;
  term: string;
  reading?: string;  // romanisation / pinyin / kana
  fr: string;
  theme: string;
  example?: string;
  exampleFr?: string;
  exampleReading?: string;   // lecture annotée de l'exemple (furigana en japonais)
  exampleEn?: boolean;       // la traduction de l'exemple est anglaise
}

export interface VerbForm { label: string; form: string; reading?: string }
export interface Tense { name: string; forms: VerbForm[] }
export interface Verb {
  id: string;
  infinitive: string;
  reading?: string;
  fr: string;
  note?: string;
  tenses: Tense[];
}

export interface Phrase { text: string; reading?: string; fr: string; en?: boolean }
export interface QuizItem { q: string; choices: string[]; answer: number }
export interface Lesson {
  id: string;
  title: string;
  level: string;
  kind?: 'grammar' | 'course' | 'vocab';   // absent = leçon ordinaire
  intro: string;
  sections: { heading: string; body: string }[];
  phrases: Phrase[];
  quiz: QuizItem[];
  /** Mots étudiés, pour les leçons de vocabulaire. */
  words?: Word[];
  /** Page d'origine, pour les leçons tirées d'un wiki. */
  source?: string;
  /** Langue dans laquelle la leçon est rédigée, quand ce n'est pas celle de l'interface. */
  explain?: string;
}

export interface Pack { words: Word[]; verbs: Verb[]; lessons: Lesson[] }

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;      // message dans la langue étudiée
  fr?: string;       // traduction
  fix?: string;      // correction du message précédent de l'élève
}

export interface Srs { box: number; due: number }

/** Progression d'un quiz de leçon, pour bâtir les exercices. */
export interface LessonScore { ok: number; n: number; at: number }

export interface AppState {
  version: 1;
  provider: string;                // identifiant du fournisseur d'IA
  keys: Record<string, string>;    // une clé par fournisseur, gardée en changeant de fournisseur
  apiKey: string;                  // ancienne clé Claude, reprise au premier lancement
  uiLang: string;                  // langue de l'interface ; vide = celle du téléphone
  model: string;
  level: string;
  voiceRate: number;
  autoUpdate: boolean;
  learning: string[];             // codes des langues étudiées
  active: string;                 // langue en cours
  customLanguages: Language[];
  extra: Record<string, Pack>;    // contenu généré par Claude, par langue
  srs: Record<string, Srs>;       // progression par mot
  lessonsDone: Record<string, true>;
  lessonScores: Record<string, LessonScore>;
  chats: Record<string, { scenario: string; turns: ChatTurn[] }>;
  lastUpdate: Record<string, number>;
  streak: { day: string; count: number };
  voiceAsked: boolean;              // l'installation des voix a déjà été proposée
}
