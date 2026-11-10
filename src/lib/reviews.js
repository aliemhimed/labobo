/* Client for /api/reviews (netlify/functions/reviews.js). */
import { authHeader } from './supabaseClient.js';

async function read(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/** Approved reviews, newest first. */
export async function fetchApprovedReviews(signal) {
  return (await read(await fetch('/api/reviews', { signal }))).items || [];
}

/** The signed-in student's own review, or null. */
export async function fetchMyReview(signal) {
  const res = await fetch('/api/reviews?mine=1', { signal, headers: await authHeader() });
  return (await read(res)).review || null;
}

export async function saveMyReview({ rating, body }) {
  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ rating, body }),
  });
  return (await read(res)).review;
}

/* ── When to ask ─────────────────────────────────────────────────────
   The review card first appears on a student's 3rd day using Labobo. Days
   are counted on this device: the days the home page was opened, plus the
   days with saved quiz history (so long-time users don't wait 3 more days). */

const USE_DAYS_KEY = 'labobo.useDays';
const DISMISSED_KEY = 'labobo.review.dismissed';
export const ASK_FROM_DAY = 3;

/* Launch week: until this date every student is asked on their first visit,
   however new they are. After it, only from the 3rd day of use. */
const LAUNCH_UNTIL = new Date('2026-11-17T00:00:00');
export const isReviewLaunch = (now = new Date()) => now < LAUNCH_UNTIL;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** Records today as a day of use and returns how many days are on record. */
export function noteUseDay() {
  try {
    const days = JSON.parse(localStorage.getItem(USE_DAYS_KEY) || '[]');
    const list = Array.isArray(days) ? days : [];
    if (!list.includes(today())) list.push(today());
    const kept = list.slice(-10);
    localStorage.setItem(USE_DAYS_KEY, JSON.stringify(kept));
    return kept.length;
  } catch {
    return 0;
  }
}

export function reviewCardDismissed() {
  try { return !!localStorage.getItem(DISMISSED_KEY); } catch { return false; }
}
export function dismissReviewCard() {
  try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* ignore */ }
}

/* The review dialog can be opened from anywhere (the profile menu, the small
   button on the home page); ReviewDialogHost listens for this. */
const OPEN_EVENT = 'labobo:open-review';
export const openReviewDialog = () => window.dispatchEvent(new Event(OPEN_EVENT));
export function onOpenReviewDialog(cb) {
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
}
