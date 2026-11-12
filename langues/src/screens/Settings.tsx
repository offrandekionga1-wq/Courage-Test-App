import { useEffect, useRef, useState } from 'react';
import { allLanguages, DEFAULT_MODEL, getLanguage, getPack, mergeExtra, useStore } from '../store';
import { BUILTIN_LANGUAGES, SUGGESTED_LANGUAGES } from '../data';
import { explainError, generateUpdate } from '../claude';
import { hasVoice, speak, ttsSupported } from '../tts';
import type { AppState, Language } from '../types';

const LEVELS = ['Débutant', 'Élémentaire', 'Intermédiaire', 'Avancé'];
const MODELS: [string, string][] = [
  ['claude-opus-5-5', 'Claude Opus 5.5 (recommandé)'],
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (plus rapide)'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 (le moins cher)'],
];

export function Settings() {
  const { state, update } = useStore();
  const set = (patch: Partial<AppState>) => update((s) => ({ ...s, ...patch }));
  const langs = allLanguages(state);
  const active = getLanguage(state, state.active);

  // La liste des voix arrive de façon asynchrone sur certains téléphones.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!ttsSupported()) return;
    const on = () => tick((n) => n + 1);
    window.speechSynthesis.addEventListener('voiceschanged', on);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', on);
  }, []);

  const toggle = (code: string) => update((s) => {
    const on = s.learning.includes(code);
    if (on && s.learning.length === 1) return s; // il faut garder au moins une langue
    const learning = on ? s.learning.filter((c) => c !== code) : [...s.learning, code];
    return { ...s, learning, active: learning.includes(s.active) ? s.active : learning[0] };
  });

  // Ajouter une langue
  const available = SUGGESTED_LANGUAGES.filter((l) => !langs.some((x) => x.code === l.code));
  const [pick, setPick] = useState('');
  const [custom, setCustom] = useState({ name: '', tts: '' });
  const add = (l: Language) => update((s) => ({
    ...s, customLanguages: [...s.customLanguages, l], learning: [...s.learning, l.code], active: l.code,
  }));
  const addPicked = () => {
    const l = available.find((x) => x.code === pick);
    if (l) { add(l); setPick(''); }
  };
  const addCustom = () => {
    const name = custom.name.trim();
    if (!name) return;
    const tts = custom.tts.trim() || name.slice(0, 2).toLowerCase();
    let code = tts.split('-')[0].toLowerCase();
    while (langs.some((l) => l.code === code)) code += 'x';
    add({ code, name, native: name, flag: '🌐', tts });
    setCustom({ name: '', tts: '' });
  };
  const remove = (code: string) => {
    if (!confirm('Supprimer cette langue et tout son contenu généré ?')) return;
    update((s) => {
      const learning = s.learning.filter((c) => c !== code);
      const { [code]: _e, ...extra } = s.extra;
      const { [code]: _c, ...chats } = s.chats;
      const safe = learning.length ? learning : ['en'];
      return { ...s, customLanguages: s.customLanguages.filter((l) => l.code !== code), learning: safe, extra, chats, active: s.active === code ? safe[0] : s.active };
    });
  };

  // Mise à jour par Claude
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const runUpdate = async () => {
    setMsg('');
    setBusy('Démarrage…');
    const code = state.active;
    try {
      const add = await generateUpdate(
        { apiKey: state.apiKey, model: state.model, lang: active, level: state.level, pack: getPack(state, code) },
        setBusy,
      );
      update((s) => mergeExtra(s, code, add));
      setMsg(`Ajouté en ${active.name.toLowerCase()} : ${add.words?.length ?? 0} mots, ${add.verbs?.length ?? 0} verbes, ${add.lessons?.length ?? 0} leçon.`);
    } catch (e) {
      setMsg(explainError(e));
    } finally {
      setBusy('');
    }
  };

  // Sauvegarde
  const fileRef = useRef<HTMLInputElement>(null);
  const exportData = () => {
    const { apiKey: _k, ...rest } = state; // la clé API ne sort jamais du téléphone
    const url = URL.createObjectURL(new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyglotte-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importData = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.version !== 1 || !Array.isArray(data.learning)) throw new Error();
      update((s) => ({ ...s, ...data, apiKey: s.apiKey }));
      setMsg('Sauvegarde restaurée.');
    } catch {
      setMsg("Ce fichier n'est pas une sauvegarde Polyglotte valide.");
    }
  };
  const resetAll = () => {
    if (!confirm('Effacer toute la progression et tout le contenu généré ? Cette action est définitive.')) return;
    localStorage.removeItem('polyglotte.v1');
    location.reload();
  };

  const last = state.lastUpdate[state.active];
  const extra = state.extra[state.active];

  return (
    <>
      <section className="card">
        <h3>Mes langues</h3>
        {langs.map((l) => {
          const builtin = BUILTIN_LANGUAGES.some((b) => b.code === l.code);
          return (
            <div key={l.code} className="form">
              <label className="grow row gap">
                <input type="checkbox" checked={state.learning.includes(l.code)} onChange={() => toggle(l.code)} />
                <span>{l.flag} {l.name} <small>{l.native}</small></span>
              </label>
              {ttsSupported() && <small title="Voix installée sur ce téléphone">{hasVoice(l.tts) ? '🔊' : '🔇'}</small>}
              {!builtin && <button className="icon-btn" aria-label="Supprimer" onClick={() => remove(l.code)}>🗑️</button>}
            </div>
          );
        })}
        <p className="hint">🔊 voix disponible sur ce téléphone · 🔇 voix à installer dans les réglages de synthèse vocale du téléphone.</p>
      </section>

      <section className="card">
        <h3>Ajouter une langue</h3>
        <div className="row gap">
          <select className="input grow" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choisir…</option>
            {available.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
          </select>
          <button className="btn" disabled={!pick} onClick={addPicked}>Ajouter</button>
        </div>
        <p className="hint">Ou une autre langue :</p>
        <div className="row gap wrap">
          <input className="input grow" placeholder="Nom (ex. Wolof)" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          <input className="input code" placeholder="Code (ex. wo)" value={custom.tts} onChange={(e) => setCustom({ ...custom, tts: e.target.value })} />
          <button className="btn" disabled={!custom.name.trim()} onClick={addCustom}>Ajouter</button>
        </div>
        <p className="hint">Le contenu d'une langue ajoutée est créé par Claude (section ci-dessous).</p>
      </section>

      <section className="card">
        <h3>Claude</h3>
        <label className="field">Clé API
          <input className="input" type="password" autoComplete="off" placeholder="sk-ant-…" value={state.apiKey} onChange={(e) => set({ apiKey: e.target.value.trim() })} />
        </label>
        <p className="hint">Créez une clé sur console.anthropic.com. Elle est enregistrée uniquement sur ce téléphone et envoyée seulement à l'API d'Anthropic. L'usage est facturé sur votre compte Anthropic.</p>
        <label className="field">Modèle
          <select className="input" value={MODELS.some(([m]) => m === state.model) ? state.model : DEFAULT_MODEL} onChange={(e) => set({ model: e.target.value })}>
            {MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="field">Mon niveau
          <select className="input" value={state.level} onChange={(e) => set({ level: e.target.value })}>
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label className="row gap check">
          <input type="checkbox" checked={state.autoUpdate} onChange={(e) => set({ autoUpdate: e.target.checked })} />
          <span>Mise à jour automatique : de nouveaux mots chaque jour à l'ouverture de l'appli</span>
        </label>
        <button className="btn full" disabled={!state.apiKey || !!busy} onClick={runUpdate}>
          {busy ? `⏳ ${busy}` : `✨ Générer du contenu en ${active.name.toLowerCase()}`}
        </button>
        <p className="hint">
          {extra ? `Contenu généré : ${extra.words.length} mots, ${extra.verbs.length} verbes, ${extra.lessons.length} leçons. ` : ''}
          {last ? `Dernière mise à jour : ${new Date(last).toLocaleDateString('fr-FR')}.` : ''}
        </p>
        {msg && <p className="verdict">{msg}</p>}
      </section>

      <section className="card">
        <h3>Voix</h3>
        <label className="field">Vitesse : {state.voiceRate.toFixed(1)}
          <input type="range" min="0.5" max="1.3" step="0.1" value={state.voiceRate} onChange={(e) => set({ voiceRate: Number(e.target.value) })} />
        </label>
        <button className="btn ghost" onClick={() => speak(getPack(state, state.active).words[0]?.term ?? active.native, active.tts, state.voiceRate)}>
          🔊 Tester la voix ({active.name.toLowerCase()})
        </button>
      </section>

      <section className="card">
        <h3>Mes données</h3>
        <p className="hint">Tout est enregistré sur ce téléphone. Exportez une sauvegarde pour changer d'appareil.</p>
        <div className="row gap wrap">
          <button className="btn ghost" onClick={exportData}>Exporter</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>Importer</button>
          <button className="btn warn" onClick={resetAll}>Tout effacer</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { importData(e.target.files?.[0]); e.target.value = ''; }} />
      </section>
    </>
  );
}
