/* Service worker: makes Labobo installable and lets the app shell open
   without a connection. Registered from src/main.jsx in production builds.

   - Page loads: network first, so a new deploy shows up immediately; the
     last good index.html is the offline fallback.
   - /assets/*: fingerprinted by Vite, so cache first, forever.
   - Images, memes, theme art: served from cache, refreshed in the background.
   - Everything else (/api/*, Supabase, analytics) is not touched at all:
     answers, scores and sign-in always go to the network.

   Bump VERSION to drop every old cache on the next visit. */

const VERSION = 'v1';
const SHELL = `labobo-shell-${VERSION}`;
const ASSETS = `labobo-assets-${VERSION}`;
const MEDIA = `labobo-media-${VERSION}`;
const KEEP = [SHELL, ASSETS, MEDIA];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.add('/index.html')).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('labobo-') && !KEEP.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put('/index.html', res.clone());
    return res;
  } catch {
    return (await cache.match('/index.html')) || Response.error();
  }
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => hit);
  return hit || fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS));
  } else if (/^\/(images|memes|theme)\//.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, MEDIA));
  }
});

/* ── Daily study reminder (netlify/functions/push-reminders.js) ──────
   The push has no payload; the text lives here. Tapping it opens (or
   focuses) the app on the home page. */
self.addEventListener('push', (event) => {
  event.waitUntil(self.registration.showNotification('Keep your streak going 🔥', {
    body: 'You haven’t studied today yet. Ten questions takes five minutes.',
    icon: '/theme/icon-192.png',
    badge: '/theme/icon-192.png',
    tag: 'labobo-daily',
    renotify: false,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) { await open.focus(); return; }
    await self.clients.openWindow('/');
  })());
});
