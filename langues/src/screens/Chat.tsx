import { useEffect, useRef, useState } from 'react';
import { touchStreak, useStore } from '../store';
import { useActive } from '../ui';
import { chat, explainError, SCENARIOS } from '../claude';
import { dictationSupported, listen, speak, stopSpeaking } from '../tts';
import type { ChatTurn } from '../types';

export function Chat({ onSettings }: { onSettings: () => void }) {
  const { state, update } = useStore();
  const { lang } = useActive();
  const saved = state.chats[lang.code];
  const [scenario, setScenario] = useState(saved?.scenario ?? SCENARIOS[0]);
  const [turns, setTurns] = useState<ChatTurn[]>(saved?.turns ?? []);
  const [partial, setPartial] = useState<ChatTurn | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showFr, setShowFr] = useState<Record<number, boolean>>({});
  const [listening, setListening] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [turns, partial]);
  useEffect(() => () => { stopSpeaking(); stopRef.current(); }, []);

  const save = (t: ChatTurn[], sc = scenario) =>
    update((s) => touchStreak({ ...s, chats: { ...s.chats, [lang.code]: { scenario: sc, turns: t } } }));

  const ask = async (history: ChatTurn[]) => {
    setBusy(true);
    setError('');
    try {
      const reply = await chat({ apiKey: state.apiKey, model: state.model, lang, level: state.level, scenario, turns: history }, setPartial);
      const next = [...history, reply];
      setTurns(next);
      save(next);
      speak(reply.text, lang.tts, state.voiceRate);
    } catch (e) {
      setError(explainError(e));
    } finally {
      setPartial(null);
      setBusy(false);
    }
  };

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    const history: ChatTurn[] = [...turns, { role: 'user', text: t }];
    setTurns(history);
    setText('');
    ask(history);
  };
  const reset = () => { stopSpeaking(); setTurns([]); setError(''); save([]); };
  const mic = () => {
    if (listening) { stopRef.current(); return; }
    setListening(true);
    stopRef.current = listen(lang.tts, (t) => setText((cur) => (cur ? `${cur} ${t}` : t)), () => setListening(false));
  };

  if (!state.apiKey) {
    return (
      <section className="card center">
        <div className="big-emoji">💬</div>
        <h3>Discuter avec Claude</h3>
        <p className="hint">Claude joue un interlocuteur natif, vous répond à voix haute et corrige vos phrases. Il faut d'abord ajouter votre clé API Claude.</p>
        <button className="btn" onClick={onSettings}>Ouvrir les réglages</button>
      </section>
    );
  }

  const shown = partial ? [...turns, partial] : turns;
  // Après une erreur, le dernier message est celui de l'élève : on propose de relancer.
  const pending = !busy && turns.length > 0 && turns[turns.length - 1].role === 'user';

  return (
    <div className="chat">
      <div className="row gap">
        <select className="input grow" value={scenario} disabled={busy} onChange={(e) => { setScenario(e.target.value); setTurns([]); save([], e.target.value); }}>
          {SCENARIOS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn ghost" onClick={reset} disabled={busy || !turns.length}>Effacer</button>
      </div>

      <div className="msgs">
        {!shown.length && (
          <div className="center">
            <p className="hint">Écrivez en {lang.name.toLowerCase()} (ou en français si vous bloquez), ou laissez Claude commencer.</p>
            <button className="btn" disabled={busy} onClick={() => ask([])}>Claude commence</button>
          </div>
        )}
        {shown.map((t, i) => (
          <div key={i} className={`msg ${t.role}`}>
            {t.fix && <div className="fix">✏️ {t.fix}</div>}
            <div className="bubble">
              <span className="term">{t.text || '…'}</span>
              {t.role === 'assistant' && t.text && (
                <div className="msg-tools">
                  <button onClick={() => speak(t.text, lang.tts, state.voiceRate)}>🔊 Écouter</button>
                  {t.fr && <button onClick={() => setShowFr((m) => ({ ...m, [i]: !m[i] }))}>{showFr[i] ? 'Masquer' : 'Traduire'}</button>}
                </div>
              )}
              {showFr[i] && t.fr && <small className="block">{t.fr}</small>}
            </div>
          </div>
        ))}
        {busy && !partial && <div className="msg assistant"><div className="bubble">…</div></div>}
        {error && <p className="verdict ko">{error}</p>}
        {pending && <button className="btn ghost" onClick={() => ask(turns)}>Réessayer</button>}
        <div ref={endRef} />
      </div>

      <div className="composer">
        {dictationSupported() && (
          <button className={`icon-btn big${listening ? ' rec' : ''}`} aria-label="Dicter" onClick={mic}>🎤</button>
        )}
        <input
          className="input grow" value={text} placeholder={`Votre message en ${lang.name.toLowerCase()}…`}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="btn" disabled={busy || !text.trim()} onClick={send}>Envoyer</button>
      </div>
    </div>
  );
}
