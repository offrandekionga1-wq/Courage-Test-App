import { useMemo, useState } from 'react';
import { activeKey, shuffle, touchStreak, useStore } from '../store';
import { Empty, EnTag, GenerateBar, SearchField, SpeakBtn } from '../ui';
import { useActive, useT } from '../hooks';
import { useDict } from '../dict';
import { generateVerbs } from '../generate';
import { IconNext } from '../icons';
import type { Verb } from '../types';

type Mode = 'table' | 'quiz';

export function Conjugation({ onSettings }: { onSettings: () => void }) {
  const { state } = useStore();
  const { t, locale } = useT();
  const { lang, pack, verbs, loading } = useActive();
  const [mode, setMode] = useState<Mode>('table');

  return (
    <>
      <div className="seg">
        <button className={mode === 'table' ? 'on' : ''} onClick={() => setMode('table')}>{t('conj.table')}</button>
        <button className={mode === 'quiz' ? 'on' : ''} onClick={() => setMode('quiz')}>{t('conj.quiz')}</button>
      </div>

      {loading && !verbs.length && <Empty>{t('common.loading')}</Empty>}
      {!loading && !verbs.length && <Empty>{t('conj.empty')}</Empty>}
      {verbs.length > 0 && (mode === 'table' ? <Browse verbs={verbs} /> : <Quiz verbs={verbs} />)}

      <GenerateBar
        label={t('conj.generate')}
        onSettings={onSettings}
        run={async () => ({
          verbs: await generateVerbs({
            provider: state.provider, apiKey: activeKey(state), model: state.model,
            lang, level: state.level, pack, uiLang: locale,
          }),
        })}
      />
    </>
  );
}

function Browse({ verbs }: { verbs: Verb[] }) {
  const { t, locale } = useT();
  const { state } = useStore();
  const dict = useDict(state.active, locale);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [limit, setLimit] = useState(40);

  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return verbs;
    return verbs.filter((v) => v.infinitive.toLowerCase().includes(needle) || v.fr.toLowerCase().includes(needle));
  }, [verbs, q]);

  const current = verbs.find((v) => v.id === openId);
  if (current) return <Table verb={current} onBack={() => setOpenId(null)} />;

  return (
    <>
      <SearchField value={q} onChange={(v) => { setQ(v); setLimit(40); }} placeholder={t('conj.search')} />
      <section className="card">
        {found.slice(0, limit).map((v) => (
          <div key={v.id} className="word" onClick={() => setOpenId(v.id)}>
            <div className="word-main">
              <div className="grow">
                <b className="term">{v.infinitive}</b>
                {v.reading && <small className="block">{v.reading}</small>}
              </div>
              <span className="fr">{v.fr}{dict?.enGloss.has(v.id) && <EnTag />}</span>
              <span className="chev"><IconNext size={18} /></span>
            </div>
          </div>
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

function Table({ verb, onBack }: { verb: Verb; onBack: () => void }) {
  const { t } = useT();
  return (
    <>
      <button className="btn ghost" onClick={onBack} style={{ alignSelf: 'flex-start' }}>‹ {t('common.back')}</button>
      <section className="card">
        <div className="row gap">
          <div className="grow">
            <b className="term xl">{verb.infinitive}</b>
            {verb.reading && <small className="block">{verb.reading}</small>}
            <small className="block">{verb.fr}</small>
          </div>
          <SpeakBtn text={verb.infinitive} big />
        </div>
        {verb.note && <p className="hint">{verb.note}</p>}
      </section>
      {verb.tenses.map((tense) => (
        <section key={tense.name} className="card tense">
          <h4>{tense.name}</h4>
          <dl className="forms">
            {tense.forms.map((f, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <dt>{f.label}</dt>
                <dd>{f.form}{f.reading ? <small> {f.reading}</small> : null}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}

/** Quiz : on donne un verbe, un temps et une personne, l'élève choisit la bonne forme. */
function Quiz({ verbs }: { verbs: Verb[] }) {
  const { update } = useStore();
  const { t } = useT();
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });

  const q = useMemo(() => {
    // On cherche un verbe dont un temps a au moins deux formes distinctes, et des leurres
    // pris dans le même tableau : les erreurs plausibles sont les plus instructives.
    for (let attempt = 0; attempt < 30; attempt++) {
      const v = verbs[Math.floor(Math.random() * verbs.length)];
      const tense = v.tenses[Math.floor(Math.random() * v.tenses.length)];
      if (!tense || tense.forms.length < 2) continue;
      const idx = Math.floor(Math.random() * tense.forms.length);
      const good = tense.forms[idx];
      const pool = [...new Set(tense.forms.filter((_, i) => i !== idx).map((f) => f.form))].filter((f) => f !== good.form);
      const others = shuffle(pool).slice(0, 3);
      if (others.length < 2) continue;
      const choices = shuffle([good.form, ...others]);
      return { verb: v, tense: tense.name, person: good.label, choices, answer: choices.indexOf(good.form) };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verbs, round]);

  if (!q) return <Empty>{t('conj.empty')}</Empty>;
  const done = picked !== null;

  return (
    <>
      <p className="progress">{t('phrases.score')} : {score.ok} / {score.n}</p>
      <section className="card">
        <p>{t('conj.question', { verb: q.verb.infinitive, tense: q.tense, person: q.person })}</p>
        <small>{q.verb.fr}</small>
      </section>
      <section className="choices">
        {q.choices.map((c, i) => (
          <button
            key={c + i}
            className={`choice${done && i === q.answer ? ' ok' : ''}${done && i === picked && i !== q.answer ? ' ko' : ''}`}
            disabled={done}
            onClick={() => {
              setPicked(i);
              setScore((p) => ({ ok: p.ok + (i === q.answer ? 1 : 0), n: p.n + 1 }));
              update(touchStreak);
            }}
          >{c}</button>
        ))}
      </section>
      {done && <button className="btn full" onClick={() => { setPicked(null); setRound(round + 1); }}>{t('vocab.next')}</button>}
    </>
  );
}
