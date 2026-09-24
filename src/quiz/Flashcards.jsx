import { useCallback, useEffect, useMemo, useState } from 'react';
import { shuffle } from '../lib/utils.js';
import { useTopicKeys } from '../hooks/useTopicKeys.js';
import PageHead from '../components/PageHead.jsx';

const DAY = 86400000;

/* SM-2-ish scheduling, carried over from the vanilla engine. Cards are
   keyed by question id so the schedule survives database edits. */
function grade(card, rating) {
  const c = { ease: 2.3, interval: 0, reps: 0, ...card };
  if (rating === 'again') {
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.interval = 0;
    c.reps = 0;
  } else if (rating === 'good') {
    c.reps += 1;
    c.interval = c.interval ? Math.round(c.interval * c.ease) : 1;
  } else {
    c.ease = Math.min(2.8, c.ease + 0.15);
    c.reps += 1;
    c.interval = c.interval ? Math.round(c.interval * c.ease * 1.3) : 2;
  }
  c.due = Date.now() + Math.max(0, c.interval) * DAY;
  c.last = Date.now();
  return c;
}

export default function Flashcards({
  questions, subjectIndex, store, subjectTitle, started, onStart, onConfig, onHome,
}) {
  const allKeys = useTopicKeys(subjectIndex);

  const [topics, setTopics] = useState(() => new Set(allKeys));
  const [queue, setQueue] = useState([]);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [again, setAgain] = useState(0);
  const [cram, setCram] = useState(false);
  const [total, setTotal] = useState(0);

  const selected = useMemo(() => {
    const out = [];
    Object.keys(subjectIndex).forEach((s) =>
      Object.keys(subjectIndex[s]).forEach((t) => {
        if (topics.has(`${s}::${t}`)) out.push(...subjectIndex[s][t]);
      })
    );
    return out;
  }, [subjectIndex, topics]);

  const dueCount = useMemo(() => {
    const sched = store.getFlashcards();
    const now = Date.now();
    return selected.filter((i) => {
      const c = sched[questions[i]?.id];
      return c && (c.due || 0) <= now;
    }).length;
  }, [selected, store, questions]);

  function start() {
    if (!selected.length) return;
    const sched = store.getFlashcards();
    const now = Date.now();
    const due = [], fresh = [];
    selected.forEach((i) => {
      const c = sched[questions[i]?.id];
      if (!c) fresh.push(i);
      else if ((c.due || 0) <= now) due.push(i);
    });
    let q = shuffle(due).concat(shuffle(fresh).slice(0, 20));
    let isCram = false;
    if (q.length === 0) {
      q = shuffle(selected).slice(0, 30);
      isCram = true;
    }
    setQueue(q);
    setCram(isCram);
    setPos(0);
    setFlipped(false);
    setAgain(0);
    setTotal(q.length);
    onStart();
  }

  const answer = useCallback((rating) => {
    const i = queue[pos];
    const q = questions[i];
    if (q) {
      const sched = store.getFlashcards();
      store.setFlashcards({ ...sched, [q.id]: grade(sched[q.id], rating) });
    }
    if (rating === 'again') {
      setAgain((a) => a + 1);
      setQueue((prev) => [...prev, i]);
    }
    setPos((p) => p + 1);
    setFlipped(false);
  }, [queue, pos, questions, store]);

  /* Space/Enter flips; 1/2/3 grade. */
  useEffect(() => {
    if (!started) return;
    function onKey(e) {
      const ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        if (!flipped && pos < queue.length) { e.preventDefault(); setFlipped(true); }
      } else if (flipped) {
        if (e.key === '1') { e.preventDefault(); answer('again'); }
        else if (e.key === '2') { e.preventDefault(); answer('good'); }
        else if (e.key === '3') { e.preventDefault(); answer('easy'); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [started, flipped, pos, queue.length, answer]);

  /* ── config screen ──────────────────────────────────────────────── */
  if (!started) {
    return (
      <div className="container narrow">
        <PageHead backLabel={subjectTitle} onBack={onHome} title="Flashcards" />
        <p className="lede">
          Choose the topics to study. Rate each card after you see the answer; the ones you find
          hard come back sooner.
        </p>
        <div className="fc-setup">
          <div className="fc-setup-head">
            <p className="fc-count">
              <strong>{selected.length}</strong> card{selected.length !== 1 ? 's' : ''} selected,{' '}
              <strong>{dueCount}</strong> due today
            </p>
            <div className="fc-actions">
              <button type="button" className="btn sm" onClick={() => setTopics(new Set(allKeys))}>Select all</button>
              <button type="button" className="btn sm" onClick={() => setTopics(new Set())}>Clear</button>
            </div>
          </div>
          <div className="fc-topics">
            {Object.keys(subjectIndex).map((s) => {
              const tList = Object.keys(subjectIndex[s]);
              const on = tList.filter((t) => topics.has(`${s}::${t}`)).length;
              return (
                <div key={s} className="fc-subj">
                  <div className="fc-subj-head">
                    <label>
                      <input type="checkbox"
                             checked={on === tList.length && tList.length > 0}
                             ref={(el) => { if (el) el.indeterminate = on > 0 && on < tList.length; }}
                             onChange={(e) => setTopics((prev) => {
                               const next = new Set(prev);
                               tList.forEach((t) => {
                                 if (e.target.checked) next.add(`${s}::${t}`);
                                 else next.delete(`${s}::${t}`);
                               });
                               return next;
                             })} />
                      {' '}{s}
                    </label>
                  </div>
                  {tList.map((t) => {
                    const key = `${s}::${t}`;
                    return (
                      <label key={key} className="fc-topic">
                        <input type="checkbox" checked={topics.has(key)}
                               onChange={(e) => setTopics((prev) => {
                                 const next = new Set(prev);
                                 if (e.target.checked) next.add(key); else next.delete(key);
                                 return next;
                               })} />
                        <span>{t}</span>
                        <span className="fc-n">{subjectIndex[s][t].length}</span>
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <button type="button" className="btn primary lg fc-start"
                disabled={selected.length === 0} onClick={start}>
          Start flashcards
        </button>
      </div>
    );
  }

  /* ── deck complete ──────────────────────────────────────────────── */
  if (!queue.length || pos >= queue.length) {
    return (
      <div className="container narrow">
        <PageHead backLabel="Topics" onBack={onConfig} title="Deck finished" />
        <div className="state">
          <p>
            You went through {total} card{total !== 1 ? 's' : ''}.
            {again ? ` ${again} came back for another look.` : ''}
          </p>
          <div className="state-actions">
            <button type="button" className="btn primary" onClick={start}>Study more</button>
            <button type="button" className="btn" onClick={onConfig}>Change topics</button>
            <button type="button" className="btn ghost" onClick={onHome}>Back to {subjectTitle}</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── card ───────────────────────────────────────────────────────── */
  const q = questions[queue[pos]];
  if (!q) return null;
  const pct = Math.round((100 * pos) / queue.length);
  const tag = (
    <p className="fc-tag"><span className="q-subject">{q.subject}</span><span className="q-topic">{q.topic}</span></p>
  );

  return (
    <div className="container narrow">
      <PageHead backLabel="Topics" onBack={onConfig} title="Flashcards">
        <span className="fc-position">Card {pos + 1} of {queue.length}</span>
      </PageHead>
      {cram ? (
        <p className="config-note fc-cram">Nothing is due yet, so this is an extra round of random cards.</p>
      ) : null}
      <div className="fc-stage">
        <div className="fc-prog"><div style={{ width: pct + '%' }} /></div>
        <div className={'fc-card' + (flipped ? ' flipped' : '')}
             role="button" tabIndex={0}
             aria-label={flipped ? 'Flashcard, answer showing' : 'Flashcard. Press Space or Enter to reveal the answer'}
             onClick={() => { if (!flipped) setFlipped(true); }}>
          <div className="fc-inner">
            <div className="fc-face fc-front" aria-hidden={flipped}>
              {tag}
              <p className="fc-q">{q.q}</p>
            </div>
            <div className="fc-face fc-back" aria-hidden={!flipped} aria-live="polite">
              {tag}
              <p className="fc-a-label">Answer</p>
              <p className="fc-a">{q.options[q.answer]}</p>
              {q.explanation ? <p className="fc-expl">{q.explanation}</p> : null}
            </div>
          </div>
        </div>
        {flipped ? (
          <div className="fc-rate">
            <button type="button" className="again" onClick={() => answer('again')}>Again<small>Show it again soon</small></button>
            <button type="button" className="good" onClick={() => answer('good')}>Good<small>In a few days</small></button>
            <button type="button" className="easy" onClick={() => answer('easy')}>Easy<small>Much later</small></button>
          </div>
        ) : (
          <p className="fc-hint">Tap the card or press <kbd>Space</kbd> to see the answer.</p>
        )}
      </div>
    </div>
  );
}
