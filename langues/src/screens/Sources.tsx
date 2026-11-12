import { allLanguages, useStore } from '../store';
import { useSentences } from '../sentences';
import { useT } from '../hooks';
import { IconWarn } from '../icons';
import meta from '../dict/meta.json';
import courses from '../dict/courses-meta.json';

interface Stat { words: number; words_en: number; sentences: number; verbs: number; authors: number }

const SOURCES: { name: string; use: string; licence: string; url: string; licenceUrl: string }[] = [
  {
    name: 'Tatoeba',
    use: "Phrases d'exemple et leurs traductions. Chaque phrase est attribuée à ses auteurs.",
    licence: 'CC BY 2.0 FR', url: 'https://tatoeba.org',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/fr/',
  },
  {
    name: 'Wikivoyage',
    use: 'Guides de conversation : les leçons par situation, avec leur prononciation.',
    licence: 'CC BY-SA 4.0', url: 'https://fr.wikivoyage.org',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  },
  {
    name: 'JMdict (EDRDG)',
    use: 'Dictionnaire japonais, définitions françaises.',
    licence: 'CC BY-SA 4.0', url: 'https://www.edrdg.org/jmdict/j_jmdict.html',
    licenceUrl: 'https://www.edrdg.org/edrdg/licence.html',
  },
  {
    name: 'CC-CEDICT',
    use: 'Dictionnaire chinois : pinyin et définitions anglaises de repli.',
    licence: 'CC BY-SA 4.0', url: 'https://cc-cedict.org',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  },
  {
    name: 'Wiktionnaire et Wiktionary (via kaikki.org)',
    use: 'Définitions des mots et tables de conjugaison.',
    licence: 'CC BY-SA 4.0 et GFDL', url: 'https://fr.wiktionary.org',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  },
  {
    name: 'FrequencyWords (hermitdave)',
    use: 'Classement des mots par fréquence.',
    licence: 'CC BY-SA 4.0', url: 'https://github.com/hermitdave/FrequencyWords',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  },
];

export function Sources({ onBack }: { onBack: () => void }) {
  const { state } = useStore();
  const { t } = useT();
  const langs = allLanguages(state);
  const dict = useSentences(state.active);
  const stats = meta.stats as Record<string, Stat>;
  const courseStats = courses as Record<string, { lessons: number; phrases: number }>;

  return (
    <>
      <button className="btn ghost" onClick={onBack} style={{ alignSelf: 'flex-start' }}>‹ {t('common.back')}</button>

      <section className="card">
        <h3>{t('sources.title')}</h3>
        <p className="hint">{t('sources.intro')}</p>
        {SOURCES.map((s) => (
          <div key={s.name} className="word">
            <b><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a></b>
            <small className="block">{s.use}</small>
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
          const s = stats[l.code];
          const c = courseStats[l.code];
          return (
            <div key={l.code} className="word">
              <b>{l.flag} {l.name}</b>
              <small className="block">
                {s.words.toLocaleString()} {t('sources.words')}
                {s.words_en ? ` (${s.words_en.toLocaleString()} EN)` : ''}
                {' · '}{s.sentences.toLocaleString()} {t('sources.sentences')}
                {s.verbs ? ` · ${s.verbs} ${t('sources.verbs')}` : ''}
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
