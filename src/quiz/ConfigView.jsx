import { useState } from 'react';
import PageHead from '../components/PageHead.jsx';
import { LockedNote, LockedTopics } from '../components/Plan.jsx';
import { lectureNumber, planSet } from '../lib/utils.js';

const LEADERBOARD_LENGTH = 30;
/* The midterm covers the first seven lectures (weeks 1 to 7); the banks
   number what comes after it from 8, or from week 10. Topics without a
   number (past papers, cases) belong to neither half. */
const MIDTERM_LAST = 7;
// Each part's chips take a card colour, in the same order as study mode.
const CHIP_FILLS = ['blue', 'mint', 'orange', 'violet', 'coral', 'yellow'];

const topicOf = (key) => key.slice(key.indexOf('::') + 2);
const sum = (list) => list.reduce((n, x) => n + x, 0);

/* Setting up a practice set or an exam: which lectures it draws from, and
   how many questions. `chosen` is the Set of "Subject::Topic" keys in play,
   `allKeys` every key the student has; `onChoose(set | null)` changes it
   (null = all lectures, including any that appear later). */
export default function ConfigView({
  config, mode, subjectIndex, chosen, allKeys, onChoose, examLength, setExamLength, onStart, onHome,
}) {
  const isExam = mode === 'exam';
  const [open, setOpen] = useState(false);

  const before = allKeys.filter((k) => { const n = lectureNumber(topicOf(k)); return n !== null && n <= MIDTERM_LAST; });
  const after = allKeys.filter((k) => { const n = lectureNumber(topicOf(k)); return n !== null && n > MIDTERM_LAST; });
  // The two halves are only offered where the subject has lectures on both sides.
  const hasHalves = before.length > 0 && after.length > 0;
  const isAll = chosen.size === allKeys.length;
  const exactly = (keys) => keys.length === chosen.size && keys.every((k) => chosen.has(k));
  const preset = isAll ? 'all' : hasHalves && exactly(before) ? 'before' : hasHalves && exactly(after) ? 'after' : 'custom';

  const choose = (set) => onChoose(set.size === allKeys.length ? null : set);
  /* Changes are applied to the latest selection, not the one this render
     saw, so two quick taps both count. */
  const change = (edit) => onChoose((prev) => {
    const next = new Set(prev ? allKeys.filter((k) => prev.has(k)) : allKeys);
    edit(next);
    return next.size === allKeys.length ? null : next;
  });
  function toggle(key, on) {
    change((next) => { if (on) next.add(key); else next.delete(key); });
  }
  function toggleSubject(subject, on) {
    change((next) => {
      Object.keys(subjectIndex[subject]).forEach((t) => {
        if (on) next.add(`${subject}::${t}`); else next.delete(`${subject}::${t}`);
      });
    });
  }

  // What the chosen lectures can supply, and the set that comes out of it.
  const pools = {};
  Object.keys(config.ratio).forEach((s) => {
    pools[s] = sum(Object.keys(subjectIndex[s] || {}).map((t) => (chosen.has(`${s}::${t}`) ? subjectIndex[s][t].length : 0)));
  });
  const available = sum(Object.values(pools));
  const plan = planSet(examLength, config.ratio, pools);
  const setSize = sum(Object.values(plan));
  const parts = Object.entries(plan).filter(([, n]) => n > 0);
  const split = Object.keys(config.ratio).length > 1 && parts.length
    ? parts.map(([s, n]) => `${s} ${n}`).join(', ')
    : '';

  return (
    <div className="container narrow">
      <PageHead backLabel={config.title.replace(/ MCQ$/, '')} onBack={onHome}
                title={isExam ? 'Exam' : 'Practice set'} />
      <p className="lede">
        {isExam
          ? 'Answers and explanations stay hidden until you submit. There is no timer, you can move freely between questions, and an answer can’t be changed once chosen.'
          : 'You see the answer and explanation after every question. There is no timer, and your score is saved to your history.'}
      </p>

      <fieldset className="count-picker">
        <legend>Lectures</legend>
        <div className="scope-row">
          <button type="button" className="scope-chip" aria-pressed={preset === 'all'} onClick={() => onChoose(null)}>
            All lectures
          </button>
          {hasHalves ? (
            <>
              <button type="button" className="scope-chip" aria-pressed={preset === 'before'}
                      onClick={() => choose(new Set(before))}>
                Midterm (lectures 1 to {MIDTERM_LAST})
              </button>
              <button type="button" className="scope-chip" aria-pressed={preset === 'after'}
                      onClick={() => choose(new Set(after))}>
                After the midterm
              </button>
            </>
          ) : null}
          <button type="button" className="scope-chip" aria-pressed={preset === 'custom'} aria-expanded={open}
                  aria-controls="config-topics" onClick={() => setOpen((o) => !o)}>
            Choose lectures
          </button>
        </div>
        <p className="config-note" role="status">
          {chosen.size === 0
            ? 'No lectures chosen. Pick at least one to start.'
            : `${chosen.size} of ${allKeys.length} lecture${allKeys.length === 1 ? '' : 's'}, ${available.toLocaleString()} question${available === 1 ? '' : 's'}.`}
        </p>

        {open ? (
          <div id="config-topics" className="sf-panel">
            <div className="sf-panel-actions">
              <button type="button" onClick={() => onChoose(null)}>Select all</button>
              <button type="button" onClick={() => choose(new Set())}>Clear</button>
            </div>
            {Object.keys(subjectIndex).map((subject, si) => {
              const topics = subjectIndex[subject];
              const keys = Object.keys(topics);
              const onCount = keys.filter((t) => chosen.has(`${subject}::${t}`)).length;
              const allOn = onCount === keys.length;
              return (
                <div key={subject} className={'sf-group fill-' + CHIP_FILLS[si % CHIP_FILLS.length]}>
                  <button type="button" className={'sf-subject' + (allOn ? ' on' : onCount ? ' some' : '')}
                          aria-pressed={allOn} onClick={() => toggleSubject(subject, !allOn)}>
                    <span className="sf-dot" aria-hidden="true" />
                    {subject}
                    <span className="sf-count">{onCount} of {keys.length} lectures</span>
                  </button>
                  <div className="sf-chips">
                    {keys.map((topic) => {
                      const key = `${subject}::${topic}`;
                      const on = chosen.has(key);
                      return (
                        <button type="button" key={key} className={'sf-chip' + (on ? ' on' : '')}
                                aria-pressed={on} onClick={() => toggle(key, !on)}>
                          {topic}
                          <span className="sf-n">{topics[topic].length}</span>
                        </button>
                      );
                    })}
                    <LockedTopics subject={subject} />
                  </div>
                </div>
              );
            })}
            <LockedNote />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="count-picker">
        <legend>Number of questions</legend>
        <div className="count-bubbles">
          {config.examLengths.map((n) => (
            <button type="button" key={n} className="count-bubble"
                    aria-pressed={n === examLength} onClick={() => setExamLength(n)}>
              {n}
            </button>
          ))}
        </div>
        {setSize > 0 && setSize < examLength ? (
          <p className="config-note">
            The lectures you chose have {available.toLocaleString()} question{available === 1 ? '' : 's'}, so
            this set will have {setSize}.
          </p>
        ) : null}
        {split ? <p className="config-note">Split by subject: {split}.</p> : null}
        {isExam && examLength === LEADERBOARD_LENGTH && setSize === LEADERBOARD_LENGTH ? (
          <p className="config-note">
            {isAll
              ? `A ${LEADERBOARD_LENGTH}-question exam on all lectures counts toward the weekly leaderboard.`
              : 'An exam on chosen lectures does not count toward the weekly leaderboard. Pick All lectures to compete.'}
          </p>
        ) : null}
      </fieldset>

      <button type="button" className="btn primary lg config-start" disabled={setSize === 0} onClick={onStart}>
        {isExam ? 'Start exam' : 'Start practice'}
      </button>
    </div>
  );
}
