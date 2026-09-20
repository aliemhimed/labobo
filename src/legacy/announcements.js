/* ============================================================
   LABOBO ANNOUNCEMENTS
   ============================================================
   Announcements are now managed from admin.html → Announcements tab.
   They live in the Supabase `announcements` table and are fetched
   at page load from /api/announcements.

   Each user sees each announcement once (tracked in localStorage
   by its id) and never again. Toggle `active=false` from the admin
   UI to hide an announcement without losing its read history.

   Legacy fallback: window.LABOBO_ANNOUNCEMENTS can still be set by
   another script before this file runs (or by editing the array
   below), and those entries will be merged with whatever comes
   back from the API. Leave it empty in production.
   ============================================================ */

window.LABOBO_ANNOUNCEMENTS = window.LABOBO_ANNOUNCEMENTS || [];

(function() {
  const API_URL = '/api/announcements';
  const FETCH_TIMEOUT_MS = 4000;
  const LS_KEY  = 'labobo_seen_announcements';
  const LS_CACHE = 'labobo_announcements_cache_v1';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  function getSeen() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
  }
  function markSeen(id) {
    const seen = getSeen();
    if (!seen.includes(id)) {
      seen.push(id);
      localStorage.setItem(LS_KEY, JSON.stringify(seen));
    }
  }

  function getCache() {
    try {
      const raw = localStorage.getItem(LS_CACHE);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return null;
      if (Date.now() - (parsed.t || 0) > CACHE_TTL_MS) return null;
      return parsed.items;
    } catch { return null; }
  }
  function setCache(items) {
    try {
      localStorage.setItem(LS_CACHE, JSON.stringify({ t: Date.now(), items }));
    } catch { /* quota — ignore */ }
  }

  function injectStyles() {
    if (document.getElementById('labobo-announce-styles')) return;
    const css = `
      .labobo-announce-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        z-index: 4000; display: flex; align-items: center; justify-content: center;
        animation: announceFadeIn 0.25s ease;
        padding: 16px;
        overflow-y: auto;
      }
      @keyframes announceFadeIn { from { opacity: 0; } to { opacity: 1; } }
      .labobo-announce-modal {
        background: var(--surface, #fff); color: var(--text, #111);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 14px;
        padding: 26px 28px;
        width: min(480px, 92vw);
        box-shadow: 0 16px 48px rgba(0,0,0,0.35);
        animation: announceSlideUp 0.3s cubic-bezier(.2,.7,.3,1.2);
        max-height: 85vh;
        max-height: calc(100dvh - 32px);
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      @keyframes announceSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .labobo-announce-badge {
        display: inline-block; font-size: 11px; font-weight: 700;
        letter-spacing: 0.05em; text-transform: uppercase;
        background: var(--brand-soft, #dbeafe); color: var(--brand, #2563eb);
        padding: 4px 10px; border-radius: 999px; margin-bottom: 12px;
        font-family: 'Space Grotesk', system-ui, sans-serif;
      }
      .labobo-announce-modal h3 {
        margin: 0 0 12px; font-size: 18px; font-weight: 700;
        color: var(--text, #111); line-height: 1.35;
      }
      .labobo-announce-modal p {
        margin: 0 0 18px; font-size: 14.5px; line-height: 1.6;
        color: var(--text, #111); opacity: 0.92;
      }
      .labobo-announce-modal strong { font-weight: 700; }
      .labobo-announce-modal a { color: var(--brand, #2563eb); }
      .labobo-announce-meta {
        font-size: 11.5px; color: var(--text-muted, #6b7280);
        margin-top: 14px; padding-top: 12px;
        border-top: 1px solid var(--border, #e5e7eb);
        display: flex; justify-content: space-between; align-items: center;
      }
      .labobo-announce-btn {
        background: var(--brand, #2563eb); color: #fff; border: none;
        padding: 9px 18px; border-radius: 9px;
        font-size: 13.5px; font-weight: 600; cursor: pointer;
        font-family: inherit;
        transition: opacity 0.15s, transform 0.1s;
      }
      .labobo-announce-btn:hover { opacity: 0.9; }
      .labobo-announce-btn:active { transform: scale(0.97); }
    `;
    const style = document.createElement('style');
    style.id = 'labobo-announce-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showAnnouncement(announcement, onClose) {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'labobo-announce-overlay';
    overlay.innerHTML = `
      <div class="labobo-announce-modal" role="dialog" aria-modal="true" aria-labelledby="ann-title">
        <div class="labobo-announce-badge">What's new</div>
        <h3 id="ann-title">${announcement.title}</h3>
        <p>${announcement.body}</p>
        <div class="labobo-announce-meta">
          <span>${announcement.date || ''}</span>
          <button class="labobo-announce-btn" type="button">Got it</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function close() {
      markSeen(announcement.id);
      overlay.style.transition = 'opacity 0.2s';
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.remove(); if (onClose) onClose(); }, 200);
    }
    overlay.querySelector('.labobo-announce-btn').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  function showPending() {
    const seen = getSeen();
    // De-duplicate by id (API takes precedence over any in-page fallback array)
    const byId = new Map();
    for (const a of (window.LABOBO_ANNOUNCEMENTS || [])) {
      if (a && a.id) byId.set(a.id, a);
    }
    const all = [...byId.values()];
    const pending = all.filter(a => !seen.includes(a.id));
    if (pending.length === 0) return;

    let i = 0;
    function next() {
      if (i >= pending.length) return;
      const ann = pending[i++];
      showAnnouncement(ann, next);
    }
    setTimeout(next, 600);
  }

  function mergeIn(items) {
    if (!Array.isArray(items)) return;
    const existing = new Set((window.LABOBO_ANNOUNCEMENTS || []).map(a => a && a.id));
    for (const it of items) {
      if (it && it.id && !existing.has(it.id)) {
        window.LABOBO_ANNOUNCEMENTS.push(it);
      }
    }
  }

  async function fetchAnnouncements() {
    // Optimistic: render anything we have cached immediately, then refresh in background.
    const cached = getCache();
    if (cached && cached.length) {
      mergeIn(cached);
      showPending();
    }

    try {
      const ac = ('AbortController' in window) ? new AbortController() : null;
      const timer = ac ? setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS) : null;
      const res = await fetch(API_URL, ac ? { signal: ac.signal } : {});
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const items = await res.json();
      if (Array.isArray(items)) {
        setCache(items);
        // Only show new pending items if we hadn't already rendered from cache,
        // OR if the API returned an id we didn't have before.
        const before = new Set((window.LABOBO_ANNOUNCEMENTS || []).map(a => a && a.id));
        mergeIn(items);
        const hasNew = items.some(it => it && it.id && !before.has(it.id));
        if (!cached || hasNew) showPending();
      }
    } catch (err) {
      // Network/CORS/timeout — fall back silently to whatever the legacy
      // window.LABOBO_ANNOUNCEMENTS array (or cache) provided.
      if (!cached) showPending();
      // eslint-disable-next-line no-console
      console.warn('[announcements] fetch failed, using cache/fallback:', err && err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAnnouncements);
  } else {
    fetchAnnouncements();
  }
})();
