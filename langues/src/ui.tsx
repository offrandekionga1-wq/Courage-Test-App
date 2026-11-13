import { useMemo, useState, type ReactNode } from 'react';
import { activeKey, getLanguage, getPack, mergeExtra, useStore } from './store';
import { useDict } from './dict';
import { useCourse, useWikibooks } from './course';
import { useGrammarPoints } from './grammar';
import { useVocabLessons } from './lessons';
import { term, translateNote } from './terms';
import { hasFurigana, plainText, Ruby } from './ruby';
import { speak } from './tts';
import { explainError } from './generate';
import { useT } from './i18n';
import { IconSearch, IconSpark, IconSpeaker } from './icons';
import type { Language, Lesson, Pack, Word } from './types';

/** Mots du dictionnaire intégré qui ne doublonnent pas ceux du pack. */
export function useAllWords(code: string, pack: Pack): Word[] {
  const { locale } = useT();
  const dict = useDict(code, locale);
  return useMemo(() => {
    if (!dict) return pack.words;
    const have = new Set(pack.words.map((w) => w.term.toLowerCase()));
    return [...pack.words, ...dict.words.filter((w) => !have.has(w.term.toLowerCase()))];
  }, [dict, pack.words]);
}

export interface Active {
  lang: Language;
  /** Contenu écrit à la main (en français seulement) et contenu créé par l'IA. */
  pack: Pack;
  /** `pack.words` plus le dictionnaire intégré. */
  words: Word[];
  /** `pack.verbs` plus les verbes conjugués du dictionnaire. */
  verbs: Pack['verbs'];
  /** Leçons du guide, de vocabulaire, de grammaire, plus celles de l'IA. */
  lessons: Lesson[];
  /** Langue dans laquelle les définitions sont rédigées (celle de l'interface, ou un repli). */
  explain: string;
  loading: boolean;
}

export function useActive(): Active {
  const { state } = useStore();
  const { t, locale } = useT();
  const code = state.active;
  // Le contenu écrit à la main est en français : on ne l'affiche qu'avec l'interface française.
  // Mémorisé sur le seul contenu de la langue : recalculer à chaque changement d'état (une
  // réponse, une série de jours) renouvelait les listes et relançait les quiz en cours.
  const extra = state.extra[code];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pack = useMemo(() => getPack(state, code, locale === 'fr'), [extra, code, locale]);
  const dict = useDict(code, locale);
  const course = useCourse(code, locale, t);
  const words = useAllWords(code, pack);
  const verbs = useMemo(() => {
    const own = (dict?.verbs ?? []).map((v) => ({
      ...v,
      note: v.note ? translateNote(v.note, locale) : undefined,
      tenses: v.tenses.map((x) => ({ ...x, name: term(x.name, locale) })),
    }));
    const have = new Set(pack.verbs.map((v) => v.infinitive.toLowerCase()));
    return [...pack.verbs, ...own.filter((v) => !have.has(v.infinitive.toLowerCase()))];
  }, [dict, pack.verbs, locale]);
  // Les leçons référencent les mots par leur graphie dans le dictionnaire : il faut lui passer
  // `dict.words`, et non la liste combinée, qui commence par le contenu écrit à la main.
  const vocabLessons = useVocabLessons(code, dict?.words ?? [], locale, t);
  const rules = useGrammarPoints(code, locale, t);
  const wikibooks = useWikibooks(code, locale);
  const lessons = useMemo(
    () => {
      const withFallback = (ls: Lesson[]) => dict && dict.explain !== locale
        ? ls.map((l) => (l.explain ? l : { ...l, explain: dict.explain })) : ls;
      return [
        ...(course ?? []),
        ...withFallback(vocabLessons ?? []),
        ...(rules ?? []),
        ...(wikibooks ?? []),
        ...pack.lessons,
      ];
    },
    [course, vocabLessons, rules, wikibooks, pack.lessons, dict, locale],
  );
  return {
    lang: getLanguage(state, code), pack, words, verbs, lessons,
    explain: dict?.explain ?? locale,
    loading: dict === undefined,
  };
}

export function SpeakBtn({ text, big, lang }: { text: string; big?: boolean; lang?: string }) {
  const { state } = useStore();
  const active = getLanguage(state, state.active);
  const { t } = useT();
  return (
    <button
      className={`icon-btn${big ? ' big' : ''}`}
      aria-label={t('chat.listen')}
      onClick={(e) => { e.stopPropagation(); speak(plainText(text), lang ?? active.tts, state.voiceRate); }}
    ><IconSpeaker size={big ? 26 : 20} /></button>
  );
}

/**
 * Affiche une phrase. En japonais, la lecture note celle de chaque kanji : on la montre alors en
 * furigana au-dessus du texte, plutôt que sur une ligne séparée.
 */
export function Sentence({ text, reading, className }: { text: string; reading?: string; className?: string }) {
  if (hasFurigana(reading)) return <Ruby annotated={reading!} className={className} />;
  return <span className={className}>{text}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder: string }) {
  return (
    <div className="search">
      <span className="ic"><IconSearch size={18} /></span>
      <input className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Marque une définition venue d'une source anglaise. */
export function EnTag() {
  const { t } = useT();
  return <span className="tag-en" title={t('common.englishTip')}>{t('common.english')}</span>;
}

/** Bouton « générer avec l'IA » : ajoute du contenu à la langue en cours et l'enregistre. */
export function GenerateBar({ label, run, onSettings }: {
  label: string;
  run: (onStep: (s: string) => void) => Promise<Partial<Pack>>;
  onSettings: () => void;
}) {
  const { state, update } = useStore();
  const { t } = useT();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  if (!activeKey(state)) {
    return (
      <div className="gen">
        <button className="btn ghost full" onClick={onSettings}><IconSpark size={18} /> {label}</button>
        <p className="hint">{t('gen.needKey')}</p>
      </div>
    );
  }
  const go = async () => {
    setMsg('');
    setBusy(t('settings.generating'));
    const code = state.active;
    try {
      const add = await run(setBusy);
      update((s) => mergeExtra(s, code, add));
      const n = (add.words?.length ?? 0) + (add.verbs?.length ?? 0) + (add.lessons?.length ?? 0);
      setMsg(`+${n}`);
    } catch (e) {
      setMsg(explainError(e));
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="gen">
      <button className="btn ghost full" disabled={!!busy} onClick={go}>
        <IconSpark size={18} /> {busy || label}
      </button>
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}
