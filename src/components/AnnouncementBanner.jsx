import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import Dialog from './Dialog.jsx';
import {
  getAnnouncementsCache, getSeenAnnouncements, markAnnouncementSeen,
  setAnnouncementsCache, subscribe,
} from '../lib/storage.js';
import { sanitizeHtml } from '../lib/sanitize.js';
import '../styles/overlays.css';

const FETCH_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const SHOW_DELAY_MS = 600;
// Private pages don't get site announcements.
const QUIET_PATHS = ['/midterm-review', '/select-semester'];

function freshCache() {
  const cache = getAnnouncementsCache();
  return cache && Array.isArray(cache.items) && Date.now() - (cache.t || 0) < CACHE_TTL_MS ? cache.items : null;
}

/* Shows each announcement once per device, newest unseen first. Renders the
   cached list immediately, then refreshes it from /api/announcements. */
export default function AnnouncementBanner() {
  const { pathname } = useLocation();
  const quiet = QUIET_PATHS.includes(pathname);
  const [items, setItems] = useState(() => freshCache() || []);
  const [ready, setReady] = useState(false);
  const seen = useSyncExternalStore(subscribe, getSeenAnnouncements);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    fetch('/api/announcements', { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((list) => {
        if (!Array.isArray(list)) return;
        setAnnouncementsCache(list);
        setItems(list);
      })
      .catch((e) => console.warn('[announcements] fetch failed, using cache:', e.message))
      .finally(() => clearTimeout(timer));
    const showTimer = setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => { ctrl.abort(); clearTimeout(timer); clearTimeout(showTimer); };
  }, []);

  if (quiet || !ready) return null;
  const next = items.find((a) => a?.id && !seen.includes(a.id)); // API order: newest first
  if (!next) return null;

  const dismiss = () => markAnnouncementSeen(next.id);
  return (
    <Dialog onClose={dismiss} labelledBy="ann-title"
            overlayClass="labobo-announce-overlay" modalClass="labobo-announce-modal">
      <div className="labobo-announce-badge">What's new</div>
      <h3 id="ann-title">{next.title}</h3>
      {/* Authored in Supabase with a little inline HTML; filtered to a
          small allowlist before it reaches the DOM. */}
      <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(next.body) }} />
      <div className="labobo-announce-meta">
        <span>{next.pub_date || ''}</span>
        <button className="labobo-announce-btn" type="button" onClick={dismiss}>Got it</button>
      </div>
    </Dialog>
  );
}

