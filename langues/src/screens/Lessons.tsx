import { useState } from 'react';
import { touchStreak, useStore } from '../store';
import { Empty, GenerateBar, SpeakBtn, useActive } from '../ui';
import { generateLesson } from '../claude';
import type { Lesson } from '../types';

export function Lessons({ onSettings }: { onSettings: () => void }) {
  const { state } = useStore();
  const { lang, pack } = useActive();
  const [openId, setOpenId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [tab, setTab] = useState<'lesson' | 'grammar'>('lesson');
  const grammarTab = tab === 'grammar';
  const shown = pack.lessons.filter((l) => (l.kind === 'grammar') === grammarTab);
  const current = pack.lessons.find((l) => l.id === openId);

  if (current) return <LessonView lesson={current} onBack={() => setOpenId(null)} />;

  return (
    <>
      <div className="seg">
        <button className={!grammarTab ? 'on' : ''} onClick={() => setTab('lesson')}>Leçons</button>
        <button className={grammarTab ? 'on' : ''} onClick={() => setTab('grammar')}>Grammaire</button>
      </div>
      {!shown.length && <Empty>{grammarTab ? 'Aucun point de grammaire' : 'Aucune leçon'} pour cette langue. Générez-en avec Claude ci-dessous.</Empty>}
      {shown.map((l, i) => (
        <button key={l.id} className="card lesson-item" onClick={() => setOpenId(l.id)}>
          <span className={`num${state.lessonsDone[l.id] ? ' ok' : ''}`}>{state.lessonsDone[l.id] ? '✓' : i + 1}</span>
          <div className="grow left">
            <b>{l.title}</b>
            <small className="block">{l.level}</small>
          </div>
          <span className="chev">›</span>
        </button>
      ))}
      <section className="card">
        <input className="input" placeholder={grammarTab ? 'Sujet souhaité (facultatif) : le subjonctif…' : 'Sujet souhaité (facultatif) : au marché…'} value={topic} onChange={(e) => setTopic(e.target.value)} />
        <GenerateBar
          label={grammarTab ? 'Nouveau point de grammaire avec Claude' : 'Nouvelle leçon avec Claude'}
          onSettings={onSettings}
          run={async () => ({
            lessons: [await generateLesson({ apiKey: state.apiKey, model: state.model, lang, level: state.level, pack, topic: topic.trim() || undefined }, grammarTab ? 'grammar' : undefined)],
          })}
        />
      </section>
    </>
  );
}

function LessonView({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const { update } = useStore();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const total = lesson.quiz.length;
  const answered = Object.keys(answers).length;
  const right = lesson.quiz.filter((q, i) => answers[i] === q.answer).length;

  const pick = (qi: number, ci: number) => {
    if (answers[qi] !== undefined) return;
    const next = { ...answers, [qi]: ci };
    setAnswers(next);
    if (Object.keys(next).length === total) {
      update((s) => touchStreak({ ...s, lessonsDone: { ...s.lessonsDone, [lesson.id]: true } }));
    }
  };
  const finish = () => {
    update((s) => touchStreak({ ...s, lessonsDone: { ...s.lessonsDone, [lesson.id]: true } }));
    onBack();
  };

  return (
    <>
      <button className="back" onClick={onBack}>‹ Leçons</button>
      <section className="card">
        <small>{lesson.level}</small>
        <h2>{lesson.title}</h2>
        <p>{lesson.intro}</p>
      </section>
      {lesson.sections.map((s) => (
        <section key={s.heading} className="card">
          <h3>{s.heading}</h3>
          <p>{s.body}</p>
        </section>
      ))}
      {lesson.phrases.length > 0 && (
        <section className="card">
          <h3>Phrases à écouter</h3>
          {lesson.phrases.map((p, i) => (
            <div key={i} className="form">
              <div className="grow">
                <b className="term">{p.text}</b>
                {p.reading && <small>{p.reading}</small>}
                <span className="fr block">{p.fr}</span>
              </div>
              <SpeakBtn text={p.text} />
            </div>
          ))}
        </section>
      )}
      {total > 0 && (
        <section className="card">
          <h3>Quiz</h3>
          {lesson.quiz.map((q, qi) => (
            <div key={qi} className="quiz-q">
              <p><b>{qi + 1}.</b> {q.q}</p>
              <div className="choices">
                {q.choices.map((c, ci) => {
                  const a = answers[qi];
                  const cls = a === undefined ? '' : ci === q.answer ? ' ok' : ci === a ? ' ko' : '';
                  return <button key={ci} className={`choice${cls}`} onClick={() => pick(qi, ci)}>{c}</button>;
                })}
              </div>
            </div>
          ))}
          {answered === total && <p className="verdict ok">Résultat : {right} / {total}</p>}
        </section>
      )}
      <button className="btn full" onClick={finish}>Terminer la leçon</button>
    </>
  );
}
