import { useMemo, useState } from 'react';
import { shuffle, touchStreak, useStore } from '../store';
import { Empty, GenerateBar, SpeakBtn, useActive } from '../ui';
import { generateVerbs } from '../claude';
import type { Verb } from '../types';

export function Conjugation({ onSettings }: { onSettings: () => void }) {
  const { state } = useStore();
  const { lang, pack } = useActive();
  const [quiz, setQuiz] = useState(false);
  const [open, setOpen] = useState<string | null>(pack.verbs[0]?.id ?? null);

  return (
    <>
      <div className="seg">
        <button className={!quiz ? 'on' : ''} onClick={() => setQuiz(false)}>Tableaux</button>
        <button className={quiz ? 'on' : ''} onClick={() => setQuiz(true)} disabled={!pack.verbs.length}>S'entraîner</button>
      </div>

      {!pack.verbs.length && <Empty>Aucun verbe pour cette langue. Générez-en avec Claude ci-dessous.</Empty>}

      {quiz ? <Quiz verbs={pack.verbs} /> : (
        <>
          {pack.verbs.map((v) => (
            <section key={v.id} className="card">
              <div className="row between" onClick={() => setOpen(open === v.id ? null : v.id)}>
                <div>
                  <b className="term">{v.infinitive}</b> <span className="fr">{v.fr}</span>
                  {v.reading && <small className="block">{v.reading}</small>}
                </div>
                <span className="chev">{open === v.id ? '▾' : '▸'}</span>
              </div>
              {open === v.id && (
                <>
                  {v.note && <p className="note">{v.note}</p>}
                  {v.tenses.map((t) => (
                    <div key={t.name} className="tense">
                      <h4>{t.name}</h4>
                      {t.forms.map((f, i) => (
                        <div key={i} className="form">
                          <span className="label">{f.label}</span>
                          <div className="grow">
                            <b className="term">{f.form}</b>
                            {f.reading && <small>{f.reading}</small>}
                          </div>
                          <SpeakBtn text={f.form} />
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </section>
          ))}
          <GenerateBar
            label="Nouveaux verbes avec Claude"
            onSettings={onSettings}
            run={async () => ({ verbs: await generateVerbs({ apiKey: state.apiKey, model: state.model, lang, level: state.level, pack }) })}
          />
        </>
      )}
    </>
  );
}

interface Q { verb: Verb; tense: string; label: string; answer: string; choices: string[] }

function makeQuestion(verbs: Verb[]): Q {
  const verb = verbs[Math.floor(Math.random() * verbs.length)];
  const tense = verb.tenses[Math.floor(Math.random() * verb.tenses.length)];
  const form = tense.forms[Math.floor(Math.random() * tense.forms.length)];
  // Les mauvaises réponses viennent des autres formes du même verbe, puis des autres verbes.
  const own = verb.tenses.flatMap((t) => t.forms.map((f) => f.form));
  const others = verbs.filter((v) => v !== verb).flatMap((v) => v.tenses.flatMap((t) => t.forms.map((f) => f.form)));
  const pool = [...new Set([...shuffle(own), ...shuffle(others)])].filter((f) => f !== form.form);
  return { verb, tense: tense.name, label: form.label, answer: form.form, choices: shuffle([form.form, ...pool.slice(0, 3)]) };
}

function Quiz({ verbs }: { verbs: Verb[] }) {
  const { update } = useStore();
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const q = useMemo(() => makeQuestion(verbs), [n]);

  const pick = (c: string) => {
    if (picked) return;
    setPicked(c);
    if (c === q.answer) setScore((s) => s + 1);
    update(touchStreak);
  };
  return (
    <>
      <p className="progress">Score : {score} / {n + (picked ? 1 : 0)}</p>
      <section className="card center">
        <p className="hint">{q.tense}</p>
        <b className="xl term">{q.verb.infinitive}</b>
        <span className="fr">{q.verb.fr}</span>
        <p className="ask">{q.label} …</p>
        <div className="choices">
          {q.choices.map((c) => (
            <button
              key={c}
              className={`choice term${picked ? (c === q.answer ? ' ok' : c === picked ? ' ko' : '') : ''}`}
              onClick={() => pick(c)}
            >{c}</button>
          ))}
        </div>
        {picked && (
          <div className="row gap full">
            <SpeakBtn text={q.answer} />
            <button className="btn grow" onClick={() => { setPicked(null); setN((x) => x + 1); }}>Suivant</button>
          </div>
        )}
      </section>
    </>
  );
}
