import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

/* Banners posted from the admin dashboard (netlify/functions/announcements.js).
   Shown to everyone, or only to one semester; a student can close one and it
   stays closed on this device. */

const DISMISSED_KEY = 'labobo.announcements.dismissed';

function readDismissed() {
  try {
    const v = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

async function fetchLive(signal) {
  const res = await fetch('/api/announcements', { signal });
  if (!res.ok) throw new Error(`announcements ${res.status}`);
  return (await res.json()).items || [];
}

const TONE_LABEL = { info: 'Announcement', warning: 'Heads up', success: 'Good news' };

export default function AnnouncementBanner({ semester }) {
  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: ({ signal }) => fetchLive(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const [dismissed, setDismissed] = useState(readDismissed);

  const items = (data || []).filter((a) => (!a.semester || a.semester === semester) && !dismissed.includes(a.id));
  if (!items.length) return null;

  function close(id) {
    // Keep the list short: ids only grow, so the newest 50 are plenty.
    const next = [...dismissed, id].slice(-50);
    setDismissed(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  return (
    <div className="announcements">
      {items.map((a) => (
        <div key={a.id} className={`announcement ${a.tone}`} role="status">
          <p>
            <b>{TONE_LABEL[a.tone] || TONE_LABEL.info}</b>
            {a.message}
          </p>
          <button type="button" className="announcement-close" onClick={() => close(a.id)} aria-label="Dismiss announcement">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
