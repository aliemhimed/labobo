import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import LoginPage from '../pages/LoginPage.jsx';

function Splash() {
  return (
    <div className="container center-wrap">
      <div className="card" style={{ textAlign: 'center', padding: 34 }}>
        <div style={{ fontSize: 38, marginBottom: 10 }}>🐰</div>
        <h2>Loading…</h2>
      </div>
    </div>
  );
}

/** No session -> the login screen. A session -> children. */
export function AuthGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <LoginPage />;
  return children;
}

/** Signed in but hasn't picked a semester yet -> /select-semester, from
    anywhere except that page itself. */
export function SemesterGate({ children }) {
  const location = useLocation();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();

  if (isLoading) return <Splash />;
  if (isError) {
    return (
      <div className="container center-wrap">
        <div className="card" style={{ textAlign: 'center', padding: 34 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>⚠️</div>
          <h2>Couldn't load your profile</h2>
          <p style={{ color: 'var(--text-soft)' }}>{error.message}</p>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => refetch()}>Try again</button>
        </div>
      </div>
    );
  }
  if (!profile?.semester && location.pathname !== '/select-semester') {
    return <Navigate to="/select-semester" replace />;
  }
  return children;
}
