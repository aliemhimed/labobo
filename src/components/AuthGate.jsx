import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import LoginPage from '../pages/LoginPage.jsx';

/* Usually gone within a moment; the text only fades in if it isn't. */
function Splash() {
  return <div className="splash" role="status">Loading</div>;
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
      <div className="center-wrap">
        <div className="state" role="alert">
          <h1>Couldn't load your profile</h1>
          <p>{error.message}</p>
          <div className="state-actions">
            <button className="btn primary" onClick={() => refetch()}>Try again</button>
          </div>
        </div>
      </div>
    );
  }
  if (!profile?.semester && location.pathname !== '/select-semester') {
    return <Navigate to="/select-semester" replace />;
  }
  return children;
}
