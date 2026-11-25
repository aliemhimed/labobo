/* Sends crashes students hit to /api/client-error (admin → Errors tab), so a
   bug on someone's phone doesn't stay invisible. Production builds only.

   - Each distinct message is sent once per page load, and at most 10 in all.
   - Errors from browser extensions and other sites' scripts are skipped:
     they aren't ours to fix and would drown the real ones. */
import { authHeader } from './supabaseClient.js';

const MAX_PER_LOAD = 10;
const sent = new Set();
const RELEASE = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '';

const NOISE = [
  /ResizeObserver loop/i,
  /Script error\.?$/i,              // cross-origin script, no details
  /Load failed|Failed to fetch|NetworkError/i, // offline; not a bug
  /AbortError|The user aborted/i,
];

function fromOurCode(stack) {
  if (!stack) return true;
  return !/(chrome|moz|safari(-web)?)-extension:\/\//.test(stack);
}

export async function reportError(kind, error) {
  if (!import.meta.env.PROD) return;
  const message = String(error?.message || error || '').slice(0, 500);
  const stack = error?.stack ? String(error.stack) : '';
  if (!message || NOISE.some((re) => re.test(message)) || !fromOurCode(stack)) return;
  if (sent.has(message) || sent.size >= MAX_PER_LOAD) return;
  sent.add(message);
  try {
    let headers = { 'Content-Type': 'application/json' };
    try { headers = { ...headers, ...(await authHeader()) }; } catch { /* signed out */ }
    await fetch('/api/client-error', {
      method: 'POST',
      headers,
      keepalive: true,
      body: JSON.stringify({ kind, message, stack: stack.slice(0, 4000), url: location.pathname, release: RELEASE }),
    });
  } catch { /* reporting must never throw */ }
}

export function installErrorReporting() {
  window.addEventListener('error', (e) => {
    // Resource load failures (a missing image) have no error object.
    if (e.error || e.message) reportError('error', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', (e) => reportError('rejection', e.reason));
}
