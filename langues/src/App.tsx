import { useEffect, useRef, useState } from 'react';
import { allLanguages, getLanguage, getPack, isKnown, mergeExtra, useStore } from './store';
import { generateWords } from './claude';
import { Vocab } from './screens/Vocab';
import { Conjugation } from './screens/Conjugation';
import { Lessons } from './screens/Lessons';
import { Chat } from './screens/Chat';
import { Settings } from './screens/Settings';
import { isNative, openVoiceInstall, useVoiceStatus } from './tts';

type Tab = 'home' | 'vocab' | 'conj' | 'lessons' | 'chat' | 'settings';
const TABS: [Tab, string, string][] = [
  ['home', '🏠', 'Accueil'],
  ['vocab', '🔤', 'Vocabulaire'],
  ['conj', '🔁', 'Conjugaison'],
  ['lessons', '📖', 'Leçons'],
  ['chat', '💬', 'Discussion'],
];

export function App() {
  const { state, update } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [toast, setToast] = useState('');
  const lang = getLanguage(state, state.active);
  const langs = allLanguages(state).filter((l) => state.learning.includes(l.code));

  // Mise à jour automatique : une fois par jour et par langue, Claude ajoute de nouveaux mots.
  const running = useRef(false);
  useEffect(() => {
    const last = state.lastUpdate[state.active] ?? 0;
    if (!state.autoUpdate || !state.apiKey || !navigator.onLine || running.current) return;
    if (Date.now() - last < 864e5) return;
    running.current = true;
    const code = state.active;
    generateWords({ apiKey: state.apiKey, model: state.model, lang, level: state.level, pack: getPack(state, code) }, 10)
      .then((words) => {
        update((s) => mergeExtra(s, code, { words }));
        setToast(`${words.length} nouveaux mots en ${lang.name.toLowerCase()}`);
        setTimeout(() => setToast(''), 4000);
      })
      // Échec silencieux, mais on note la tentative pour ne pas relancer en boucle.
      .catch(() => update((s) => ({ ...s, lastUpdate: { ...s.lastUpdate, [code]: Date.now() } })))
      .finally(() => { running.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.autoUpdate, state.apiKey]);

  const goSettings = () => setTab('settings');

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>Polyglotte</h1>
          <button className="icon-btn" aria-label="Réglages" onClick={goSettings}>⚙️</button>
        </div>
        <div className="langs">
          {langs.map((l) => (
            <button
              key={l.code}
              className={`chip${l.code === state.active ? ' on' : ''}`}
              onClick={() => update((s) => ({ ...s, active: l.code }))}
            >{l.flag} {l.name}</button>
          ))}
          <button className="chip add" onClick={goSettings}>＋ Langue</button>
        </div>
      </header>

      <main key={state.active + tab}>
        {tab === 'home' && <Home go={setTab} />}
        {tab === 'vocab' && <Vocab onSettings={goSettings} />}
        {tab === 'conj' && <Conjugation onSettings={goSettings} />}
        {tab === 'lessons' && <Lessons onSettings={goSettings} />}
        {tab === 'chat' && <Chat onSettings={goSettings} />}
        {tab === 'settings' && <Settings />}
      </main>

      {toast && <div className="toast">✨ {toast}</div>}

      <nav className="tabs">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Home({ go }: { go: (t: Tab) => void }) {
  const { state } = useStore();
  const lang = getLanguage(state, state.active);
  const pack = getPack(state, state.active);
  const known = pack.words.filter((w) => isKnown(state, w.id)).length;
  const done = pack.lessons.filter((l) => state.lessonsDone[l.id]).length;
  const pct = pack.words.length ? Math.round((known / pack.words.length) * 100) : 0;
  const voice = useVoiceStatus([lang.tts])[lang.tts];
  const empty = !pack.words.length && !pack.verbs.length && !pack.lessons.length;

  return (
    <>
      <section className="hero">
        <div className="hero-flag">{lang.flag}</div>
        <div>
          <h2>{lang.name}</h2>
          <p>{lang.native}</p>
        </div>
        <div className="streak"><b>{state.streak.count}</b><span>jour{state.streak.count > 1 ? 's' : ''} de suite</span></div>
      </section>

      <section className="card">
        <div className="row between"><span>Mots maîtrisés</span><b>{known} / {pack.words.length}</b></div>
        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        <div className="row between small"><span>Leçons terminées</span><b>{done} / {pack.lessons.length}</b></div>
      </section>

      {voice === false && (
        <section className="card note">
          🔇 Aucune voix pour le {lang.name.toLowerCase()} sur ce téléphone.
          {isNative()
            ? <button className="btn full" style={{ marginTop: 8 }} onClick={openVoiceInstall}>Installer la voix</button>
            : ' Installez-la dans les réglages de synthèse vocale.'}
        </section>
      )}

      {empty && (
        <section className="card note">
          Cette langue n'a pas encore de contenu. Ouvrez les réglages et lancez « Générer le contenu avec Claude ».
        </section>
      )}

      <section className="tiles">
        <button onClick={() => go('vocab')}><span>🔤</span><b>Vocabulaire</b><small>{pack.words.length} mots, écriture et tracé</small></button>
        <button onClick={() => go('conj')}><span>🔁</span><b>Conjugaison</b><small>{pack.verbs.length} verbes</small></button>
        <button onClick={() => go('lessons')}><span>📖</span><b>Leçons</b><small>{pack.lessons.length} leçons</small></button>
        <button onClick={() => go('chat')}><span>💬</span><b>Discussion</b><small>Parler avec Claude</small></button>
      </section>
    </>
  );
}
