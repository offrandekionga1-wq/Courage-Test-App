import { allLanguages, useStore } from '../store';
import { useDict } from '../dict';
import meta from '../dict/meta.json';

const SOURCES: { name: string; use: string; licence: string; url: string; licenceUrl: string }[] = [
  { name: 'Tatoeba', use: "Phrases d'exemple et leurs traductions françaises. Chaque phrase est attribuée à ses auteurs.", licence: 'CC BY 2.0 FR', url: 'https://tatoeba.org', licenceUrl: 'https://creativecommons.org/licenses/by/2.0/fr/' },
  { name: 'JMdict (EDRDG)', use: 'Dictionnaire japonais, glosses françaises.', licence: 'CC BY-SA 4.0', url: 'https://www.edrdg.org/jmdict/j_jmdict.html', licenceUrl: 'https://www.edrdg.org/edrdg/licence.html' },
  { name: 'CC-CEDICT', use: 'Dictionnaire chinois : pinyin et glosses anglaises de repli.', licence: 'CC BY-SA 4.0', url: 'https://cc-cedict.org', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr' },
  { name: 'Wiktionnaire (kaikki.org / wiktextract)', use: 'Glosses françaises des mots.', licence: 'CC BY-SA 4.0 et GFDL', url: 'https://fr.wiktionary.org', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr' },
  { name: 'Wiktionary anglais (kaikki.org)', use: 'Glosses anglaises de repli, pour le lituanien et le tagalog uniquement.', licence: 'CC BY-SA 4.0 et GFDL', url: 'https://en.wiktionary.org', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr' },
  { name: 'FrequencyWords (hermitdave)', use: 'Classement des mots par fréquence.', licence: 'CC BY-SA 4.0', url: 'https://github.com/hermitdave/FrequencyWords', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr' },
];

export function Sources({ onBack }: { onBack: () => void }) {
  const { state } = useStore();
  const langs = allLanguages(state);
  const dict = useDict(state.active);
  const stats = meta.stats as Record<string, { words: number; words_en: number; sentences: number; authors: number }>;
  const link = (href: string, text: string) => <a href={href} target="_blank" rel="noreferrer">{text}</a>;

  return (
    <>
      <button className="btn ghost" onClick={onBack}>‹ Retour aux réglages</button>
      <section className="card">
        <h3>Sources et licences</h3>
        <p className="hint">
          Les mots et phrases intégrés viennent de projets libres. Les fichiers de données de l'appli sont des œuvres dérivées
          diffusées sous licence CC BY-SA 4.0. Le script qui les produit (<code>scripts/build-data.py</code>) et le fichier
          <code> CREDITS.md</code> sont dans le dépôt du projet.
        </p>
        {SOURCES.map((s) => (
          <div key={s.name} className="word">
            <b>{link(s.url, s.name)}</b>
            <small className="block">{s.use}</small>
            <small className="block">Licence : {link(s.licenceUrl, s.licence)}</small>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>Contenu par langue</h3>
        <p className="hint">Données générées le {meta.generated}.</p>
        {langs.filter((l) => stats[l.code]).map((l) => {
          const s = stats[l.code];
          return (
            <div key={l.code} className="row between small">
              <span style={{ whiteSpace: 'nowrap' }}>{l.flag} {l.name}</span>
              <span>{s.words} mots{s.words_en ? ` (dont ${s.words_en} en anglais)` : ''} · {s.sentences} phrases</span>
            </div>
          );
        })}
        <p className="hint">Les définitions marquées [EN] sont en anglais, faute d'entrée française. Ces contenus viennent de contributeurs bénévoles et n'ont pas tous été relus.</p>
      </section>

      <section className="card note">
        <b>Contenu écrit à la main</b>
        <p className="hint">
          Les mots de départ, conjugaisons, leçons et points de grammaire livrés avec l'appli ont été rédigés par Claude, sans relecture
          par des locuteurs natifs. C'est en particulier le cas du lituanien et du tagalog : à prendre avec prudence et à confronter à une
          source fiable.
        </p>
      </section>

      {dict && dict.authors.length > 0 && (
        <section className="card">
          <h3>Auteurs des phrases ({dict.authors.length})</h3>
          <p className="hint">Contributeurs Tatoeba des phrases de la langue en cours, que vous pouvez consulter sous « Phrases ».</p>
          <details>
            <summary>Afficher la liste</summary>
            <p className="hint">{[...dict.authors].sort((a, b) => a.localeCompare(b)).join(', ')}</p>
          </details>
        </section>
      )}
    </>
  );
}
