import { useContext, useState } from 'react';
import { LockedContext } from '../components/Plan.jsx';
import { openSubscribeDialog, formatMoment } from '../lib/access.js';
import { DAILY_SET_SIZE } from '../lib/daily.js';
import { MIDTERM_LAST, lectureNumber, planSet } from '../lib/utils.js';

/* The free plan's way into the locked lectures: once a day, one practice set
   and one exam of up to 30 questions per subject, from all the locked
   lectures or from one half of the course. Shown on the practice and exam
   setup screens; nothing for students who already read every lecture. */
export default function DailyCard({ config, mode, daily, onStart }) {
  const locked = useContext(LockedContext);
  const [scope, setScope] = useState('all');
  const [busy, setBusy] = useState(false);
  if (!daily?.limited || !locked.length || !onStart) return null;

  const isExam = mode === 'exam';
  const what = isExam ? 'exam' : 'practice set';
  const used = daily.sets?.[mode];

  const half = (l, side) => {
    const n = lectureNumber(l.topic);
    return n !== null && (side === 'before' ? n <= MIDTERM_LAST : n > MIDTERM_LAST);
  };
  const before = locked.filter((l) => half(l, 'before'));
  const after = locked.filter((l) => half(l, 'after'));
  const hasHalves = before.length > 0 && after.length > 0;
  const inScope = scope === 'before' && hasHalves ? before : scope === 'after' && hasHalves ? after : locked;

  // Split the 30 across the parts by the subject's ratio, as a normal set is.
  const pools = {};
  for (const l of inScope) pools[l.subject] = (pools[l.subject] || 0) + l.n;
  const bySubject = planSet(DAILY_SET_SIZE, config.ratio, pools);
  const plan = {};
  for (const src of config.sources) if (bySubject[src.subject]) plan[src.table] = bySubject[src.subject];
  const size = Object.values(plan).reduce((a, b) => a + b, 0);

  async function start() {
    setBusy(true);
    try {
      await onStart({
        scope: hasHalves ? scope : 'all',
        topics: inScope.map((l) => ({ table: l.table, topic: l.raw })),
        plan,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="daily-card" aria-labelledby="daily-title">
      <h2 id="daily-title">Today’s free {what} from the locked lectures</h2>
      {used ? (
        <>
          <p>
            You’ve used today’s free {what} ({used.ids.length} questions). The next one opens{' '}
            {formatMoment(daily.resets_at)}.
          </p>
          <div className="daily-actions">
            <button type="button" className="btn primary" onClick={openSubscribeDialog}>Unlock everything</button>
          </div>
        </>
      ) : (
        <>
          <p>
            Once a day you get one {what} of up to {DAILY_SET_SIZE} questions from the {locked.length} locked
            lectures. The free lectures below stay unlimited.
          </p>
          {hasHalves ? (
            <div className="scope-row" role="group" aria-label="Which locked lectures">
              <button type="button" className="scope-chip" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
                All locked lectures
              </button>
              <button type="button" className="scope-chip" aria-pressed={scope === 'before'} onClick={() => setScope('before')}>
                Midterm (lectures 1 to {MIDTERM_LAST})
              </button>
              <button type="button" className="scope-chip" aria-pressed={scope === 'after'} onClick={() => setScope('after')}>
                After the midterm
              </button>
            </div>
          ) : null}
          <div className="daily-actions">
            <button type="button" className="btn primary" disabled={busy || size === 0} onClick={start}>
              {busy ? 'Drawing your questions…' : `Start (${size} questions)`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
