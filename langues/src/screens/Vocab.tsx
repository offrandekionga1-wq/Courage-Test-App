import { useEffect, useMemo, useRef, useState } from 'react';
import { activeKey, isDue, isKnown, review, shuffle, useStore } from '../store';
import { Empty, EnTag, GenerateBar, SearchField, Sentence, SpeakBtn } from '../ui';
import { hasFurigana } from '../ruby';
import { useActive, useT } from '../hooks';
import { useDict } from '../dict';
import { generateWords } from '../generate';
import { IconCheck, IconClose } from '../icons';
import type { Word } from '../types';

type Mode = 'list' | 'cards' | 'write' | 'trace';
const nonLatin = (s: string) => /[^\u0000-ɏḀ-ỿ]/.test(s);

export function Vocab({ onSettings }: { onSettings: () => void }) {
  const { state } = useStore();
  const { t } = useT();
  const { lang, pack, words, loading } = useActive();
  const [mode, setMode] = useState<Mode>('list');
  const hasScript = useMemo(() => words.slice(0, 200).some((w) => nonLatin(w.term)), [words]);

  const tabs: [Mode, string][] = [['list', 'vocab.list'], ['cards', 'vocab.cards'], ['write', 'vocab.write']];
  if (hasScript) tabs.push(['trace', 'vocab.trace']);

  return (
    <>
      <div className="seg">
        {tabs.map(([m, k]) => (
          <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{t(k)}</button>
        ))}
      </div>

      {loading && !words.length && <Empty>{t('common.loading')}</Empty>}
      {!loading && !words.length && <Empty>{t('vocab.empty')}</Empty>}
      {mode === 'list' && words.length > 0 && <List words={words} />}
      {mode === 'cards' && words.length > 0 && <Cards words={words} />}
      {mode === 'write' && words.length > 0 && <Write words={words} />}
      {mode === 'trace' && <Trace words={words.filter((w) => nonLatin(w.term)).slice(0, 300)} />}

      {mode === 'list' && (
        <GenerateBar
          label={t('vocab.generate')}
          onSettings={onSettings}
          run={async () => ({
            words: await generateWords({
              provider: state.provider, apiKey: activeKey(state), model: state.model,
              lang, level: state.level, pack, uiLang: state.uiLang || 'fr',
            }),
          })}
        />
      )}
    </>
  );
}

function WordRow({ w, open, onToggle }: { w: Word; open: boolean; onToggle: () => void }) {
  const { state } = useStore();
  const { locale } = useT();
  const dict = useDict(state.active, locale);
  const isEn = dict?.enGloss.has(w.id);
  return (
    <div className="word" onClick={onToggle}>
      <div className="word-main">
        <span className={`dot${isKnown(state, w.id) ? ' ok' : ''}`} />
        <div className="grow">
          <b className="term">{w.term}</b>
          {w.reading && <small className="block">{w.reading}</small>}
        </div>
        <span className="fr">{w.fr}{isEn && <EnTag />}</span>
        <SpeakBtn text={w.term} />
      </div>
      {open && w.example && (
        <div className="example">
          <span className="row gap">
            <Sentence text={w.example} reading={w.exampleReading} className="grow" />
            <SpeakBtn text={w.exampleReading && hasFurigana(w.exampleReading) ? w.exampleReading : w.example} />
          </span>
          <small>{w.exampleFr}{w.exampleEn && <EnTag />}</small>
        </div>
      )}
    </div>
  );
}

function List({ words }: { words: Word[] }) {
  const { t } = useT();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(80);

  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return words;
    return words.filter((w) =>
      w.term.toLowerCase().includes(needle) || w.fr.toLowerCase().includes(needle) || (w.reading ?? '').toLowerCase().includes(needle));
  }, [words, q]);

  // Les mots arrivent par ordre de fréquence : on les groupe par tranches, du plus courant au plus rare.
  const groups = useMemo(() => {
    const m = new Map<string, Word[]>();
    for (const w of found.slice(0, limit)) m.set(w.theme, [...(m.get(w.theme) ?? []), w]);
    return [...m];
  }, [found, limit]);

  return (
    <>
      <SearchField value={q} onChange={(v) => { setQ(v); setLimit(80); }} placeholder={t('vocab.search')} />
      {!found.length && <Empty>{t('vocab.noResult')}</Empty>}
      {groups.map(([theme, ws]) => (
        <section key={theme} className="card">
          <h3>{theme} <small>{ws.length}</small></h3>
          {ws.map((w) => <WordRow key={w.id} w={w} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)} />)}
        </section>
      ))}
      {found.length > limit && (
        <button className="btn ghost full" onClick={() => setLimit(limit + 200)}>
          {t('vocab.more', { n: (found.length - limit).toLocaleString() })}
        </button>
      )}
    </>
  );
}

/** File de révision : les mots à revoir d'abord, 15 au maximum, figés à l'ouverture. */
function useQueue(words: Word[]) {
  const { state } = useStore();
  const [queue] = useState(() => {
    const due = shuffle(words.filter((w) => isDue(state, w.id)));
    return (due.length ? due : shuffle(words)).slice(0, 15);
  });
  const [i, setI] = useState(0);
  return { word: queue[i] as Word | undefined, i, total: queue.length, next: () => setI((n) => n + 1), restart: () => setI(0) };
}

function Done({ onAgain }: { onAgain: () => void }) {
  const { t } = useT();
  return (
    <section className="card center">
      <div className="big-emoji">🎉</div>
      <h3>{t('vocab.done')}</h3>
      <p className="hint">{t('vocab.doneHint')}</p>
      <button className="btn" onClick={onAgain}>{t('vocab.again')}</button>
    </section>
  );
}

function Cards({ words }: { words: Word[] }) {
  const { update } = useStore();
  const { t } = useT();
  const q = useQueue(words);
  const [shown, setShown] = useState(false);
  if (!q.word) return <Done onAgain={q.restart} />;
  const w = q.word;
  const answer = (ok: boolean) => { update((s) => review(s, w.id, ok)); setShown(false); q.next(); };
  return (
    <>
      <p className="progress">{q.i + 1} / {q.total}</p>
      <section className="card flash" onClick={() => setShown(true)}>
        <b className="term xl">{w.term}</b>
        {w.reading && <small>{w.reading}</small>}
        <SpeakBtn text={w.term} big />
        {shown ? (
          <div className="answer">
            <b>{w.fr}</b>
            {w.example && (
              <p className="hint">
                <Sentence text={w.example} reading={w.exampleReading} /><br />{w.exampleFr}
              </p>
            )}
          </div>
        ) : <small>{t('vocab.show')}</small>}
      </section>
      {shown && (
        <div className="row gap">
          <button className="btn warn grow" onClick={() => answer(false)}><IconClose size={18} />{t('vocab.dontKnow')}</button>
          <button className="btn grow" onClick={() => answer(true)}><IconCheck size={18} />{t('vocab.know')}</button>
        </div>
      )}
    </>
  );
}

function Write({ words }: { words: Word[] }) {
  const { update } = useStore();
  const { t } = useT();
  const q = useQueue(words);
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<null | boolean>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, [q.i]);
  if (!q.word) return <Done onAgain={() => { q.restart(); setValue(''); setVerdict(null); }} />;
  const w = q.word;
  const clean = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:¡¿]/g, '');
  const check = () => {
    const ok = clean(value) === clean(w.term) || clean(value) === clean(w.reading ?? '\u0000');
    setVerdict(ok);
    update((s) => review(s, w.id, ok));
  };
  const next = () => { setValue(''); setVerdict(null); q.next(); };
  return (
    <>
      <p className="progress">{q.i + 1} / {q.total}</p>
      <section className="card">
        <b style={{ fontSize: '1.1rem' }}>{w.fr}</b>
        <small>{t('vocab.typeAnswer')}</small>
        <input
          ref={inputRef} className="input" value={value} autoCapitalize="off" autoCorrect="off" spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (verdict === null ? check() : next()); }}
        />
        {verdict === null
          ? <button className="btn full" disabled={!value.trim()} onClick={check}>{t('vocab.check')}</button>
          : (
            <>
              <p className={`verdict ${verdict ? 'ok' : 'ko'}`}>
                {verdict ? t('vocab.correct') : t('vocab.wrong', { answer: w.term })}
              </p>
              <div className="row gap">
                <SpeakBtn text={w.term} />
                <button className="btn grow" onClick={next}>{t('vocab.next')}</button>
              </div>
            </>
          )}
      </section>
    </>
  );
}

/** Tracé au doigt, pour les écritures non latines : le caractère sert de modèle sous le tracé. */
function Trace({ words }: { words: Word[] }) {
  const { t } = useT();
  const [i, setI] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const w = words[i];

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  };
  useEffect(clear, [i]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('color');
    }
  }, []);

  if (!w) return <Empty>{t('vocab.empty')}</Empty>;

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const p = at(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = at(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const up = () => { drawing.current = false; };

  return (
    <>
      <p className="progress">{i + 1} / {words.length}</p>
      <section className="card center">
        <b className="term xl">{w.term}</b>
        <small>{w.reading} · {w.fr}</small>
        <div className="trace-wrap">
          <div className="ghost-char">{w.term.slice(0, 1)}</div>
          <canvas
            ref={canvasRef} className="trace"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          />
        </div>
        <div className="row gap">
          <button className="btn ghost" onClick={clear}>{t('vocab.clear')}</button>
          <SpeakBtn text={w.term} />
          <button className="btn grow" onClick={() => { setI((n) => (n + 1) % words.length); }}>{t('vocab.next')}</button>
        </div>
      </section>
    </>
  );
}
