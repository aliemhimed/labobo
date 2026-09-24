function band(pct) {
  return pct >= 75 ? 'good' : pct >= 50 ? 'warn' : 'bad';
}

function Row({ label, correct, total }) {
  const pct = total > 0 ? Math.round((100 * correct) / total) : 0;
  return (
    <li className={'bd-row ' + band(pct)}>
      <span className="bd-label">
        {label}<span className="bd-frac">{correct} of {total}</span>
      </span>
      <span className="bd-meter" aria-hidden="true"><span style={{ width: pct + '%' }} /></span>
      <span className="bd-pct">{pct}%</span>
    </li>
  );
}

export function Breakdown({ stats }) {
  return (
    <ul className="bd-list">
      {Object.entries(stats).map(([key, s]) => <Row key={key} label={key} correct={s.correct} total={s.total} />)}
    </ul>
  );
}

/* Topics weakest first, grouped under their subject when a set spans several. */
export function TopicBreakdown({ topicStats, showSubjects = true }) {
  const bySubject = {};
  Object.values(topicStats || {}).forEach((t) => {
    if (!bySubject[t.subject]) bySubject[t.subject] = [];
    bySubject[t.subject].push(t);
  });
  const weakestFirst = (a, b) => (a.correct / a.total || 0) - (b.correct / b.total || 0);

  return (
    <>
      {Object.entries(bySubject).map(([subject, topics]) => (
        <div key={subject} className="bd-group">
          {showSubjects ? <h3 className="bd-group-title">{subject}</h3> : null}
          <ul className="bd-list">
            {topics.slice().sort(weakestFirst).map((t) => (
              <Row key={t.topic} label={t.topic} correct={t.correct} total={t.total} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
