/* The daily study reminder, browser side: asks for notification permission,
   subscribes this browser to web push and tells /api/push which hour to
   remind at. See netlify/functions/push.js and push-reminders.js.

   Works in Chrome, Edge, Firefox and Samsung Internet, and on iPhone only
   once Labobo is added to the home screen (iOS 16.4+). */
import { authHeader } from './supabaseClient.js';

const HOUR_KEY = 'labobo.reminderHour';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

export const savedHour = () => {
  const n = Number(localStorage.getItem(HOUR_KEY));
  return Number.isInteger(n) && n >= 0 && n <= 23 && localStorage.getItem(HOUR_KEY) !== null ? n : 19;
};

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) || null;
}

/** The current subscription, or null. */
export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

function keyBytes(b64url) {
  const s = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function api(method, body) {
  const res = await fetch('/api/push', {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

/** Turns the reminder on (or changes its hour). Throws with a message the
    student can read. */
export async function enableReminder(hour) {
  if (!pushSupported()) throw new Error('This browser can’t show reminders.');
  const reg = await registration();
  if (!reg) throw new Error('Reload the page once, then try again.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them for this site in your browser settings.');
  const { publicKey } = await api('GET');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tbilisi';
  await api('POST', { subscription: sub.toJSON(), hour, tz });
  try { localStorage.setItem(HOUR_KEY, String(hour)); } catch { /* ignore */ }
}

export async function disableReminder() {
  const sub = await currentSubscription();
  if (!sub) return;
  await api('DELETE', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
