const API = '/api/admin';
const PW_KEY = 'labobo_admin_pw';

export const getPassword = () => {
  try { return sessionStorage.getItem(PW_KEY) || ''; } catch { return ''; }
};
export const setPassword = (pw) => {
  try { sessionStorage.setItem(PW_KEY, pw); } catch { /* ignore */ }
};
export const clearPassword = () => {
  try { sessionStorage.removeItem(PW_KEY); } catch { /* ignore */ }
};

export class Unauthorized extends Error {}

export async function apiCall(method, action, opts = {}) {
  const qs = new URLSearchParams({ action, ...(opts.params || {}) }).toString();
  const res = await fetch(`${API}?${qs}`, {
    method,
    headers: {
      'X-Admin-Password': getPassword(),
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    clearPassword();
    throw new Unauthorized('Session expired — unlock again.');
  }
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export function timeAgo(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return '';
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const todayISODate = () => new Date().toISOString().slice(0, 10);

export function suggestId(title) {
  const slug = slugify(title);
  return slug ? `${slug}-${todayISODate().slice(0, 7)}` : '';
}
