import { useEffect, useRef, useState } from 'react';
import { activeKey, allLanguages, getLanguage, getPack, isDue, isKnown, mergeExtra, useStore } from './store';
import { generateWords } from './generate';
import { hasDict, loadDict } from './dict';
import { hasCourse, loadCourse } from './course';
import { BUILTIN_LANGUAGES } from './data';
import { useActive, useT } from './hooks';
import { Vocab } from './screens/Vocab';
import { Phrases } from './screens/Phrases';
import { Conjugation } from './screens/Conjugation';
import { Lessons } from './screens/Lessons';
import { Practice } from './screens/Practice';
import { Chat } from './screens/Chat';
import { Settings } from './screens/Settings';
import { isNative, openVoiceInstall, useVoiceStatus } from './tts';
import { TAB_ICONS, IconFlame, IconNext, IconSettings, IconWarn } from './icons';
import type { Language } from './types';

export type Tab = 'home' | 'vocab' | 'phrases' | 'conj' | 'lessons' | 'practice' | 'chat' | 'settings';
const TABS: [Tab, string][] = [
  ['home', 'nav.home'],
  ['vocab', 'nav.vocab'],
  ['phrases', 'nav.phrases'],
  ['lessons', 'nav.lessons'],
  ['practice', 'nav.practice'],
  ['chat', 'nav.chat'],
];

export function App() {
  const { state, update } = useStore();
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('home');
  const [toast, setToast] = useState('');
  const [pickLang, setPickLang] = useState(false);
  const lang = getLanguage(state, state.active);
  const langs = allLanguages(state).filter((l) => state.learning.includes(l.code));

  // Mise à jour automatique : une fois par jour et par langue, l'IA ajoute de nouveaux mots.
  const running = useRef(false);
  useEffect(() => {
    const key = activeKey(state);
    const last = state.lastUpdate[state.active] ?? 0;
    if (!state.autoUpdate || !key || !navigator.onLine || running.current) return;
    if (Date.now() - last < 864e5) return;
    running.current = true;
    const code = state.active;
    generateWords({
      provider: state.provider, apiKey: key, model: state.model,
      lang, level: state.level, pack: getPack(state, code), uiLang: state.uiLang || 'fr',
    }, 10)
      .then((words) => {
        update((s) => mergeExtra(s, code, { words }));
        setToast(`+${words.length} · ${lang.name}`);
        setTimeout(() => setToast(''), 4000);
      })
      // Échec silencieux, mais on note la tentative pour ne pas relancer en boucle.
      .catch(() => update((s) => ({ ...s, lastUpdate: { ...s.lastUpdate, [code]: Date.now() } })))
      .finally(() => { running.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.autoUpdate, state.provider]);

  // Dans un navigateur, on récupère tous les dictionnaires en arrière-plan dès qu'on est en ligne,
  // pour que l'appli reste utilisable hors ligne ensuite. Dans l'APK, tout est déjà sur le téléphone.
  useEffect(() => {
    if (isNative() || !navigator.onLine) return;
    const id = setTimeout(() => {
      BUILTIN_LANGUAGES.forEach((l) => {
        if (hasDict(l.code)) loadDict(l.code);
        if (hasCourse(l.code)) loadCourse(l.code);
      });
    }, 4000);
    return () => clearTimeout(id);
  }, []);

  // Premier lancement sur Android : si des voix manquent, on propose d'ouvrir l'écran
  // d'installation du téléphone. Une application ne peut pas installer une voix elle-même.
  const voiceTags = langs.map((l) => l.tts);
  const voices = useVoiceStatus(voiceTags);
  const missingVoices = voiceTags.filter((tag) => voices[tag] === false);
  const askVoices = isNative() && !state.voiceAsked && missingVoices.length > 0;

  const goSettings = () => setTab('settings');

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>Polyglotte</h1>
          <button
            className="lang-pick grow"
            style={{ justifyContent: 'center', maxWidth: 'none' }}
            onClick={() => setPickLang(true)}
          >
            <span className="flag">{lang.flag}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang.name}</span>
            <span className="chev"><IconNext size={16} /></span>
          </button>
          <button className="icon-btn" aria-label={t('nav.settings')} onClick={goSettings}>
            <IconSettings size={21} />
          </button>
        </div>
      </header>

      {pickLang && (
        <LanguageSheet
          langs={langs}
          current={state.active}
          onPick={(code) => { update((s) => ({ ...s, active: code })); setPickLang(false); }}
          onClose={() => setPickLang(false)}
          onManage={() => { setPickLang(false); goSettings(); }}
        />
      )}

      {askVoices && (
        <div className="sheet-back" onClick={() => update((s) => ({ ...s, voiceAsked: true }))}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <h3>{t('settings.voice')}</h3>
            <p className="hint">
              {t('settings.missingVoices', {
                list: langs.filter((l) => voices[l.tts] === false).map((l) => l.name).join(', '),
              })}
            </p>
            <div className="row gap" style={{ marginTop: 12 }}>
              <button className="btn ghost grow" onClick={() => update((s) => ({ ...s, voiceAsked: true }))}>
                {t('common.cancel')}
              </button>
              <button
                className="btn grow"
                onClick={() => { openVoiceInstall(); update((s) => ({ ...s, voiceAsked: true })); }}
              >{t('settings.installVoices')}</button>
            </div>
          </div>
        </div>
      )}

      <main key={state.active + tab}>
        {tab === 'home' && <Home go={setTab} />}
        {tab === 'vocab' && <Vocab onSettings={goSettings} />}
        {tab === 'phrases' && <Phrases />}
        {tab === 'conj' && <Conjugation onSettings={goSettings} />}
        {tab === 'lessons' && <Lessons onSettings={goSettings} />}
        {tab === 'practice' && <Practice go={setTab} />}
        {tab === 'chat' && <Chat onSettings={goSettings} />}
        {tab === 'settings' && <Settings />}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav className="tabs">
        {TABS.map(([id, key]) => {
          const Icon = TAB_ICONS[id as keyof typeof TAB_ICONS];
          return (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              <span className="ic"><Icon size={21} /></span>
              <span>{t(key)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function LanguageSheet({ langs, current, onPick, onClose, onManage }: {
  langs: Language[];
  current: string;
  onPick: (code: string) => void;
  onClose: () => void;
  onManage: () => void;
}) {
  const { t } = useT();
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h3>{t('settings.language')}</h3>
        {langs.map((l) => (
          <button key={l.code} className={`sheet-item${l.code === current ? ' on' : ''}`} onClick={() => onPick(l.code)}>
            <span className="flag">{l.flag}</span>
            <span className="grow">{l.name}<small className="block">{l.native}</small></span>
          </button>
        ))}
        <button className="btn ghost full" style={{ marginTop: 10 }} onClick={onManage}>{t('settings.myLanguages')}</button>
      </div>
    </div>
  );
}

function Home({ go }: { go: (t: Tab) => void }) {
  const { state } = useStore();
  const { t } = useT();
  const { lang, words, verbs, lessons, loading } = useActive();
  const known = words.filter((w) => isKnown(state, w.id)).length;
  const due = words.filter((w) => isDue(state, w.id)).length;
  const done = lessons.filter((l) => state.lessonsDone[l.id]).length;
  const pct = words.length ? Math.round((known / words.length) * 100) : 0;
  const voice = useVoiceStatus([lang.tts])[lang.tts];
  const empty = !loading && !words.length && !verbs.length && !lessons.length;
  const nf = (n: number) => n.toLocaleString();

  const tiles: [Tab, string, string][] = [
    ['vocab', 'nav.vocab', t('home.vocabSub', { n: nf(words.length) })],
    ['phrases', 'nav.phrases', t('home.phrasesSub')],
    ['conj', 'nav.conj', t('home.conjSub', { n: nf(verbs.length) })],
    ['lessons', 'nav.lessons', t('home.lessonsSub', { n: nf(lessons.length) })],
    ['practice', 'nav.practice', t('home.practiceSub')],
    ['chat', 'nav.chat', t('home.chatSub')],
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-flag">{lang.flag}</div>
        <div className="grow">
          <h2>{lang.name}</h2>
          <p>{lang.native}</p>
        </div>
        <div className="streak">
          <IconFlame size={18} />
          <b>{state.streak.count}</b>
          <span>{t(state.streak.count > 1 ? 'home.streak_many' : 'home.streak_one')}</span>
        </div>
      </section>

      <section className="card">
        <div className="row between"><span>{t('home.mastered')}</span><b>{nf(known)} / {nf(words.length)}</b></div>
        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        <div className="row between hint"><span>{t('home.lessonsDone')}</span><b>{done} / {lessons.length}</b></div>
      </section>

      {words.length > 0 && (
        <button className="btn full" onClick={() => go('vocab')}>
          {due ? t('home.reviewDue', { n: nf(Math.min(due, 15)) }) : t('home.allReviewed')}
        </button>
      )}

      {voice === false && (
        <section className="card note">
          <div className="row gap"><IconWarn size={18} /><span>{t('home.noVoice', { lang: lang.name })}</span></div>
          {isNative()
            ? <button className="btn full" onClick={openVoiceInstall}>{t('home.installVoice')}</button>
            : <small>{t('home.installVoiceWeb')}</small>}
        </section>
      )}

      {empty && <section className="card note">{t('home.empty')}</section>}

      <section className="tiles">
        {tiles.map(([id, key, sub]) => {
          const Icon = TAB_ICONS[id as keyof typeof TAB_ICONS];
          return (
            <button key={id} onClick={() => go(id)}>
              <span className="ic"><Icon size={17} /></span>
              <b>{t(key)}</b>
              <small>{sub}</small>
            </button>
          );
        })}
      </section>
    </>
  );
}
