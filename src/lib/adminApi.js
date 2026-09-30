/* Client for /api/admin. Every call carries the signed-in user's token; the
   server only answers admins (see netlify/functions/admin.js). */
import { authHeader } from './supabaseClient.js';

async function request(init, query = '') {
  const res = await fetch(`/api/admin${query}`, { ...init, headers: { ...(await authHeader()), ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const fetchSnapshot = (signal) => request({ signal });
export const fetchIsAdmin = (signal) => request({ signal }, '?view=me');
export const fetchUsers = (signal) => request({ signal }, '?view=users');
export const fetchUser = (id, signal) => request({ signal }, `?user=${encodeURIComponent(id)}`);

export const deleteUser = (id) =>
  request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_user', id }) });

export const fetchQuestions = (signal) => request({ signal }, '?view=questions');

const post = (body) => request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const resolveReports = (ids) => post({ action: 'resolve_reports', ids });
export const reopenReports = (ids) => post({ action: 'reopen_reports', ids });
