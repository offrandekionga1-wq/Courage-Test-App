import { useEffect, useMemo, useRef, useState } from 'react';
import { isDue, isKnown, review, shuffle, useStore } from '../store';
import { Empty, GenerateBar, SpeakBtn, useActive } from '../ui';
import { generateWords } from '../claude';
import type { Word } from '../types';

type Mode = 'list' | 'cards' | 'write' | 'trace';
const nonLatin = (s: string) => /[^\u0000-ɏḀ-ỿ]/.test(s);

export function Vocab({ onSettings }: { onSettings: () => void }) {
  const { state } = useStore();
  const { lang, pack, words } = useActive();
  const [mode, setMode] = useState<Mode>('list');
  const hasScript = words.some((w) => nonLatin(w.term));

  return (
    <>
      <div className="seg">
        <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>Liste</button>
        <button className={mode === 'cards' ? 'on' : ''} onClick={() => setMode('cards')}>Cartes</button>
        <button className={mode === 'write' ? 'on' : ''} onClick={() => setMode('write')}>Écrire</button>
        {hasScript && <button className={mode === 'trace' ? 'on' : ''} onClick={() => setMode('trace')}>Tracer</button>}
      </div>

      {!words.length && <Empty>Aucun mot pour cette langue. Générez-en avec Claude ci-dessous.</Empty>}
      {mode === 'list' && <List words={words} />}
      {mode === 'cards' && words.length > 0 && <Cards words={words} />}
      {mode === 'write' && words.length > 0 && <Write words={words} />}
      {mode === 'trace' && <Trace words={words.filter((w) => nonLatin(w.term))} />}

      {mode === 'list' && (
        <GenerateBar
          label="Nouveaux mots avec Claude"
          onSettings={onSettings}
          run={async () => ({ words: await generateWords({ apiKey: state.apiKey, model: state.model, lang, level: state.level, pack }) })}
        />
      )}
    </>
  );
}

function List({ words }: { words: Word[] }) {
  const { state } = useStore();
  const themes = useMemo(() => {
    const m = new Map<string, Word[]>();
    words.forEach((w) => m.set(w.theme, [...(m.get(w.theme) ?? []), w]));
    return [...m];
  }, [words]);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      {themes.map(([theme, ws]) => (
        <section key={theme} className="card">
          <h3>{theme} <small>{ws.length}</small></h3>
          {ws.map((w) => (
            <div key={w.id} className="word" onClick={() => setOpen(open === w.id ? null : w.id)}>
              <div className="word-main">
                <span className={`dot${isKnown(state, w.id) ? ' ok' : ''}`} />
                <div className="grow">
                  <b className="term">{w.term}</b>
                  {w.reading && <small>{w.reading}</small>}
                </div>
                <span className="fr">{w.fr}</span>
                <SpeakBtn text={w.term} />
              </div>
              {open === w.id && w.example && (
                <div className="example">
                  <span>{w.example} <SpeakBtn text={w.example} /></span>
                  <small>{w.exampleFr}</small>
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function useQueue(words: Word[]) {
  const { state } = useStore();
  // La file est figée à l'ouverture : les mots à revoir d'abord, 15 au maximum.
  const [queue] = useState(() => {
    const due = shuffle(words.filter((w) => isDue(state, w.id)));
    return (due.length ? due : shuffle(words)).slice(0, 15);
  });
  const [i, setI] = useState(0);
  return { word: queue[i] as Word | undefined, i, total: queue.length, next: () => setI((n) => n + 1), restart: () => setI(0) };
}

function Done({ onAgain }: { onAgain: () => void }) {
  return (
    <section className="card center">
      <div className="big-emoji">🎉</div>
      <h3>Série terminée</h3>
      <p className="hint">Les mots reviendront au bon moment grâce à la répétition espacée.</p>
      <button className="btn" onClick={onAgain}>Recommencer</button>
    </section>
  );
}

function Cards({ words }: { words: Word[] }) {
  const { update } = useStore();
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
            {w.example && <p>{w.example}<br /><small>{w.exampleFr}</small></p>}
          </div>
        ) : <p className="hint">Touchez pour voir la traduction</p>}
      </section>
      {shown && (
        <div className="row gap">
          <button className="btn warn grow" onClick={() => answer(false)}>À revoir</button>
          <button className="btn grow" onClick={() => answer(true)}>Je savais</button>
        </div>
      )}
    </>
  );
}

const clean = (s: string) => s.toLowerCase().normalize('NFC').replace(/\(.*?\)/g, '').replace(/[.!?¿¡,;:'’\-\s]/g, '');
function accepted(w: Word): string[] {
  const alts = [w.term, ...(w.reading ? w.reading.split('·') : [])];
  return alts.map(clean).filter(Boolean);
}

function Write({ words }: { words: Word[] }) {
  const { update } = useStore();
  const q = useQueue(words);
  const [val, setVal] = useState('');
  const [res, setRes] = useState<null | boolean>(null);
  if (!q.word) return <Done onAgain={q.restart} />;
  const w = q.word;
  const check = () => {
    if (res !== null) { setRes(null); setVal(''); q.next(); return; }
    const ok = accepted(w).includes(clean(val));
    setRes(ok);
    update((s) => review(s, w.id, ok));
  };
  return (
    <>
      <p className="progress">{q.i + 1} / {q.total}</p>
      <section className="card center">
        <p className="hint">Écrivez dans la langue étudiée</p>
        <b className="xl">{w.fr}</b>
        <input
          className="input" autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false}
          value={val} placeholder="Votre réponse" disabled={res !== null}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && check()}
        />
        {res !== null && (
          <div className={`verdict ${res ? 'ok' : 'ko'}`}>
            {res ? 'Correct !' : 'Réponse attendue :'}
            <b className="term"> {w.term}</b> {w.reading && <small>{w.reading}</small>} <SpeakBtn text={w.term} />
          </div>
        )}
        <button className="btn" onClick={check}>{res === null ? 'Vérifier' : 'Suivant'}</button>
      </section>
    </>
  );
}

function Trace({ words }: { words: Word[] }) {
  const [i, setI] = useState(0);
  const [guide, setGuide] = useState(true);
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const w = words[i % Math.max(words.length, 1)];

  const clear = () => {
    const c = ref.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
  };
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const size = c.clientWidth;
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(c).color;
  }, [i]);

  if (!w) return <Empty>Aucun mot à tracer.</Empty>;
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent) => {
    drawing.current = true;
    ref.current!.setPointerCapture(e.pointerId);
    const ctx = ref.current!.getContext('2d')!;
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext('2d')!;
    const [x, y] = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const go = (d: number) => { setI((n) => (n + d + words.length) % words.length); };
  const len = [...w.term].length;

  return (
    <>
      <section className="card center">
        <div className="row between full">
          <div className="left"><b>{w.fr}</b>{w.reading && <small> · {w.reading}</small>}</div>
          <SpeakBtn text={w.term} />
        </div>
        <div className="trace">
          {guide && <span className="guide" style={{ fontSize: `min(${78 / len}vw, ${380 / len}px)` }}>{w.term}</span>}
          <canvas
            ref={ref} onPointerDown={down} onPointerMove={move}
            onPointerUp={() => (drawing.current = false)} onPointerCancel={() => (drawing.current = false)}
          />
        </div>
        <div className="row gap full">
          <button className="btn ghost grow" onClick={() => go(-1)}>‹</button>
          <button className="btn ghost grow" onClick={clear}>Effacer</button>
          <button className="btn ghost grow" onClick={() => setGuide((g) => !g)}>{guide ? 'Cacher' : 'Modèle'}</button>
          <button className="btn ghost grow" onClick={() => go(1)}>›</button>
        </div>
      </section>
      <p className="hint center">Repassez sur le modèle avec le doigt, puis essayez sans.</p>
    </>
  );
}
