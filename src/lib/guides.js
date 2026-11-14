/* The study guides that are on the site (src/lib/guides.json, written by
   study-guides/publish.cjs) and the "Continue reading" note kept on this
   device. The guide text comes from /api/guide (netlify/functions/guide.js),
   which applies the same rule as the questions: free lectures for everyone,
   the rest with a pass or trial. */
import MANIFEST from './guides.json';
import { authHeader } from './supabaseClient.js';

/** { scope, note, parts, guides } for a subject, or null if it has none. */
export function guidesFor(subjectKey) {
  const m = MANIFEST[subjectKey];
  return m && m.guides.length ? m : null;
}

export function findGuide(subjectKey, folder, slug) {
  return guidesFor(subjectKey)?.guides.find((g) => g.folder === folder && g.slug === slug) || null;
}

/** The guide's HTML. Throws an Error with `.locked` when it needs a pass. */
export async function fetchGuide(subjectKey, guide, signal) {
  const q = new URLSearchParams({ subject: subjectKey, path: guide.path });
  const res = await fetch(`/api/guide?${q}`, { signal, headers: await authHeader() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.locked = !!data.locked;
    throw err;
  }
  const html = await res.text();
  // Only our own fragments: anything else (the app's index.html served for
  // a missing file) means the guide is not there.
  if (!html.trimStart().startsWith('<article class="lb-guide"')) throw new Error('This guide is not available');
  return html;
}

/** { "<path>": true | false }: which of a subject's guides this student can read. */
export async function fetchGuideAccess(subjectKey, signal) {
  const res = await fetch(`/api/guide?${new URLSearchParams({ subject: subjectKey, list: '1' })}`, { signal, headers: await authHeader() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).open || {};
}

const LAST_KEY = 'labobo-last-guide';

/** { subject, path, title, label, part, y, at } or null. */
export function lastGuide() {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
    return v && v.subject && v.path && findGuide(v.subject, ...v.path.split('/')) ? v : null;
  } catch {
    return null;
  }
}

export function rememberGuide(entry) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ ...entry, at: new Date().toISOString() }));
  } catch { /* storage blocked: "Continue reading" just won't appear */ }
}
