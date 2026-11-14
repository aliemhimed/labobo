/* The study guides that are on the site (src/lib/guides.json, written by
   study-guides/publish.cjs) and the "Continue reading" note kept on this
   device. The guide text itself is a static file in public/guides/. */
import MANIFEST from './guides.json';

/** { scope, note, parts, guides } for a subject, or null if it has none. */
export function guidesFor(subjectKey) {
  const m = MANIFEST[subjectKey];
  return m && m.guides.length ? m : null;
}

export function findGuide(subjectKey, folder, slug) {
  return guidesFor(subjectKey)?.guides.find((g) => g.folder === folder && g.slug === slug) || null;
}

export async function fetchGuide(subjectKey, guide, signal) {
  const res = await fetch(`/guides/${subjectKey}/${guide.path}.html`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // Only our own fragments: anything else (the app's index.html served for
  // a missing file) means the guide is not there.
  if (!html.trimStart().startsWith('<article class="lb-guide"')) throw new Error('This guide is not available');
  return html;
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
