/* The study guides that are on the site and the "Continue reading" note kept
   on this device. Both the list and the guide text come from /api/guide
   (netlify/functions/guide.js), which reads them from the database and
   applies the same rule as the questions: free lectures for everyone, the
   rest with a pass or trial. Nothing about the guides is built into the
   site, so a new guide needs no deploy (study-guides/publish.cjs). */
import { useQuery } from '@tanstack/react-query';
import { authHeader } from './supabaseClient.js';

const CATALOG_KEY = 'labobo-guide-catalog';
export const CATALOG_QUERY = ['guide-catalog'];

/** { "<subject>": { scope, note, parts, guides } } for every subject with guides. */
async function fetchCatalog({ signal }) {
  const res = await fetch('/api/guide?catalog=1', { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const catalog = await res.json();
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); } catch { /* shown after loading next time */ }
  return catalog;
}

function storedCatalog() {
  try {
    const v = JSON.parse(localStorage.getItem(CATALOG_KEY) || 'null');
    return v && typeof v === 'object' ? v : undefined;
  } catch {
    return undefined;
  }
}

/** { catalog, loading }: the guide list, shown from the last visit's copy
    while the fresh one loads. `catalog` is {} until there is one. */
export function useGuideCatalog() {
  const { data, isLoading } = useQuery({
    queryKey: CATALOG_QUERY,
    queryFn: fetchCatalog,
    placeholderData: storedCatalog,
    staleTime: 10 * 60_000,
    retry: 1,
  });
  return { catalog: data || {}, loading: isLoading };
}

/** { scope, note, parts, guides } for a subject, or null if it has none. */
export function guidesFor(catalog, subjectKey) {
  const m = catalog?.[subjectKey];
  return m && m.guides.length ? m : null;
}

export function findGuide(catalog, subjectKey, folder, slug) {
  return guidesFor(catalog, subjectKey)?.guides.find((g) => g.folder === folder && g.slug === slug) || null;
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

/** { subject, path, title, label, part, y, at } or null. The caller checks
    the guide is still on the site (findGuide) once the catalog is there. */
export function lastGuide() {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
    return v && v.subject && typeof v.path === 'string' && v.path.includes('/') ? v : null;
  } catch {
    return null;
  }
}

export function rememberGuide(entry) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ ...entry, at: new Date().toISOString() }));
  } catch { /* storage blocked: "Continue reading" just won't appear */ }
}
