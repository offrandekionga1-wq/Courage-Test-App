// Voix : moteur natif d'Android dans l'appli installée (plugin Capacitor), synthèse du navigateur sinon.
// Une appli ne peut pas installer seule une voix : elle détecte celles qui manquent et ouvre
// l'écran d'installation du téléphone, où une seule touche suffit.
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech, QueueStrategy } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export const isNative = () => Capacitor.isNativePlatform();

// ───────────── Navigateur (secours) ─────────────
let voices: SpeechSynthesisVoice[] = [];
const refresh = () => { voices = window.speechSynthesis?.getVoices() ?? []; };
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refresh();
  window.speechSynthesis.addEventListener('voiceschanged', refresh);
}
const norm = (s: string) => s.toLowerCase().replace('_', '-');

function findWebVoice(tag: string): SpeechSynthesisVoice | undefined {
  const t = norm(tag);
  const base = t.split('-')[0];
  const aliases = base === 'fil' || base === 'tl' ? ['fil', 'tl'] : [base];
  const match = voices.filter((v) => aliases.includes(norm(v.lang).split('-')[0]));
  return match.find((v) => norm(v.lang) === t) ?? match.find((v) => v.localService) ?? match[0];
}

const webTts = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// ───────────── API commune ─────────────
export const ttsSupported = () => isNative() || webTts();

/** Les étiquettes régionales varient selon le moteur : on essaie la demandée, puis la langue seule. */
const variants = (tag: string) => {
  const base = tag.split('-')[0];
  return [...new Set([tag, base, ...(base === 'fil' ? ['tl-PH', 'tl'] : [])])];
};

export async function voiceAvailable(tag: string): Promise<boolean> {
  if (isNative()) {
    for (const lang of variants(tag)) {
      try { if ((await TextToSpeech.isLanguageSupported({ lang })).supported) return true; } catch { /* essai suivant */ }
    }
    return false;
  }
  return !!findWebVoice(tag);
}

export async function speak(text: string, tag: string, rate = 0.9): Promise<void> {
  if (!text.trim()) return;
  if (isNative()) {
    let lang = tag;
    for (const v of variants(tag)) {
      try { if ((await TextToSpeech.isLanguageSupported({ lang: v })).supported) { lang = v; break; } } catch { /* ignore */ }
    }
    try { await TextToSpeech.speak({ text, lang, rate, queueStrategy: QueueStrategy.Flush }); } catch { /* voix absente */ }
    return;
  }
  if (!webTts()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = findWebVoice(tag);
  if (v) u.voice = v;
  u.lang = v?.lang ?? tag;
  u.rate = rate;
  synth.speak(u);
}

export function stopSpeaking() {
  if (isNative()) TextToSpeech.stop().catch(() => {});
  else if (webTts()) window.speechSynthesis.cancel();
}

/** Ouvre l'écran d'installation des voix du téléphone (Android). */
export async function openVoiceInstall(): Promise<boolean> {
  if (!isNative()) return false;
  try { await TextToSpeech.openInstall(); return true; } catch { return false; }
}

/** Indique, pour chaque langue, si une voix est installée (undefined = en cours de vérification). */
export function useVoiceStatus(tags: string[]): Record<string, boolean | undefined> {
  const key = tags.join(',');
  const [status, setStatus] = useState<Record<string, boolean | undefined>>({});
  useEffect(() => {
    let live = true;
    const run = () => tags.forEach((t) => voiceAvailable(t).then((ok) => live && setStatus((s) => ({ ...s, [t]: ok }))));
    run();
    window.addEventListener('focus', run); // au retour de l'écran d'installation
    document.addEventListener('visibilitychange', run);
    if (webTts()) window.speechSynthesis.addEventListener('voiceschanged', run);
    return () => {
      live = false;
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', run);
      if (webTts()) window.speechSynthesis.removeEventListener('voiceschanged', run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return status;
}

// ───────────── Dictée ─────────────
type WebRec = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
};
const WebRecCtor = (): (new () => WebRec) | undefined => {
  const w = window as unknown as { SpeechRecognition?: new () => WebRec; webkitSpeechRecognition?: new () => WebRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
export const dictationSupported = () => isNative() || (typeof window !== 'undefined' && !!WebRecCtor());

export function listen(tag: string, onText: (t: string) => void, onEnd: () => void): () => void {
  if (isNative()) {
    (async () => {
      try {
        const perm = await SpeechRecognition.requestPermissions();
        if (perm.speechRecognition !== 'granted') return;
        const res = await SpeechRecognition.start({ language: tag, maxResults: 1, popup: false, partialResults: false });
        if (res.matches?.[0]) onText(res.matches[0]);
      } catch { /* refus ou aucun son capté */ } finally { onEnd(); }
    })();
    return () => { SpeechRecognition.stop().catch(() => {}); };
  }
  const C = WebRecCtor();
  if (!C) { onEnd(); return () => {}; }
  const r = new C();
  r.lang = tag;
  r.interimResults = false;
  r.continuous = false;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  r.onend = onEnd;
  r.onerror = onEnd;
  r.start();
  return () => r.stop();
}
