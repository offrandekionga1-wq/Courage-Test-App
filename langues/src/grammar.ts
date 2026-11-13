import { useEffect, useMemo, useState } from 'react';
import type { Lesson, Phrase, QuizItem } from './types';
import { resolveFile } from './explain';
import type { T } from './i18n';

/** Programme de grammaire produit par scripts/build-grammar-points.py. */
interface RawPoint {
  k: string; l: string;
  /** Titre et règle, par langue d'explication. */
  tx: Record<string, [string, string]>;
  /** Exemples : phrase, traductions par langue, lecture. */
  ex: [string, Record<string, string>, string][];
  cloze: boolean;
}
interface TextFile { v: 2; points: RawPoint[] }
interface PointsFile { v: 1; p: Record<string, { o: string[]; s: [string, string, string, string][] }> }

const textFiles = import.meta.glob<TextFile>('./dict/[a-z][a-z]-grammar-text.json', { import: 'default' });
const pointFiles = import.meta.glob<PointsFile>('./dict/[a-z][a-z]-[a-z][a-z]-points.json', { import: 'default' });

export const hasGrammarPoints = (code: string) => `./dict/${code}-grammar-text.json` in textFiles;

/** Remplace la première occurrence de la forme cherchée par un blanc. */
function blank(text: string, word: string): string {
  const i = text.indexOf(word);
  return i < 0 ? text : `${text.slice(0, i)}＿＿＿${text.slice(i + word.length)}`;
}

function cloze(rows: [string, string, string, string][], options: string[], t: T): QuizItem[] {
  const out: QuizItem[] = [];
  rows.slice(0, 6).forEach(([text, tr, , word], n) => {
    const others = options.filter((o) => o.toLowerCase() !== word.toLowerCase());
    if (others.length < 2 || !text.includes(word)) return;
    const picks = [0, 1, 2].map((k) => others[(n + k * 2) % others.length]);
    const set = [...new Set(picks)].slice(0, 3);
    const answer = n % (set.length + 1);
    const choices = [...set.slice(0, answer), word, ...set.slice(answer)];
    out.push({ q: `${t('quiz.fill')}\n${blank(text, word)}\n${tr}`, choices, answer });
  });
  return out;
}

/**
 * Règles de grammaire de la langue étudiée, expliquées en français ou en anglais (les seules
 * langues rédigées), avec des phrases Tatoeba qui illustrent chaque règle et des exercices à trous
 * bâtis sur elles. Traductions des phrases : dans la langue de l'apprenant, sinon en repli.
 */
export function useGrammarPoints(code: string, locale: string, t: T): Lesson[] | undefined {
  const [state, setState] = useState<{ key: string; text: TextFile | null; pts: PointsFile | null; explain: string }>();
  const key = `${code}|${locale}`;
  useEffect(() => {
    let live = true;
    const tl = textFiles[`./dict/${code}-grammar-text.json`];
    if (!tl) { setState({ key, text: null, pts: null, explain: '' }); return; }
    const found = resolveFile(pointFiles, code, locale, (c, x) => `./dict/${c}-${x}-points.json`);
    Promise.all([tl(), found ? pointFiles[found[1]]() : Promise.resolve(null)])
      .then(([text, pts]) => live && setState({ key, text, pts, explain: found?.[0] ?? '' }))
      .catch(() => live && setState({ key, text: null, pts: null, explain: '' }));
    return () => { live = false; };
  }, [code, locale, key]);
  return useMemo(() => {
    if (state?.key !== key) return undefined;
    if (!state.text) return [];
    return state.text.points.map((p): Lesson => {
      // Règle dans la langue de l'apprenant ; à défaut, en anglais (puis en français).
      const lang = p.tx[locale] ? locale : p.tx.en ? 'en' : 'fr';
      const [title, body] = p.tx[lang];
      const m = state.pts?.p[p.k];
      const examples: Phrase[] = p.ex.map(([text, tr, reading]) => ({
        text, fr: tr[locale] ?? tr[lang] ?? tr.en ?? '', reading: reading || undefined, en: !tr[locale] && locale !== 'fr',
      }));
      const matched: Phrase[] = (m?.s ?? []).map(([text, tr, reading]) => ({ text, fr: tr, reading: reading || undefined }));
      const seen = new Set(examples.map((e) => e.text));
      return {
        id: `${code}:g:${p.k}`,
        kind: 'grammar',
        title,
        level: p.l,
        cefr: p.l,
        intro: '',
        sections: body.split('\n').map((para) => ({ heading: '', body: para })),
        phrases: [...examples, ...matched.filter((x) => !seen.has(x.text))],
        quiz: m ? cloze(m.s, m.o, t) : [],
        explain: lang === locale ? undefined : lang,
      };
    });
  }, [state, key, locale, code, t]);
}
