import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container center-wrap">
      <div className="card" style={{ textAlign: 'center', padding: 34 }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>🧭</div>
        <h2>Page not found</h2>
        <p style={{ color: 'var(--text-soft)' }}>That link doesn't lead anywhere on Labobo.</p>
        <div style={{ marginTop: 16 }}>
          <Link className="btn primary" to="/">Back to subjects</Link>
        </div>
      </div>
    </div>
  );
}
