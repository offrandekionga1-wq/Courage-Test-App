import { useMemo, useState } from 'react';
import { review, shuffle, touchStreak, useStore } from '../store';
import { useDict, type Dict, type DictSentence } from '../dict';
import { Empty, SearchField, Sentence, SpeakBtn } from '../ui';
import { plainText, readingWorthShowing } from '../ruby';
import { useActive, useT } from '../hooks';

type Mode = 'list' | 'quiz';

export function Phrases() {
  const { lang } = useActive();
  const { t } = useT();
  const dict = useDict(lang.code);
  const [mode, setMode] = useState<Mode>('list');

  if (dict === undefined) return <Empty>{t('phrases.loading')}</Empty>;
  if (!dict || !dict.sentences.length) return <Empty>{t('phrases.empty')}</Empty>;

  return (
    <>
      <div className="seg">
        <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>{t('phrases.list')}</button>
        <button className={mode === 'quiz' ? 'on' : ''} onClick={() => setMode('quiz')}>{t('phrases.quiz')}</button>
      </div>
      {mode === 'list' ? <List dict={dict} /> : <Quiz dict={dict} />}
      <p className="hint">{t('phrases.credit')}</p>
    </>
  );
}

function SentenceCard({ s, dict, open, onToggle }: { s: DictSentence; dict: Dict; open: boolean; onToggle: () => void }) {
  const { t } = useT();
  return (
    <div className="word" onClick={onToggle}>
      <div className="word-main">
        <div className="grow">
          <Sentence text={s[0]} reading={s[3]} className="term" />
          {readingWorthShowing(s[0], s[3]) && <small className="block">{s[3]}</small>}
        </div>
        <SpeakBtn text={s[0]} />
      </div>
      {open && (
        <div className="example">
          <span>{s[1]}</span>
          <small>
            {t('phrases.sentenceNo')}{' '}
            <a href={`https://tatoeba.org/sentences/show/${s[2]}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{s[2]}</a>
            {' · '}{t('phrases.authors')} : {dict.authors[s[4]]}{s[5] !== s[4] ? `, ${dict.authors[s[5]]}` : ''}
          </small>
        </div>
      )}
    </div>
  );
}

function List({ dict }: { dict: Dict }) {
  const { t } = useT();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [limit, setLimit] = useState(60);
  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle
      ? dict.sentences.filter((s) => s[0].toLowerCase().includes(needle) || s[1].toLowerCase().includes(needle)
          || plainText(s[3] ?? '').toLowerCase().includes(needle))
      : dict.sentences;
  }, [dict, q]);
  return (
    <>
      <SearchField
        value={q}
        onChange={(v) => { setQ(v); setLimit(60); }}
        placeholder={t('phrases.search', { n: dict.sentences.length.toLocaleString() })}
      />
      <section className="card">
        {found.slice(0, limit).map((s) => (
          <SentenceCard key={s[2]} s={s} dict={dict} open={open === s[2]} onToggle={() => setOpen(open === s[2] ? null : s[2])} />
        ))}
        {!found.length && <p className="hint">{t('vocab.noResult')}</p>}
      </section>
      {found.length > limit && (
        <button className="btn ghost full" onClick={() => setLimit(limit + 100)}>
          {t('vocab.more', { n: (found.length - limit).toLocaleString() })}
        </button>
      )}
    </>
  );
}

/** Quiz : la phrase est lue, on choisit sa traduction parmi quatre. */
function Quiz({ dict }: { dict: Dict }) {
  const { update } = useStore();
  const { t } = useT();
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
      <p className="progress">{t('phrases.score')} : {score.ok} / {score.n}</p>
      <section className="card flash">
        <Sentence text={q.s[0]} reading={q.s[3]} className="term" />
        {readingWorthShowing(q.s[0], q.s[3]) && <small>{q.s[3]}</small>}
        <SpeakBtn text={q.s[0]} big />
      </section>
      <section className="choices">
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
      </section>
      {done && <button className="btn full" onClick={() => { setPicked(null); setRound(round + 1); }}>{t('vocab.next')}</button>}
    </>
  );
}
