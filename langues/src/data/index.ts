import type { Language, Pack } from '../types';
import { en } from './en';
import { ja } from './ja';
import { lt } from './lt';
import { zh } from './zh';
import { tl } from './tl';
import { words } from './concepts';
import { EXTRA } from './extra';
import { GRAMMAR as GRAMMAR_BASE } from './grammar';
import { es, de, it, pt, esExtra, deExtra, itExtra, ptExtra, esGrammar, deGrammar, itGrammar, ptGrammar } from './more';

const EXTRA_ALL: Record<string, string[]> = { ...EXTRA, es: esExtra, de: deExtra, it: itExtra, pt: ptExtra };
const GRAMMAR: Record<string, Pack['lessons']> = { ...GRAMMAR_BASE, es: esGrammar, de: deGrammar, it: itGrammar, pt: ptGrammar };

export const BUILTIN_LANGUAGES: Language[] = [
  { code: 'en', name: 'Anglais', native: 'English', flag: '🇬🇧', tts: 'en-GB' },
  { code: 'ja', name: 'Japonais', native: '日本語', flag: '🇯🇵', tts: 'ja-JP' },
  { code: 'lt', name: 'Lituanien', native: 'Lietuvių', flag: '🇱🇹', tts: 'lt-LT' },
  { code: 'zh', name: 'Chinois', native: '中文', flag: '🇨🇳', tts: 'zh-CN' },
  { code: 'tl', name: 'Tagalog', native: 'Tagalog', flag: '🇵🇭', tts: 'fil-PH' },
  { code: 'es', name: 'Espagnol', native: 'Español', flag: '🇪🇸', tts: 'es-ES' },
  { code: 'de', name: 'Allemand', native: 'Deutsch', flag: '🇩🇪', tts: 'de-DE' },
  { code: 'it', name: 'Italien', native: 'Italiano', flag: '🇮🇹', tts: 'it-IT' },
  { code: 'pt', name: 'Portugais', native: 'Português', flag: '🇵🇹', tts: 'pt-PT' },
];

/** Langues proposées dans « Ajouter une langue » (leur contenu est généré par Claude). */
export const SUGGESTED_LANGUAGES: Language[] = [
  { code: 'ko', name: 'Coréen', native: '한국어', flag: '🇰🇷', tts: 'ko-KR' },
  { code: 'ru', name: 'Russe', native: 'Русский', flag: '🇷🇺', tts: 'ru-RU' },
  { code: 'ar', name: 'Arabe', native: 'العربية', flag: '🇸🇦', tts: 'ar-SA' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', flag: '🇹🇿', tts: 'sw-TZ' },
  { code: 'ln', name: 'Lingala', native: 'Lingála', flag: '🇨🇩', tts: 'ln-CD' },
  { code: 'nl', name: 'Néerlandais', native: 'Nederlands', flag: '🇳🇱', tts: 'nl-NL' },
  { code: 'tr', name: 'Turc', native: 'Türkçe', flag: '🇹🇷', tts: 'tr-TR' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', tts: 'hi-IN' },
  { code: 'vi', name: 'Vietnamien', native: 'Tiếng Việt', flag: '🇻🇳', tts: 'vi-VN' },
  { code: 'th', name: 'Thaï', native: 'ไทย', flag: '🇹🇭', tts: 'th-TH' },
  { code: 'pl', name: 'Polonais', native: 'Polski', flag: '🇵🇱', tts: 'pl-PL' },
];

/** Garde des identifiants uniques (un même mot peut avoir deux sens : « araw » = jour et soleil). */
function uniqueIds<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.map((x) => {
    let id = x.id;
    for (let n = 2; seen.has(id); n++) id = `${x.id}#${n}`;
    seen.add(id);
    return id === x.id ? x : { ...x, id };
  });
}

function build(code: string, base: Pack): Pack {
  return {
    words: uniqueIds([...base.words, ...words(code, EXTRA_ALL[code] ?? [], base.words.length)]),
    verbs: base.verbs,
    lessons: [...base.lessons, ...(GRAMMAR[code] ?? [])],
  };
}

export const SEED: Record<string, Pack> = {
  en: build('en', en), ja: build('ja', ja), lt: build('lt', lt), zh: build('zh', zh), tl: build('tl', tl),
  es: build('es', es), de: build('de', de), it: build('it', it), pt: build('pt', pt),
};
