import { useMemo } from 'react';
import PageHead from '../components/PageHead.jsx';
import { useHistory, useWrong } from '../hooks/useStore.js';
import { Breakdown } from './Breakdown.jsx';
import { fmtDate, scoreClass } from '../lib/utils.js';

export default function Dashboard({ store, subjectTitle, onHome, onOpen }) {
  const hist = useHistory(store);
  const wrongMap = useWrong(store);
  const { wrong, avg, totalAnswered, bySubj, worst } = useMemo(() => {
    const wrong = Object.keys(wrongMap).length;
    let totalAnswered = 0, totalCorrect = 0;
    const bySubj = {};
    hist.forEach((r) => {
      totalAnswered += r.questionCount;
      totalCorrect += r.correct;
      Object.entries(r.subjectStats || {}).forEach(([s, st]) => {
        if (!bySubj[s]) bySubj[s] = { correct: 0, total: 0 };
        bySubj[s].correct += st.correct;
        bySubj[s].total += st.total;
      });
    });
    const avg = totalAnswered > 0 ? Math.round((100 * totalCorrect) / totalAnswered) : 0;

    let worst = null, worstPct = 101;
    Object.entries(bySubj).forEach(([s, st]) => {
      const p = st.total ? Math.round((100 * st.correct) / st.total) : 0;
      if (p < worstPct && st.total >= 5) { worstPct = p; worst = s; }
    });
    return { wrong, avg, totalAnswered, bySubj, worst };
  }, [hist, wrongMap]);

  // Per-subject figures only say something when a set spans several banks.
  const multiSubject = Object.keys(bySubj).length > 1;

  return (
    <div className="container">
      <PageHead backLabel={subjectTitle} onBack={onHome} title="Performance" />

      {hist.length === 0 ? (
        <div className="state">
          <p>Finish a practice set or an exam and your results will appear here.</p>
        </div>
      ) : (
        <>
          <dl className="figures">
            <div className="figure"><dt>Sessions</dt><dd>{hist.length}</dd></div>
            <div className="figure">
              <dt>Average score</dt><dd className={'score-' + scoreClass(avg)}>{avg}%</dd>
            </div>
            <div className="figure"><dt>Questions answered</dt><dd>{totalAnswered.toLocaleString()}</dd></div>
            <div className="figure"><dt>In your wrong-answer list</dt><dd>{wrong}</dd></div>
            {multiSubject && worst ? (
              <div className="figure"><dt>Weakest subject</dt><dd className="figure-text">{worst}</dd></div>
            ) : null}
          </dl>

          {multiSubject ? (
            <section className="bd-section" aria-labelledby="dash-subject-title">
              <h2 id="dash-subject-title" className="section-title">Accuracy by subject, all sessions</h2>
              <Breakdown stats={bySubj} />
            </section>
          ) : null}

          <section className="bd-section" aria-labelledby="dash-history-title">
            <h2 id="dash-history-title" className="section-title">History</h2>
            <div className={'history' + (multiSubject ? ' with-subjects' : '')}>
              <div className="history-row header" aria-hidden="true">
                <span>Date</span><span>Type</span><span className="ht-num">Questions</span>
                {multiSubject ? <span className="ht-subjects">By subject</span> : null}
                <span className="ht-score">Score</span>
              </div>
              {hist.map((r) => (
                <button type="button" key={r.id} className="history-row" onClick={() => onOpen(r)}
                        aria-label={`Open the ${r.type === 'exam' ? 'exam' : 'practice set'} from ${fmtDate(r.date)}, score ${r.score}%`}>
                  <span>{fmtDate(r.date)}</span>
                  <span className={'ht-type' + (r.type === 'exam' ? ' exam' : '')}>
                    {r.type === 'exam' ? 'Exam' : 'Practice'}
                  </span>
                  <span className="ht-num">{r.questionCount}</span>
                  {multiSubject ? (
                    <span className="ht-subjects">
                      {Object.entries(r.subjectStats || {}).map(([s, st]) => `${s} ${st.correct}/${st.total}`).join(', ')}
                    </span>
                  ) : null}
                  <span className={'ht-score score-' + scoreClass(r.score)}>{r.score}%</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
