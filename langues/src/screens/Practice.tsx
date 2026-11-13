import { useEffect, useMemo, useState } from 'react';
import { review, shuffle, touchStreak, useStore } from '../store';
import { Empty, Sentence, SpeakBtn } from '../ui';
import { readingWorthShowing } from '../ruby';
import { useActive, useT } from '../hooks';
import { IconCheck } from '../icons';
import type { Lesson, Verb, Word } from '../types';

/** Une question d'exercice, quelle que soit son origine. */
interface Question {
  key: string;
  prompt: string;
  /** Lu à voix haute, s'il y a lieu. */
  say?: string;
  reading?: string;
  choices: string[];
  answer: number;
  /** Mot concerné, pour mettre à jour la répétition espacée. */
  wordId?: string;
}

const uniq = (list: string[]) => [...new Set(list)];

/** Questions bâties sur les leçons terminées, les mots vus et les verbes de la langue. */
function buildQuestions(opts: {
  lessons: Lesson[];
  words: Word[];
  verbs: Verb[];
  doneIds: Record<string, true>;
  seenWord: (id: string) => boolean;
  limit: number;
}): Question[] {
  const { lessons, words, verbs, doneIds, seenWord, limit } = opts;
  const out: Question[] = [];

  // 1. Les quiz des leçons terminées, repris tels quels.
  for (const l of lessons) {
    if (!doneIds[l.id]) continue;
    for (const [i, q] of l.quiz.entries()) {
      out.push({ key: `${l.id}:q${i}`, prompt: q.q, choices: q.choices, answer: q.answer });
    }
    // 2. Les phrases de ces leçons : reconnaître la traduction.
    const pool = l.phrases.filter((p) => p.text && p.fr);
    for (const [i, p] of pool.entries()) {
      const others = uniq(pool.filter((x) => x !== p && x.fr !== p.fr).map((x) => x.fr)).slice(0, 8);
      if (others.length < 3) break;
      const choices = shuffle([p.fr, ...shuffle(others).slice(0, 3)]);
      out.push({
        key: `${l.id}:p${i}`, prompt: p.text, say: p.reading ?? p.text, reading: p.reading,
        choices, answer: choices.indexOf(p.fr),
      });
    }
  }

  // 3. Les mots déjà rencontrés, à revoir.
  // Les mots dont la définition n'existe qu'en anglais ne servent pas de question quand la langue
  // de l'apprenant en a assez d'autres.
  const native = words.filter((w) => !w.fallback);
  const pool = native.length >= 50 ? native : words;
  const seen = pool.filter((w) => seenWord(w.id));
  const source = seen.length >= 8 ? seen : pool.slice(0, 200);
  const due = shuffle(source).slice(0, 40);
  for (const w of due) {
    const others = uniq(shuffle(source).filter((x) => x.id !== w.id && x.fr !== w.fr).map((x) => x.fr)).slice(0, 3);
    if (others.length < 3) break;
    const choices = shuffle([w.fr, ...others]);
    out.push({
      key: `w:${w.id}`, prompt: w.term, say: w.term, reading: w.reading,
      choices, answer: choices.indexOf(w.fr), wordId: w.id,
    });
  }

  // 4. Un peu de conjugaison, si la langue en a.
  for (const v of shuffle(verbs).slice(0, 10)) {
    const tense = v.tenses[Math.floor(Math.random() * v.tenses.length)];
    if (!tense || tense.forms.length < 4) continue;
    const idx = Math.floor(Math.random() * tense.forms.length);
    const good = tense.forms[idx];
    const others = uniq(tense.forms.filter((_, i) => i !== idx).map((f) => f.form)).filter((f) => f !== good.form).slice(0, 3);
    if (others.length < 3) continue;
    const choices = shuffle([good.form, ...others]);
    out.push({
      key: `v:${v.id}:${tense.name}:${idx}`,
      prompt: `${v.infinitive} — ${tense.name}, ${good.label}`,
      choices, answer: choices.indexOf(good.form),
    });
  }

  return shuffle(out).slice(0, limit);
}

export function Practice({ go }: { go: (t: 'lessons') => void }) {
  const { state, update } = useStore();
  const { t } = useT();
  const { lessons, words, verbs, loading } = useActive();
  const [run, setRun] = useState(0);
  const [lessonId, setLessonId] = useState<string | null>(null);

  const doneLessons = useMemo(() => lessons.filter((l) => state.lessonsDone[l.id]), [lessons, state.lessonsDone]);

  // La série est figée au moment où elle commence : répondre met à jour la répétition espacée,
  // et recalculer les questions à ce moment-là remplaçait la question en cours par une autre,
  // qui héritait du choix déjà fait.
  const ready = !loading && (words.length > 0 || lessons.length > 0);
  const [series, setSeries] = useState<{ key: string; questions: Question[] }>({ key: '', questions: [] });
  const seriesKey = `${state.active}:${lessonId ?? 'mix'}:${run}:${ready}`;
  useEffect(() => {
    if (!ready) return;
    setSeries({
      key: seriesKey,
      questions: buildQuestions({
        lessons: lessonId ? lessons.filter((l) => l.id === lessonId) : lessons,
        words: lessonId ? [] : words,
        verbs: lessonId ? [] : verbs,
        doneIds: lessonId ? { [lessonId]: true } : state.lessonsDone,
        seenWord: (id) => !!state.srs[id],
        limit: 12,
      }),
    });
    // Volontairement limité à la clé de série : voir plus haut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey]);
  const questions = series.key === seriesKey ? series.questions : [];

  if (loading || (ready && series.key !== seriesKey)) return <Empty>{t('common.loading')}</Empty>;

  if (!doneLessons.length && !Object.keys(state.srs).length) {
    return (
      <section className="card center">
        <h3>{t('practice.title')}</h3>
        <p className="hint">{t('practice.needLesson')}</p>
        <button className="btn" onClick={() => go('lessons')}>{t('practice.goLessons')}</button>
      </section>
    );
  }

  if (!questions.length) {
    return (
      <section className="card center">
        <p className="hint">{t('practice.needLesson')}</p>
        <button className="btn" onClick={() => go('lessons')}>{t('practice.goLessons')}</button>
      </section>
    );
  }

  return (
    <Quiz
      key={`${lessonId ?? 'mix'}:${run}`}
      questions={questions}
      title={lessonId ? t('practice.fromLesson', { title: lessons.find((l) => l.id === lessonId)?.title ?? '' }) : t('practice.mixed')}
      onWord={(id, ok) => update((s) => review(s, id, ok))}
      onDone={() => update(touchStreak)}
      onRestart={() => setRun((n) => n + 1)}
      picker={(
        <select className="input" value={lessonId ?? ''} onChange={(e) => { setLessonId(e.target.value || null); setRun((n) => n + 1); }}>
          <option value="">{t('practice.mixed')}</option>
          {doneLessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      )}
    />
  );
}

function Quiz({ questions, title, picker, onWord, onDone, onRestart }: {
  questions: Question[];
  title: string;
  picker: React.ReactNode;
  onWord: (id: string, ok: boolean) => void;
  onDone: () => void;
  onRestart: () => void;
}) {
  const { t } = useT();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [ok, setOk] = useState(0);

  if (i >= questions.length) {
    return (
      <>
        {picker}
        <section className="card center">
          <div className="big-emoji">{ok === questions.length ? '🏆' : '✓'}</div>
          <h3>{t('practice.result', { ok, n: questions.length })}</h3>
          <button className="btn" onClick={() => { setI(0); setPicked(null); setOk(0); onRestart(); }}>{t('practice.retry')}</button>
        </section>
      </>
    );
  }

  const q = questions[i];
  const done = picked !== null;
  const answer = (ci: number) => {
    setPicked(ci);
    const good = ci === q.answer;
    if (good) setOk((n) => n + 1);
    if (q.wordId) onWord(q.wordId, good);
  };
  const next = () => {
    if (i + 1 >= questions.length) onDone();
    setPicked(null);
    setI(i + 1);
  };

  return (
    <>
      {picker}
      <p className="progress">{title} · {t('practice.question', { i: i + 1, n: questions.length })}</p>
      <section className="card flash">
        <Sentence text={q.prompt} reading={q.reading} className="term" />
        {readingWorthShowing(q.prompt, q.reading) && <small>{q.reading}</small>}
        {q.say && <SpeakBtn text={q.say} big />}
      </section>
      <section className="choices">
        {q.choices.map((c, ci) => (
          <button
            key={ci}
            className={`choice${done && ci === q.answer ? ' ok' : ''}${done && ci === picked && ci !== q.answer ? ' ko' : ''}`}
            disabled={done}
            onClick={() => answer(ci)}
          >{c}</button>
        ))}
      </section>
      {done && (
        <button className="btn full" onClick={next}>
          <IconCheck size={18} /> {t('vocab.next')}
        </button>
      )}
    </>
  );
}
