// Voix : synthèse vocale du téléphone (voix neuronales sur Android et iOS récents).
// Fonctionne hors ligne quand la voix de la langue est installée sur l'appareil.

let voices: SpeechSynthesisVoice[] = [];
const refresh = () => { voices = window.speechSynthesis?.getVoices() ?? []; };
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refresh();
  window.speechSynthesis.addEventListener('voiceschanged', refresh);
}

const norm = (s: string) => s.toLowerCase().replace('_', '-');

export function findVoice(tag: string): SpeechSynthesisVoice | undefined {
  const t = norm(tag);
  const base = t.split('-')[0];
  const aliases = base === 'fil' || base === 'tl' ? ['fil', 'tl'] : [base];
  const match = voices.filter((v) => aliases.includes(norm(v.lang).split('-')[0]));
  return match.find((v) => norm(v.lang) === t) ?? match.find((v) => v.localService) ?? match[0];
}

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const hasVoice = (tag: string) => !!findVoice(tag);

export function speak(text: string, tag: string, rate = 0.9) {
  if (!ttsSupported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = findVoice(tag);
  if (v) u.voice = v;
  u.lang = v?.lang ?? tag;
  u.rate = rate;
  synth.speak(u);
}

export const stopSpeaking = () => ttsSupported() && window.speechSynthesis.cancel();

// Reconnaissance vocale (dictée), quand le navigateur la propose.
type Rec = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
};
const RecCtor = (): (new () => Rec) | undefined => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
export const dictationSupported = () => typeof window !== 'undefined' && !!RecCtor();

export function listen(tag: string, onText: (t: string) => void, onEnd: () => void): () => void {
  const C = RecCtor();
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
