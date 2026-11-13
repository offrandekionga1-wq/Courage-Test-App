import { allLanguages, useStore } from '../store';
import { useSentences } from '../sentences';
import { useT } from '../hooks';
import { IconWarn } from '../icons';
import { localName } from '../terms';
import meta from '../dict/meta.json';
import courses from '../dict/courses-meta.json';

interface Pair { words: number; words_en: number; sentences: number; sentences_other: number; authors: number }
interface Stat { verbs: number; pairs: Record<string, Pair> }

const SOURCES: { name: string; use: string; useEn: string; licence: string; url: string; licenceUrl: string }[] = [
  {
    name: 'Tatoeba',
    use: "Phrases d'exemple et leurs traductions. Chaque phrase est attribuée à ses auteurs.", useEn: 'Example sentences and their translations. Every sentence is credited to its authors.',
    licence: 'CC BY 2.0 FR', url: 'https://tatoeba.org',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/fr/',
  },
  {
    name: 'Wikivoyage',
    use: 'Guides de conversation : les leçons par situation, avec leur prononciation.', useEn: 'Phrasebooks: lessons by situation, with pronunciation.',
    licence: 'CC BY-SA 4.0', url: 'https://fr.wikivoyage.org',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  },
  {
    name: 'JMdict (EDRDG)',
    use: 'Dictionnaire japonais, définitions françaises.', useEn: 'Japanese dictionary, with definitions in several languages.',
    licence: 'CC BY-SA 4.0', url: 'https://www.edrdg.org/jmdict/j_jmdict.html',
    licenceUrl: 'https://www.edrdg.org/edrdg/licence.html',
  },
  {
    name: 'CC-CEDICT',
    use: 'Dictionnaire chinois : pinyin et définitions anglaises de repli.', useEn: 'Chinese dictionary: pinyin and English definitions as a fallback.',
    licence: 'CC BY-SA 4.0', url: 'https://cc-cedict.org',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  },
  {
    name: 'Wiktionnaire et Wiktionary (via kaikki.org)',
    use: 'Définitions des mots, tables de traduction (définitions dans votre langue) et tables de conjugaison.', useEn: 'Word definitions, translation tables (definitions in your language) and conjugation tables.',
    licence: 'CC BY-SA 4.0 et GFDL', url: 'https://fr.wiktionary.org',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  },
  {
    name: 'FrequencyWords (hermitdave)',
    use: 'Classement des mots par fréquence.', useEn: 'Word ranking by frequency.',
    licence: 'CC BY-SA 4.0', url: 'https://github.com/hermitdave/FrequencyWords',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  },
];

export function Sources({ onBack }: { onBack: () => void }) {
  const { state } = useStore();
  const { t, locale } = useT();
  const langs = allLanguages(state);
  const dict = useSentences(state.active, locale);
  const stats = meta.stats as Record<string, Stat>;
  const courseStats = courses as Record<string, Record<string, { lessons: number; phrases: number }>>;
  const expl = locale === 'fr' ? 'fr' : 'en';

  return (
    <>
      <button className="btn ghost" onClick={onBack} style={{ alignSelf: 'flex-start' }}>‹ {t('common.back')}</button>

      <section className="card">
        <h3>{t('sources.title')}</h3>
        <p className="hint">{t('sources.intro')}</p>
        {SOURCES.map((s) => (
          <div key={s.name} className="word">
            <b><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a></b>
            <small className="block">{locale === 'fr' ? s.use : s.useEn}</small>
            <small className="block">
              {t('sources.licence')} : <a href={s.licenceUrl} target="_blank" rel="noreferrer">{s.licence}</a>
            </small>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>{t('sources.byLanguage')}</h3>
        <p className="hint">{t('sources.generatedOn', { date: meta.generated })}</p>
        {langs.filter((l) => stats[l.code]).map((l) => {
          const st = stats[l.code];
          const s = st.pairs[locale] ?? st.pairs[expl] ?? Object.values(st.pairs)[0];
          const c = courseStats[l.code]?.[expl];
          if (!s) return null;
          return (
            <div key={l.code} className="word">
              <b>{l.flag} {localName(l, locale)}</b>
              <small className="block">
                {s.words.toLocaleString()} {t('sources.words')}
                {s.words_en ? ` (${s.words_en.toLocaleString()} EN)` : ''}
                {' · '}{s.sentences.toLocaleString()} {t('sources.sentences')}
                {st.verbs ? ` · ${st.verbs} ${t('sources.verbs')}` : ''}
                {c ? ` · ${c.lessons} ${t('sources.lessons')}` : ''}
              </small>
            </div>
          );
        })}
        <p className="hint">{t('sources.englishNote')}</p>
        <p className="hint">{t('sources.contentLang')}</p>
      </section>

      <section className="card note">
        <h3><IconWarn size={16} /> {t('sources.handwritten')}</h3>
        <p className="hint">{t('sources.handwrittenNote')}</p>
      </section>

      {dict && dict.authors.length > 0 && (
        <section className="card">
          <h3>{t('sources.authorsOf', { n: dict.authors.length })}</h3>
          <details>
            <summary className="hint">{t('sources.showList')}</summary>
            <p className="hint">{[...dict.authors].sort((a, b) => a.localeCompare(b)).join(', ')}</p>
          </details>
        </section>
      )}
    </>
  );
}
