import { useMemo, useState } from 'react';
import { activeKey, touchStreak, useStore } from '../store';
import { Empty, EnTag, GenerateBar, SpeakBtn } from '../ui';
import { useActive, useT } from '../hooks';
import { generateLesson, translatePhrases } from '../generate';
import { IconCheck, IconNext, IconSpark } from '../icons';
import type { Lesson, Phrase } from '../types';

type Kind = 'course' | 'lesson' | 'grammar';

export function Lessons({ onSettings }: { onSettings: () => void }) {
  const { state } = useStore();
  const { t } = useT();
  const { lang, pack, lessons, loading } = useActive();
  const [openId, setOpenId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [kind, setKind] = useState<Kind>('course');

  const shown = useMemo(() => lessons.filter((l) => (l.kind ?? 'lesson') === kind), [lessons, kind]);
  const current = lessons.find((l) => l.id === openId);
  if (current) return <LessonView lesson={current} onBack={() => setOpenId(null)} />;

  const tabs: [Kind, string][] = [['course', 'lessons.course'], ['lesson', 'lessons.lesson'], ['grammar', 'lessons.grammar']];

  return (
    <>
      <div className="seg">
        {tabs.map(([k, key]) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{t(key)}</button>
        ))}
      </div>

      {loading && !shown.length && <Empty>{t('common.loading')}</Empty>}
      {!loading && !shown.length && <Empty>{t('lessons.empty')}</Empty>}

      {shown.map((l, i) => (
        <button key={l.id} className="card lesson-item" onClick={() => setOpenId(l.id)}>
          <span className={`num${state.lessonsDone[l.id] ? ' ok' : ''}`}>
            {state.lessonsDone[l.id] ? <IconCheck size={16} /> : i + 1}
          </span>
          <div className="grow">
            <b>{l.title}</b>
            <small className="block">
              {l.level}
              {l.phrases.length ? ` · ${l.phrases.length}` : ''}
              {state.lessonScores[l.id] ? ` · ${state.lessonScores[l.id].ok}/${state.lessonScores[l.id].n}` : ''}
            </small>
          </div>
          <span className="chev"><IconNext size={18} /></span>
        </button>
      ))}

      {kind !== 'course' && (
        <section className="card">
          <input className="input" placeholder={t('lessons.topicPlaceholder')} value={topic} onChange={(e) => setTopic(e.target.value)} />
          <GenerateBar
            label={t(kind === 'grammar' ? 'lessons.generateGrammar' : 'lessons.generate')}
            onSettings={onSettings}
            run={async () => ({
              lessons: [await generateLesson({
                provider: state.provider, apiKey: activeKey(state), model: state.model,
                lang, level: state.level, pack, uiLang: state.uiLang || 'fr', topic: topic.trim() || undefined,
              }, kind === 'grammar' ? 'grammar' : undefined)],
            })}
          />
        </section>
      )}
    </>
  );
}

function LessonView({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const { state, update } = useStore();
  const { t } = useT();
  const done = !!state.lessonsDone[lesson.id];
  const [translated, setTranslated] = useState<Phrase[] | null>(null);
  const [busy, setBusy] = useState(false);
  const phrases = translated ?? lesson.phrases;
  const needsTranslation = lesson.phrases.some((p) => p.en);
  const key = activeKey(state);

  const translate = async () => {
    setBusy(true);
    try {
      const lines = await translatePhrases(
        { provider: state.provider, apiKey: key, model: state.model, uiLang: state.uiLang || 'fr' },
        lesson.phrases,
      );
      if (lines.length === lesson.phrases.length) {
        setTranslated(lesson.phrases.map((p, i) => ({ ...p, fr: lines[i] || p.fr, en: false })));
      }
    } catch { /* on garde la version d'origine */ } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn ghost" onClick={onBack} style={{ alignSelf: 'flex-start' }}>‹ {t('common.back')}</button>

      <section className="card lesson-body">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{lesson.title}</h2>
        <small>{lesson.level}</small>
        {lesson.intro && <p>{lesson.intro}</p>}
        {lesson.sections.map((s, i) => (
          <div key={i}>
            <h4>{s.heading}</h4>
            <p>{s.body}</p>
          </div>
        ))}
        {lesson.kind === 'course' && <small>{t('lessons.sourceNote')}</small>}
      </section>

      {phrases.length > 0 && (
        <section className="card">
          <h3>{t('lessons.phrases')} <small>{phrases.length}</small></h3>
          {needsTranslation && !translated && (
            <>
              <small>{t('lessons.partlyEnglish')}</small>
              {key && (
                <button className="btn soft sm" disabled={busy} onClick={translate}>
                  <IconSpark size={16} /> {busy ? t('settings.generating') : t('lessons.translateWithAI')}
                </button>
              )}
            </>
          )}
          {phrases.map((p, i) => (
            <div key={i} className="word">
              <div className="word-main">
                <div className="grow">
                  <b className="term">{p.text}</b>
                  {p.reading && <small className="block">{p.reading}</small>}
                </div>
                <SpeakBtn text={p.text} />
              </div>
              <small className="block">{p.fr}{p.en && <EnTag />}</small>
            </div>
          ))}
        </section>
      )}

      {lesson.quiz.length > 0 && <Quiz lesson={lesson} />}

      <button
        className={done ? 'btn ghost full' : 'btn full'}
        onClick={() => update((s) => {
          const next = { ...s.lessonsDone };
          if (done) delete next[lesson.id]; else next[lesson.id] = true;
          return touchStreak({ ...s, lessonsDone: next });
        })}
      >
        {done ? `✓ ${t('lessons.done')}` : t('lessons.markDone')}
      </button>
    </>
  );
}

function Quiz({ lesson }: { lesson: Lesson }) {
  const { update } = useStore();
  const { t } = useT();
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const pick = (qi: number, ci: number) => {
    if (qi in answers) return;
    const next = { ...answers, [qi]: ci };
    setAnswers(next);
    if (Object.keys(next).length === lesson.quiz.length) {
      const ok = lesson.quiz.filter((q, i) => next[i] === q.answer).length;
      update((s) => touchStreak({
        ...s,
        lessonScores: { ...s.lessonScores, [lesson.id]: { ok, n: lesson.quiz.length, at: Date.now() } },
      }));
    }
  };

  const answered = Object.keys(answers).length;
  const ok = lesson.quiz.filter((q, i) => answers[i] === q.answer).length;

  return (
    <section className="card">
      <h3>{t('lessons.quiz')} {answered === lesson.quiz.length && <small>{ok} / {lesson.quiz.length}</small>}</h3>
      {lesson.quiz.map((q, qi) => (
        <div key={qi} className="stack">
          <p style={{ fontSize: '.93rem', fontWeight: 600 }}>{q.q}</p>
          <div className="choices">
            {q.choices.map((c, ci) => {
              const chosen = answers[qi];
              const state = chosen === undefined ? ''
                : ci === q.answer ? ' ok'
                : ci === chosen ? ' ko' : '';
              return (
                <button key={ci} className={`choice${state}`} disabled={chosen !== undefined} onClick={() => pick(qi, ci)}>{c}</button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
