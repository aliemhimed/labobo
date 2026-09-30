/* Client for /api/admin. Every call carries the signed-in user's token; the
   server only answers admins (see netlify/functions/admin.js). Reads also
   send this browser's time zone, so charts, "today" and streaks use the
   admin's own calendar days. */
import { authHeader } from './supabaseClient.js';

export const TIME_ZONE = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
})();

async function send(init, query = '') {
  const sep = query ? '&' : '?';
  return fetch(`/api/admin${query}${sep}tz=${encodeURIComponent(TIME_ZONE)}`, {
    ...init,
    headers: { ...(await authHeader()), ...(init?.headers || {}) },
  });
}

async function fail(res) {
  const data = await res.json().catch(() => ({}));
  const err = new Error(data.error || `HTTP ${res.status}`);
  err.status = res.status;
  throw err;
}

async function request(init, query = '') {
  const res = await send(init, query);
  if (!res.ok) return fail(res);
  return res.json().catch(() => ({}));
}

export const fetchSnapshot = (signal) => request({ signal });
export const fetchIsAdmin = (signal) => request({ signal }, '?view=me');
export const fetchUsers = (signal) => request({ signal }, '?view=users');
export const fetchUser = (id, signal) => request({ signal }, `?user=${encodeURIComponent(id)}`);
export const fetchQuestions = (signal) => request({ signal }, '?view=questions');
export const fetchAnnouncements = (signal) => request({ signal }, '?view=announcements');
export const fetchLog = (signal) => request({ signal }, '?view=log');

const post = (body) => request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const deleteUser = (id) => post({ action: 'delete_user', id });
export const resolveReports = (ids) => post({ action: 'resolve_reports', ids });
export const reopenReports = (ids) => post({ action: 'reopen_reports', ids });
export const createAnnouncement = (a) => post({ action: 'create_announcement', ...a });
export const endAnnouncement = (id) => post({ action: 'end_announcement', id });

/** Downloads every student as a CSV file (the server logs the export). */
export async function downloadStudentsCsv() {
  const res = await send({}, '?view=users_csv');
  if (!res.ok) return fail(res);
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'labobo-students.csv';
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
