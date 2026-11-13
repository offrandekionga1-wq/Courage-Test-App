import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppState, Language, Pack } from './types';
import { BUILTIN_LANGUAGES, SEED } from './data';
import { defaultModel } from './ai';

const KEY = 'polyglotte.v1';
export const DEFAULT_PROVIDER = 'anthropic';

const initial: AppState = {
  version: 1,
  provider: DEFAULT_PROVIDER,
  keys: {},
  apiKey: '',
  uiLang: '',
  model: defaultModel(DEFAULT_PROVIDER),
  level: '@beginner',
  voiceRate: 0.9,
  autoUpdate: false,
  learning: ['en', 'ja', 'lt', 'zh', 'tl', 'es', 'de', 'it', 'pt', 'ko'],
  active: 'en',
  customLanguages: [],
  extra: {},
  srs: {},
  lessonsDone: {},
  lessonScores: {},
  chats: {},
  lastUpdate: {},
  streak: { day: '', count: 0 },
  voiceAsked: false,
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    const saved = { ...initial, ...JSON.parse(raw) } as AppState;
    // Reprise des sauvegardes d'avant le choix du fournisseur : la clé Claude devient celle d'Anthropic.
    if (saved.apiKey && !saved.keys?.anthropic) {
      saved.keys = { ...saved.keys, anthropic: saved.apiKey };
    }
    return saved;
  } catch { /* stockage indisponible ou corrompu : on repart de zéro */ }
  return initial;
}

/** Clé d'API du fournisseur en cours. */
export const activeKey = (s: AppState): string => s.keys[s.provider] ?? '';

type Update = (fn: (s: AppState) => AppState) => void;
const Ctx = createContext<{ state: AppState; update: Update } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota dépassé */ }
  }, [state]);
  const update = useCallback<Update>((fn) => setState(fn), []);
  return <Ctx.Provider value={{ state, update }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('StoreProvider manquant');
  return c;
}

export const allLanguages = (s: AppState): Language[] => [...BUILTIN_LANGUAGES, ...s.customLanguages];
export const getLanguage = (s: AppState, code: string): Language =>
  allLanguages(s).find((l) => l.code === code) ?? BUILTIN_LANGUAGES[0];

const EMPTY: Pack = { words: [], verbs: [], lessons: [] };
/** Contenu intégré + contenu généré par Claude pour une langue. */
export function getPack(s: AppState, code: string, withSeed = true): Pack {
  const seed = withSeed ? (SEED[code] ?? EMPTY) : EMPTY;
  const extra = s.extra[code] ?? EMPTY;
  return {
    words: [...seed.words, ...extra.words],
    verbs: [...seed.verbs, ...extra.verbs],
    lessons: [...seed.lessons, ...extra.lessons],
  };
}

/** Ajoute du contenu généré, sans doublons. */
export function mergeExtra(s: AppState, code: string, add: Partial<Pack>): AppState {
  const have = getPack(s, code);
  const cur = s.extra[code] ?? EMPTY;
  const fresh = <T extends { id: string }>(existing: T[], incoming: T[] = []) => {
    const ids = new Set(existing.map((x) => x.id));
    return incoming.filter((x) => !ids.has(x.id) && ids.add(x.id));
  };
  return {
    ...s,
    extra: {
      ...s.extra,
      [code]: {
        words: [...cur.words, ...fresh(have.words, add.words)],
        verbs: [...cur.verbs, ...fresh(have.verbs, add.verbs)],
        lessons: [...cur.lessons, ...fresh(have.lessons, add.lessons)],
      },
    },
    lastUpdate: { ...s.lastUpdate, [code]: Date.now() },
  };
}

const today = () => new Date().toISOString().slice(0, 10);
/** Compte les jours consécutifs d'étude. */
export function touchStreak(s: AppState): AppState {
  const d = today();
  if (s.streak.day === d) return s;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  return { ...s, streak: { day: d, count: s.streak.day === yesterday ? s.streak.count + 1 : 1 } };
}

// Répétition espacée (boîtes de Leitner) : intervalle en jours selon la boîte.
const INTERVALS = [0, 1, 3, 7, 16, 35];
export function review(s: AppState, wordId: string, ok: boolean): AppState {
  const cur = s.srs[wordId]?.box ?? 0;
  const box = ok ? Math.min(cur + 1, INTERVALS.length - 1) : 1;
  const due = Date.now() + (ok ? INTERVALS[box] * 864e5 : 60_000);
  return touchStreak({ ...s, srs: { ...s.srs, [wordId]: { box, due } } });
}
export const isDue = (s: AppState, id: string) => !s.srs[id] || s.srs[id].due <= Date.now();
export const isKnown = (s: AppState, id: string) => (s.srs[id]?.box ?? 0) >= 3;

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
