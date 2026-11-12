import { useState } from 'react';
import { getLanguage, getPack, mergeExtra, useStore } from './store';
import { speak } from './tts';
import { explainError } from './claude';
import type { Language, Pack } from './types';

export function useActive(): { lang: Language; pack: Pack } {
  const { state } = useStore();
  return { lang: getLanguage(state, state.active), pack: getPack(state, state.active) };
}

export function SpeakBtn({ text, big }: { text: string; big?: boolean }) {
  const { state } = useStore();
  const lang = getLanguage(state, state.active);
  return (
    <button
      className={`icon-btn${big ? ' big' : ''}`}
      aria-label="Écouter"
      onClick={(e) => { e.stopPropagation(); speak(text, lang.tts, state.voiceRate); }}
    >🔊</button>
  );
}

/** Bouton « générer avec Claude » : ajoute du contenu à la langue en cours et le sauvegarde. */
export function GenerateBar({ label, run, onSettings }: {
  label: string;
  run: (onStep: (s: string) => void) => Promise<Partial<Pack>>;
  onSettings: () => void;
}) {
  const { state, update } = useStore();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  if (!state.apiKey) {
    return (
      <div className="gen">
        <button className="btn ghost" onClick={onSettings}>✨ {label}</button>
        <p className="hint">Ajoutez votre clé API Claude dans les réglages pour générer du contenu.</p>
      </div>
    );
  }
  const go = async () => {
    setMsg('');
    setBusy('Claude prépare le contenu…');
    const code = state.active;
    try {
      const add = await run(setBusy);
      update((s) => mergeExtra(s, code, add));
      const n = (add.words?.length ?? 0) + (add.verbs?.length ?? 0) + (add.lessons?.length ?? 0);
      setMsg(`${n} élément${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}.`);
    } catch (e) {
      setMsg(explainError(e));
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="gen">
      <button className="btn ghost" disabled={!!busy} onClick={go}>{busy ? `⏳ ${busy}` : `✨ ${label}`}</button>
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}
