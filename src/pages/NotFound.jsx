import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="center-wrap">
      <div className="state">
        <h1>This page doesn't exist</h1>
        <p>The link may be old or mistyped.</p>
        <div className="state-actions">
          <Link className="btn primary" to="/">Go to your subjects</Link>
        </div>
      </div>
    </div>
  );
}
