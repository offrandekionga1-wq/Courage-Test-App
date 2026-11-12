import { useMemo, useState } from 'react';
import { review, shuffle, touchStreak, useStore } from '../store';
import { useDict, type Dict, type DictSentence } from '../dict';
import { Empty, SpeakBtn, useActive } from '../ui';

type Mode = 'list' | 'quiz';

export function Phrases() {
  const { lang } = useActive();
  const dict = useDict(lang.code);
  const [mode, setMode] = useState<Mode>('list');

  if (dict === undefined) return <Empty>Chargement des phrases…</Empty>;
  if (!dict || !dict.sentences.length) {
    return <Empty>Pas de phrases d'exemple intégrées pour le {lang.name.toLowerCase()}. Les leçons contiennent des phrases à écouter.</Empty>;
  }
  return (
    <>
      <div className="seg">
        <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>Liste</button>
        <button className={mode === 'quiz' ? 'on' : ''} onClick={() => setMode('quiz')}>Quiz</button>
      </div>
      {mode === 'list' ? <List dict={dict} /> : <Quiz dict={dict} />}
      <p className="hint">Phrases de <a href="https://tatoeba.org" target="_blank" rel="noreferrer">Tatoeba</a> (CC BY 2.0 FR). Ouvrez une phrase pour voir ses auteurs. Détails dans Réglages → Sources et licences.</p>
    </>
  );
}

function SentenceCard({ s, dict, open, onToggle }: { s: DictSentence; dict: Dict; open: boolean; onToggle: () => void }) {
  return (
    <div className="word" onClick={onToggle}>
      <div className="word-main">
        <div className="grow">
          <b className="term">{s[0]}</b>
          {s[3] && <small>{s[3]}</small>}
        </div>
        <SpeakBtn text={s[0]} />
      </div>
      {open && (
        <div className="example">
          <span>{s[1]}</span>
          <small>
            Phrase n° <a href={`https://tatoeba.org/sentences/show/${s[2]}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{s[2]}</a>
            {' '}· auteurs : {dict.authors[s[4]]}{s[5] !== s[4] ? ` et ${dict.authors[s[5]]}` : ''}
          </small>
        </div>
      )}
    </div>
  );
}

function List({ dict }: { dict: Dict }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [limit, setLimit] = useState(60);
  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? dict.sentences.filter((s) => s[0].toLowerCase().includes(t) || s[1].toLowerCase().includes(t)) : dict.sentences;
  }, [dict, q]);
  return (
    <>
      <input className="input" placeholder={`Chercher parmi ${dict.sentences.length} phrases…`} value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} />
      <section className="card">
        {found.slice(0, limit).map((s) => (
          <SentenceCard key={s[2]} s={s} dict={dict} open={open === s[2]} onToggle={() => setOpen(open === s[2] ? null : s[2])} />
        ))}
        {!found.length && <p className="hint">Aucun résultat.</p>}
        {found.length > limit && <button className="btn ghost full" onClick={() => setLimit(limit + 60)}>Plus de phrases ({found.length - limit})</button>}
      </section>
    </>
  );
}

/** Quiz : on lit la phrase, on choisit sa traduction française parmi quatre. */
function Quiz({ dict }: { dict: Dict }) {
  const { update } = useStore();
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const q = useMemo(() => {
    const s = dict.sentences[Math.floor(Math.random() * dict.sentences.length)];
    const others = shuffle(dict.sentences.filter((x) => x !== s && Math.abs(x[1].length - s[1].length) < 25)).slice(0, 3);
    const choices = shuffle([s, ...others]);
    return { s, choices, answer: choices.indexOf(s) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dict, round]);
  const done = picked !== null;
  return (
    <>
      <p className="progress">Score : {score.ok} / {score.n}</p>
      <section className="card flash">
        <b className="term xl" style={{ fontSize: '1.3rem' }}>{q.s[0]}</b>
        {q.s[3] && <small>{q.s[3]}</small>}
        <SpeakBtn text={q.s[0]} big />
      </section>
      <section className="card choices">
        {q.choices.map((c, i) => (
          <button
            key={c[2]}
            className={`choice${done && i === q.answer ? ' ok' : ''}${done && i === picked && i !== q.answer ? ' ko' : ''}`}
            disabled={done}
            onClick={() => {
              setPicked(i);
              setScore((p) => ({ ok: p.ok + (i === q.answer ? 1 : 0), n: p.n + 1 }));
              update((s) => review(touchStreak(s), `phrase:${q.s[2]}`, i === q.answer));
            }}
          >{c[1]}</button>
        ))}
        {done && <button className="btn full" onClick={() => { setPicked(null); setRound(round + 1); }}>Suivante</button>}
      </section>
    </>
  );
}
