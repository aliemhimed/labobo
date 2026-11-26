import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import { fetchLiveMe } from '../../lib/live.js';
import '../../styles/live-teach.css';

/* Shows its children only to Labobo Live teachers (and, with `host`, pass holders). Everyone else gets a
   short message; load errors get a retry button. */
export default function TeacherGate({ subtitle = 'Live', host = false, children }) {
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['live-me'], queryFn: fetchLiveMe, staleTime: 60_000 });

  if (isLoading) return <div className="splash" role="status">Loading</div>;

  if (error || !(data?.teacher || (host && data?.can_host))) {
    return (
      <>
        <TopBar subtitle={subtitle} />
        <main id="main" tabIndex={-1} className="lt">
          <div className="lt-state" role={error ? 'alert' : undefined}>
            {error ? (
              <>
                <h1>Could not load this page</h1>
                <p className="lt-sub">{error.message}</p>
                <button type="button" className="btn primary" onClick={() => refetch()}>Try again</button>
              </>
            ) : (
              <>
                <h1>Labobo Live</h1>
                <p className="lt-sub">Teacher accounts only. Ask the Labobo admin to add you.</p>
                <Link className="btn primary" to="/live">Back to Labobo Live</Link>
              </>
            )}
          </div>
        </main>
      </>
    );
  }
  return children;
}
