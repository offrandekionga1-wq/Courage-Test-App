import type { Language, Pack } from '../types';
import { en } from './en';
import { ja } from './ja';
import { lt } from './lt';
import { zh } from './zh';
import { tl } from './tl';

export const BUILTIN_LANGUAGES: Language[] = [
  { code: 'en', name: 'Anglais', native: 'English', flag: '🇬🇧', tts: 'en-GB' },
  { code: 'ja', name: 'Japonais', native: '日本語', flag: '🇯🇵', tts: 'ja-JP' },
  { code: 'lt', name: 'Lituanien', native: 'Lietuvių', flag: '🇱🇹', tts: 'lt-LT' },
  { code: 'zh', name: 'Chinois', native: '中文', flag: '🇨🇳', tts: 'zh-CN' },
  { code: 'tl', name: 'Tagalog', native: 'Tagalog', flag: '🇵🇭', tts: 'fil-PH' },
];

/** Langues proposées dans « Ajouter une langue » (leur contenu est généré par Claude). */
export const SUGGESTED_LANGUAGES: Language[] = [
  { code: 'es', name: 'Espagnol', native: 'Español', flag: '🇪🇸', tts: 'es-ES' },
  { code: 'de', name: 'Allemand', native: 'Deutsch', flag: '🇩🇪', tts: 'de-DE' },
  { code: 'it', name: 'Italien', native: 'Italiano', flag: '🇮🇹', tts: 'it-IT' },
  { code: 'pt', name: 'Portugais', native: 'Português', flag: '🇵🇹', tts: 'pt-PT' },
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

export const SEED: Record<string, Pack> = { en, ja, lt, zh, tl };
