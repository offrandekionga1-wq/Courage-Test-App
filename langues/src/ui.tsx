import { useMemo, useState, type ReactNode } from 'react';
import { activeKey, getLanguage, getPack, mergeExtra, useStore } from './store';
import { useDict } from './dict';
import { useCourse } from './course';
import { speak } from './tts';
import { explainError } from './generate';
import { useT } from './i18n';
import { IconSearch, IconSpark, IconSpeaker } from './icons';
import type { Language, Lesson, Pack, Word } from './types';

/** Mots du dictionnaire intégré qui ne doublonnent pas ceux du pack. */
export function useAllWords(code: string, pack: Pack): Word[] {
  const dict = useDict(code);
  return useMemo(() => {
    if (!dict) return pack.words;
    const have = new Set(pack.words.map((w) => w.term.toLowerCase()));
    return [...pack.words, ...dict.words.filter((w) => !have.has(w.term.toLowerCase()))];
  }, [dict, pack.words]);
}

export interface Active {
  lang: Language;
  /** Contenu écrit à la main et contenu créé par l'IA. */
  pack: Pack;
  /** `pack.words` plus le dictionnaire intégré. */
  words: Word[];
  /** `pack.verbs` plus les verbes conjugués du dictionnaire. */
  verbs: Pack['verbs'];
  /** `pack.lessons` plus les leçons du guide de conversation. */
  lessons: Lesson[];
  loading: boolean;
}

export function useActive(): Active {
  const { state } = useStore();
  const code = state.active;
  const pack = getPack(state, code);
  const dict = useDict(code);
  const course = useCourse(code);
  const words = useAllWords(code, pack);
  const verbs = useMemo(() => {
    if (!dict?.verbs.length) return pack.verbs;
    const have = new Set(pack.verbs.map((v) => v.infinitive.toLowerCase()));
    return [...pack.verbs, ...dict.verbs.filter((v) => !have.has(v.infinitive.toLowerCase()))];
  }, [dict, pack.verbs]);
  const lessons = useMemo(() => [...(course ?? []), ...pack.lessons], [course, pack.lessons]);
  return { lang: getLanguage(state, code), pack, words, verbs, lessons, loading: dict === undefined };
}

export function SpeakBtn({ text, big, lang }: { text: string; big?: boolean; lang?: string }) {
  const { state } = useStore();
  const active = getLanguage(state, state.active);
  const { t } = useT();
  return (
    <button
      className={`icon-btn${big ? ' big' : ''}`}
      aria-label={t('chat.listen')}
      onClick={(e) => { e.stopPropagation(); speak(text, lang ?? active.tts, state.voiceRate); }}
    ><IconSpeaker size={big ? 26 : 20} /></button>
  );
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
