/* Small building blocks shared by the admin tabs. */

export const ago = (iso) => {
  if (!iso) return 'never';
  const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
export const pct = (n) => (n === null || n === undefined ? '—' : `${Math.round(n)}%`);
export const num = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString());

export function Stat({ label, value, hint, tone }) {
  return (
    <div className={`adm-stat${tone ? ` ${tone}` : ''}`}>
      <div className="adm-stat-value">{value}</div>
      <div className="adm-stat-label">{label}</div>
      {hint ? <div className="adm-stat-hint">{hint}</div> : null}
    </div>
  );
}

export function Panel({ title, note, error, children, wide }) {
  return (
    <section className={`adm-panel${wide ? ' wide' : ''}`}>
      <h2 className="adm-panel-title">{title}{note ? <span>{note}</span> : null}</h2>
      {error ? <p className="adm-error">Couldn't load this section: {error}</p> : children}
    </section>
  );
}

/* Vertical bars, one per day. `series` is [{ day, n }]. */
export function DayBars({ series, label }) {
  const max = Math.max(1, ...series.map((d) => d.n));
  return (
    <div className="adm-bars" role="img" aria-label={label}>
      {series.map((d) => (
        <div key={d.day} className="adm-bar" title={`${d.day}: ${d.n}`}>
          <i style={{ height: `${Math.max(d.n ? 6 : 2, (d.n / max) * 100)}%` }} className={d.n ? '' : 'zero'} />
          <span>{d.day.slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

/* Horizontal bars for a ranked list of { key|subject, n }. */
export function HBars({ items, labelOf = (i) => i.key, extra }) {
  if (!items.length) return <p className="adm-empty">Nothing yet.</p>;
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <ul className="adm-hbars">
      {items.map((i) => (
        <li key={labelOf(i)}>
          <span className="adm-hbar-label">{labelOf(i)}</span>
          <span className="adm-hbar-track"><i style={{ width: `${(i.n / max) * 100}%` }} /></span>
          <span className="adm-hbar-n">{i.n}{extra ? <em>{extra(i)}</em> : null}</span>
        </li>
      ))}
    </ul>
  );
}

export function Table({ head, children }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* Score-over-time line for a list of { pct }. */
export function Sparkline({ points, label }) {
  if (points.length < 2) return <p className="adm-empty">Not enough quizzes for a trend yet.</p>;
  const W = 300, H = 80, P = 6;
  const xy = points.map((p, i) => [P + (i / (points.length - 1)) * (W - 2 * P), H - P - (p.pct / 100) * (H - 2 * P)]);
  return (
    <svg className="adm-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none">
      <line x1="0" x2={W} y1={H - P - 0.5 * (H - 2 * P)} y2={H - P - 0.5 * (H - 2 * P)} className="adm-spark-mid" />
      <polyline points={xy.map((p) => p.join(',')).join(' ')} className="adm-spark-line" />
      {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" className="adm-spark-dot"><title>{`${Math.round(points[i].pct)}%`}</title></circle>)}
    </svg>
  );
}
