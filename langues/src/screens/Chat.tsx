import { useEffect, useRef, useState } from 'react';
import { activeKey, touchStreak, useStore } from '../store';
import { useActive, useT } from '../hooks';
import { chat, explainError, SCENARIOS } from '../generate';
import { term, toKey } from '../terms';
import { dictationSupported, listen, speak, stopSpeaking } from '../tts';
import { IconChat, IconMic, IconNext, IconPen, IconSpeaker } from '../icons';
import type { ChatTurn } from '../types';

export function Chat({ onSettings }: { onSettings: () => void }) {
  const { state, update } = useStore();
  const { t, locale } = useT();
  const { lang } = useActive();
  const saved = state.chats[lang.code];
  const key = activeKey(state);
  const [scenario, setScenario] = useState(toKey(saved?.scenario ?? SCENARIOS[0]));
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

  const save = (next: ChatTurn[], sc = scenario) =>
    update((s) => touchStreak({ ...s, chats: { ...s.chats, [lang.code]: { scenario: sc, turns: next } } }));

  const ask = async (history: ChatTurn[]) => {
    setBusy(true);
    setError('');
    try {
      const reply = await chat({
        provider: state.provider, apiKey: key, model: state.model,
        lang, level: state.level, scenario, turns: history, uiLang: locale,
      }, setPartial);
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
    const value = text.trim();
    if (!value || busy) return;
    const history: ChatTurn[] = [...turns, { role: 'user', text: value }];
    setTurns(history);
    setText('');
    ask(history);
  };
  const reset = () => { stopSpeaking(); setTurns([]); setError(''); save([]); };
  const mic = () => {
    if (listening) { stopRef.current(); return; }
    setListening(true);
    stopRef.current = listen(lang.tts, (s) => setText((cur) => (cur ? `${cur} ${s}` : s)), () => setListening(false));
  };

  if (!key) {
    return (
      <section className="card center">
        <span className="icon-btn big"><IconChat size={26} /></span>
        <h3>{t('nav.chat')}</h3>
        <p className="hint">{t('chat.needKey')}</p>
        <button className="btn" onClick={onSettings}>{t('nav.settings')}</button>
      </section>
    );
  }

  const shown = partial ? [...turns, partial] : turns;
  // Après une erreur, le dernier message est celui de l'élève : on propose de relancer.
  const pending = !busy && turns.length > 0 && turns[turns.length - 1].role === 'user';

  return (
    <div className="chat">
      <div className="row gap">
        <select
          className="input grow" value={scenario} disabled={busy}
          onChange={(e) => { setScenario(e.target.value); setTurns([]); save([], e.target.value); }}
        >
          {SCENARIOS.map((s) => <option key={s} value={s}>{term(s, locale)}</option>)}
        </select>
        <button className="btn ghost sm" onClick={reset} disabled={busy || !turns.length}>{t('chat.newChat')}</button>
      </div>

      {!shown.length && (
        <section className="card center">
          <p className="hint">{t('chat.placeholder')}</p>
          <button className="btn" disabled={busy} onClick={() => ask([])}>{t('practice.start')}</button>
        </section>
      )}

      {shown.map((turn, i) => (
        <div key={i} className="chat">
          {turn.fix && <div className="fix"><IconPen size={14} /> {turn.fix}</div>}
          <div className={`bubble ${turn.role === 'user' ? 'me' : 'them'}`}>
            <span>{turn.text || '…'}</span>
            {turn.role === 'assistant' && turn.text && (
              <div className="row gap" style={{ marginTop: 6 }}>
                <button className="icon-btn" aria-label={t('chat.listen')} onClick={() => speak(turn.text, lang.tts, state.voiceRate)}>
                  <IconSpeaker size={18} />
                </button>
                {turn.fr && (
                  <button className="btn ghost sm" onClick={() => setShowFr((m) => ({ ...m, [i]: !m[i] }))}>
                    {showFr[i] ? t('common.close') : t('lessons.translateWithAI').split(' ')[0]}
                  </button>
                )}
              </div>
            )}
            {showFr[i] && turn.fr && <div className="tr">{turn.fr}</div>}
          </div>
        </div>
      ))}

      {busy && !partial && <div className="bubble them">{t('chat.thinking')}</div>}
      {error && <p className="verdict ko">{error}</p>}
      {pending && <button className="btn ghost" onClick={() => ask(turns)}>{t('common.retry')}</button>}
      <div ref={endRef} />

      <div className="composer">
        {dictationSupported() && (
          <button className="icon-btn big" aria-label={t('chat.send')} onClick={mic} style={listening ? { color: 'var(--ko)' } : undefined}>
            <IconMic size={22} />
          </button>
        )}
        <input
          className="input grow" value={text} placeholder={t('chat.placeholder')}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="btn" disabled={busy || !text.trim()} onClick={send} aria-label={t('chat.send')}>
          <IconNext size={20} />
        </button>
      </div>
    </div>
  );
}
