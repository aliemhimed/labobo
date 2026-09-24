import { useEffect, useRef } from 'react';

const SPOKEN = { correct: 'right', wrong: 'wrong', answered: 'answered' };

/* The answer sheet: one numbered bubble per question, filled in as it is
   answered (and marked right or wrong where the mode reveals that). The
   current question carries the eosin ring. `marks[i]` is 'correct' | 'wrong'
   | 'answered' | null. With `onJump` the bubbles navigate; `wrap` lays them
   out in rows instead of one scrolling strip. */
export default function SheetMap({ marks, current = -1, onJump, wrap = false, label = 'Answer sheet' }) {
  const listRef = useRef(null);

  // Keep the current bubble in view inside the strip without scrolling the page.
  useEffect(() => {
    if (wrap || current < 0) return;
    const list = listRef.current;
    const bubble = list?.children[current];
    if (!list || !bubble) return;
    const target = bubble.offsetLeft - list.clientWidth / 2 + bubble.offsetWidth / 2;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ left: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
  }, [current, wrap, marks.length]);

  return (
    <nav className={'sheet-map' + (wrap ? ' wrap' : '')} aria-label={label}>
      <ol ref={listRef}>
        {marks.map((mark, i) => {
          const cls = 'map-bubble' + (mark ? ' ' + mark : '') + (i === current ? ' current' : '');
          const name = `Question ${i + 1}${mark ? ', ' + SPOKEN[mark] : ''}`;
          return (
            <li key={i}>
              {onJump ? (
                <button type="button" className={cls} aria-label={name}
                        aria-current={i === current ? 'step' : undefined}
                        onClick={() => onJump(i)}>
                  {i + 1}
                </button>
              ) : (
                <span className={cls} role="img" aria-label={name}>{i + 1}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* Marks for a live set: right/wrong where feedback is shown, plain
   "answered" in exam mode, where results stay hidden until submit. */
export function liveMarks(answers, qIds, questions, revealCorrectness) {
  return qIds.map((qIdx, i) => {
    const sel = answers[i]?.selected;
    if (sel === null || sel === undefined) return null;
    if (!revealCorrectness) return 'answered';
    return sel === questions[qIdx]?.answer ? 'correct' : 'wrong';
  });
}
