/* "Add Labobo to your home screen" support.

   Chrome, Edge and Samsung Internet fire `beforeinstallprompt` once, often
   before React has mounted, so the event is caught here at import time
   (main.jsx imports this first) and handed to whoever asks later. iOS has no
   such event: there the only way is Share -> Add to Home Screen, so callers
   show instructions instead. */

let deferred = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own banner instead of the mini-infobar
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

export function subscribeInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Already running as an installed app (home-screen icon). */
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/** iPhone / iPad, including iPadOS that reports itself as a Mac. */
export function isIos() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1);
}

/** 'prompt' (one-tap install available), 'ios' (show Share instructions) or null. */
export function installMode() {
  if (installed || isStandalone()) return null;
  if (deferred) return 'prompt';
  if (isIos()) return 'ios';
  return null;
}

/** Opens the browser's install dialog. Resolves true if the user accepted. */
export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null; // the event can only be used once
  notify();
  e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === 'accepted';
}
