function cls(pct) {
  return pct >= 75 ? '' : pct >= 50 ? 'warn' : 'bad';
}

export function Breakdown({ stats }) {
  return (
    <>
      {Object.entries(stats).map(([key, s]) => {
        const pct = s.total > 0 ? Math.round((100 * s.correct) / s.total) : 0;
        return (
          <div key={key} className={'bd-row ' + cls(pct)}>
            <span className="bd-label">
              {key} <small style={{ color: 'var(--text-muted)' }}>({s.correct}/{s.total})</small>
            </span>
            <div className="bd-meter"><div style={{ width: pct + '%' }} /></div>
            <span className="bd-pct">{pct}%</span>
          </div>
        );
      })}
    </>
  );
}

export function TopicBreakdown({ topicStats }) {
  const bySubject = {};
  Object.values(topicStats || {}).forEach((t) => {
    if (!bySubject[t.subject]) bySubject[t.subject] = [];
    bySubject[t.subject].push(t);
  });

  return (
    <>
      {Object.entries(bySubject).map(([subject, topics]) => {
        const sorted = topics
          .slice()
          .sort((a, b) => (a.correct / a.total || 0) - (b.correct / b.total || 0));
        return (
          <div key={subject}>
            <div className="bd-row" style={{ fontWeight: 700, background: 'var(--bg-soft)' }}>
              <span className="bd-label">{subject}</span><span></span><span></span>
            </div>
            {sorted.map((t) => {
              const pct = t.total > 0 ? Math.round((100 * t.correct) / t.total) : 0;
              return (
                <div key={t.topic} className={'bd-row ' + cls(pct)}>
                  <span className="bd-label" style={{ paddingLeft: 14 }}>
                    ↳ {t.topic} <small style={{ color: 'var(--text-muted)' }}>({t.correct}/{t.total})</small>
                  </span>
                  <div className="bd-meter"><div style={{ width: pct + '%' }} /></div>
                  <span className="bd-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
