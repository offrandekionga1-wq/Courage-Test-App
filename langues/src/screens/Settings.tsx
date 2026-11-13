import { localName } from '../terms';
import { useRef, useState } from 'react';
import { activeKey, allLanguages, getLanguage, getPack, mergeExtra, useStore } from '../store';
import { BUILTIN_LANGUAGES, SUGGESTED_LANGUAGES } from '../data';
import { courseSteps, explainError, generateUpdate } from '../generate';
import { defaultModel, getProvider, PROVIDERS } from '../ai';
import { isNative, openVoiceInstall, speak, ttsSupported, useVoiceStatus } from '../tts';
import { UI_LANGUAGES, UNREVIEWED } from '../i18n';
import { useT } from '../hooks';
import { Sources } from './Sources';
import { IconDownload, IconPlus, IconSpark, IconTrash, IconUpload, IconWarn } from '../icons';
import type { AppState, Language } from '../types';

const LEVELS = ['Débutant', 'Élémentaire', 'Intermédiaire', 'Avancé'];

export function Settings() {
  const [sources, setSources] = useState(false);
  return sources ? <Sources onBack={() => setSources(false)} /> : <SettingsMain onSources={() => setSources(true)} />;
}

function SettingsMain({ onSources }: { onSources: () => void }) {
  const { state, update } = useStore();
  const { t, locale } = useT();
  const set = (patch: Partial<AppState>) => update((s) => ({ ...s, ...patch }));
  const langs = allLanguages(state);
  const active = getLanguage(state, state.active);
  const provider = getProvider(state.provider);
  const key = activeKey(state);

  const voice = useVoiceStatus(langs.map((l) => l.tts));
  const missing = langs.filter((l) => state.learning.includes(l.code) && voice[l.tts] === false);

  const [pick, setPick] = useState('');
  const [custom, setCustom] = useState({ name: '', tts: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [course, setCourse] = useState<{ i: number; n: number; label: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (code: string) => update((s) => {
    const on = s.learning.includes(code);
    if (on && s.learning.length === 1) return s; // il faut garder au moins une langue
    const learning = on ? s.learning.filter((c) => c !== code) : [...s.learning, code];
    return { ...s, learning, active: learning.includes(s.active) ? s.active : learning[0] };
  });

  const remove = (code: string) => update((s) => ({
    ...s,
    customLanguages: s.customLanguages.filter((l) => l.code !== code),
    learning: s.learning.filter((c) => c !== code),
    active: s.active === code ? (s.learning.find((c) => c !== code) ?? BUILTIN_LANGUAGES[0].code) : s.active,
  }));

  const addLanguage = (l: Language) => update((s) => ({
    ...s,
    customLanguages: [...s.customLanguages, l],
    learning: [...s.learning, l.code],
    active: l.code,
  }));

  const available = SUGGESTED_LANGUAGES.filter((l) => !langs.some((x) => x.code === l.code));

  const addPicked = () => {
    const l = available.find((x) => x.code === pick);
    if (l) { addLanguage(l); setPick(''); }
  };
  const addCustom = () => {
    const name = custom.name.trim();
    if (!name) return;
    const code = `x-${name.toLowerCase().replace(/\W+/g, '-')}`;
    addLanguage({ code, name, native: name, flag: '🌐', tts: custom.tts.trim() || 'en-US' });
    setCustom({ name: '', tts: '' });
  };

  const genOpts = () => ({
    provider: state.provider, apiKey: key, model: state.model,
    lang: active, level: state.level, pack: getPack(state, state.active),
    uiLang: state.uiLang || 'fr',
  });

  const runUpdate = async () => {
    setMsg('');
    setBusy(t('settings.generating'));
    const code = state.active;
    try {
      const add = await generateUpdate(genOpts(), setBusy);
      update((s) => mergeExtra(s, code, add));
      setMsg('✓');
    } catch (e) {
      setMsg(explainError(e));
    } finally {
      setBusy('');
    }
  };

  const runCourse = async () => {
    const steps = courseSteps();
    const code = state.active;
    const ctrl = new AbortController();
    abort.current = ctrl;
    setMsg('');
    try {
      for (const [i, step] of steps.entries()) {
        setCourse({ i, n: steps.length, label: step.label });
        const add = await step.run({ ...genOpts(), signal: ctrl.signal });
        update((s) => mergeExtra(s, code, add));   // chaque étape est enregistrée aussitôt
        if (ctrl.signal.aborted) break;
      }
      setMsg('✓');
    } catch (e) {
      setMsg(explainError(e));
    } finally {
      setCourse(null);
      abort.current = null;
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `polyglotte-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data && typeof data === 'object') update((s) => ({ ...s, ...data }));
      setMsg('✓');
    } catch {
      setMsg(t('common.error'));
    }
  };
  const resetAll = () => {
    if (confirm(t('settings.resetConfirm'))) {
      localStorage.clear();
      location.reload();
    }
  };

  return (
    <>
      <section className="card">
        <h3>{t('settings.appLanguage')}</h3>
        <select className="input" value={state.uiLang} onChange={(e) => set({ uiLang: e.target.value })}>
          <option value="">{t('settings.autoDetect')}</option>
          {UI_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
        </select>
        <p className="hint">{t('settings.appLanguageHint')}</p>
        {state.uiLang && state.uiLang !== 'fr' && UNREVIEWED.has(state.uiLang) && (
          <p className="hint"><IconWarn size={14} /> {t('sources.handwrittenNote').split('.')[0]}.</p>
        )}
      </section>

      <section className="card">
        <h3>{t('settings.myLanguages')}</h3>
        {langs.map((l) => {
          const builtin = BUILTIN_LANGUAGES.some((b) => b.code === l.code);
          return (
            <div key={l.code} className="form">
              <label className="grow row gap">
                <input type="checkbox" checked={state.learning.includes(l.code)} onChange={() => toggle(l.code)} />
                <span>{l.flag} {localName(l, locale)} <small>{l.native}</small></span>
              </label>
              {ttsSupported() && (
                <small title={voice[l.tts] ? t('settings.voiceInstalled') : t('settings.voiceMissing')}>
                  {voice[l.tts] === undefined ? '…' : voice[l.tts] ? '🔊' : '🔇'}
                </small>
              )}
              {!builtin && (
                <button className="icon-btn" aria-label={t('settings.remove')} onClick={() => remove(l.code)}>
                  <IconTrash size={18} />
                </button>
              )}
            </div>
          );
        })}
        {missing.length > 0 && (
          <div className="card note">
            <span>{t('settings.missingVoices', { list: missing.map((l) => localName(l, locale)).join(', ') })}</span>
            {isNative()
              ? <button className="btn full" onClick={openVoiceInstall}>{t('settings.installVoices')}</button>
              : <small>{t('home.installVoiceWeb')}</small>}
          </div>
        )}
      </section>

      <section className="card">
        <h3>{t('settings.addLanguage')}</h3>
        <div className="row gap">
          <select className="input grow" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">{t('settings.choose')}</option>
            {available.map((l) => <option key={l.code} value={l.code}>{l.flag} {localName(l, locale)}</option>)}
          </select>
          <button className="btn" disabled={!pick} onClick={addPicked}><IconPlus size={18} /></button>
        </div>
        <div className="row gap wrap">
          <input className="input grow" placeholder={t('settings.customName')} value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          <input className="input code" placeholder={t('settings.customCode')} value={custom.tts} onChange={(e) => setCustom({ ...custom, tts: e.target.value })} />
          <button className="btn" disabled={!custom.name.trim()} onClick={addCustom}>{t('settings.add')}</button>
        </div>
        <p className="hint">{t('settings.customHint')}</p>
      </section>

      <section className="card">
        <h3>{t('settings.ai')}</h3>
        <label className="field">{t('settings.provider')}
          <select
            className="input" value={state.provider}
            onChange={(e) => set({ provider: e.target.value, model: defaultModel(e.target.value) })}
          >
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field">{t('settings.apiKey')}
          <input
            className="input" type="password" autoComplete="off" placeholder={provider.keyHint} value={key}
            onChange={(e) => update((s) => ({ ...s, keys: { ...s.keys, [s.provider]: e.target.value.trim() } }))}
          />
        </label>
        <p className="hint">
          {t('settings.apiKeyHint')}{' '}
          <a href={provider.keyUrl} target="_blank" rel="noreferrer">{t('settings.getKey')}</a>
        </p>
        <label className="field">{t('settings.model')}
          <select
            className="input"
            value={provider.models.some(([m]) => m === state.model) ? state.model : provider.models[0][0]}
            onChange={(e) => set({ model: e.target.value })}
          >
            {provider.models.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="field">{t('settings.level')}
          <select className="input" value={state.level} onChange={(e) => set({ level: e.target.value })}>
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={state.autoUpdate} onChange={(e) => set({ autoUpdate: e.target.checked })} />
          <span>{t('settings.autoUpdate')}</span>
        </label>
        <button className="btn full" disabled={!key || !!busy} onClick={runUpdate}>
          <IconSpark size={18} /> {busy || t('settings.generate', { lang: localName(active, locale) })}
        </button>
        <button className="btn ghost full" disabled={!key || !!busy || !!course} onClick={runCourse}>
          {t('settings.generateCourse', { lang: localName(active, locale) })}
        </button>
        {course && (
          <>
            <div className="bar"><i style={{ width: `${(course.i / course.n) * 100}%` }} /></div>
            <p className="hint">{t('settings.step', { i: course.i + 1, n: course.n, label: course.label })}</p>
            <button className="btn warn full" onClick={() => abort.current?.abort()}>{t('settings.stop')}</button>
          </>
        )}
        <p className="hint">{t('settings.courseHint')}</p>
        {msg && <p className="verdict">{msg}</p>}
      </section>

      <section className="card">
        <h3>{t('settings.voice')}</h3>
        <label className="field">{t('settings.speed')} : {state.voiceRate.toFixed(1)}
          <input type="range" min="0.5" max="1.3" step="0.1" value={state.voiceRate} onChange={(e) => set({ voiceRate: Number(e.target.value) })} />
        </label>
        <button
          className="btn ghost"
          onClick={() => speak(getPack(state, state.active).words[0]?.term ?? active.native, active.tts, state.voiceRate)}
        >{t('settings.testVoice')}</button>
      </section>

      <section className="card">
        <h3>{t('settings.about')}</h3>
        <p className="hint">{t('settings.aboutHint')}</p>
        <button className="btn ghost" onClick={onSources}>{t('settings.sources')}</button>
      </section>

      <section className="card">
        <h3>{t('settings.data')}</h3>
        <p className="hint">{t('settings.dataHint')}</p>
        <div className="row gap wrap">
          <button className="btn ghost" onClick={exportData}><IconDownload size={18} /> {t('settings.export')}</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}><IconUpload size={18} /> {t('settings.import')}</button>
          <button className="btn warn" onClick={resetAll}>{t('settings.reset')}</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { importData(e.target.files?.[0]); e.target.value = ''; }} />
      </section>
    </>
  );
}
