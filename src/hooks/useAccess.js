import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth.jsx';
import { fetchAccess } from '../lib/access.js';

/** The signed-in student's plan, as /api/access describes it:
    { locked, lock_start, access: 'open'|'pass'|'trial'|'none', expires_at, trial }.
    `data` is undefined while loading and when the endpoint isn't there
    (plain `vite dev`); callers then show no plan UI at all, which is also
    how the app looked before subscriptions. Refetched every few minutes so a
    pass switched on from the admin dashboard, or a trial running out, shows
    up without a reload. */
export function useAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['access', user?.id],
    enabled: !!user,
    queryFn: ({ signal }) => fetchAccess(signal),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
