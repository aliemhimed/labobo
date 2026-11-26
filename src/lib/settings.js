/* The student's display preferences (profile menu -> Settings).

   Saved in this browser so they work signed out and apply before anything
   draws, and copied to the account (Supabase auth user_metadata.settings)
   so they follow the student to another phone. No table or function: the
   student's own session can write its metadata.

   On sign-in the account's copy wins, if it has one; otherwise this
   browser's choices are uploaded. After that, every change is saved to both.

   Theme is not here: it keeps its own key and toggle (lib/theme.js), and
   the Settings dialog just shows it alongside these. */
import { useSyncExternalStore } from 'react';
import { supabase } from './supabaseClient.js';

const KEY = 'labobo.settings';
const CHANGE = 'labobo:settings';

export const DEFAULTS = Object.freeze({
  reactions: 'often', // 'often' | 'sometimes' | 'off' — the cat reaction popups
  motion: 'device',   // 'device' (follow the phone's setting) | 'reduce'
});

const ALLOWED = {
  reactions: ['often', 'sometimes', 'off'],
  motion: ['device', 'reduce'],
};

/* Chance of a reaction popup per answer (MemePopup). 'often' is the rate
   the site always used. */
export const REACTION_CHANCE = { often: 0.35, sometimes: 0.15, off: 0 };

/** Only known keys with allowed values; anything else falls back to the default. */
function clean(raw) {
  const out = { ...DEFAULTS };
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(ALLOWED)) {
      if (ALLOWED[k].includes(raw[k])) out[k] = raw[k];
    }
  }
  return out;
}

const same = (a, b) => Object.keys(ALLOWED).every((k) => a[k] === b[k]);
const isDefault = (s) => same(s, DEFAULTS);

function load() {
  try { return clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return { ...DEFAULTS }; }
}

let current = load();

function store(next) {
  current = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* full or blocked */ }
  apply();
  window.dispatchEvent(new Event(CHANGE));
}

/** Reduce motion turns the whole page's animations off (base.css). */
function apply() {
  document.documentElement.classList.toggle('reduce-motion', current.motion === 'reduce');
}

export const getSettings = () => current;

/** True when animations should be skipped: the student chose it, or their device asks for it. */
export function prefersReducedMotion() {
  return current.motion === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function upload(settings) {
  const { error } = await supabase.auth.updateUser({ data: { settings } });
  if (error) console.warn('[settings] not saved to the account:', error.message);
}

let signedIn = false;

export function setSetting(key, value) {
  if (!ALLOWED[key]?.includes(value) || current[key] === value) return;
  const next = { ...current, [key]: value };
  store(next);
  if (signedIn) upload(next);
}

/* Takes the account's copy on sign-in (or uploads ours if it has none). */
function syncFromUser(user) {
  signedIn = !!user;
  if (!user) return;
  const saved = user.user_metadata?.settings;
  if (saved) {
    const theirs = clean(saved);
    if (!same(theirs, current)) store(theirs);
  } else if (!isDefault(current)) {
    upload(current);
  }
}

/** Call once at start-up, before the first render. */
export function initSettings() {
  apply();
  supabase.auth.getSession().then(({ data }) => syncFromUser(data.session?.user ?? null));
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') syncFromUser(session?.user ?? null);
  });
  // Another tab changed them.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    current = load();
    apply();
    window.dispatchEvent(new Event(CHANGE));
  });
}

function subscribe(cb) {
  window.addEventListener(CHANGE, cb);
  return () => window.removeEventListener(CHANGE, cb);
}

/** The current settings, re-rendering when they change. */
export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings);
}

/* The dialog is opened from the profile menu and drawn by SettingsDialogHost (App.jsx). */
const OPEN_EVENT = 'labobo:open-settings';
export const openSettingsDialog = () => window.dispatchEvent(new Event(OPEN_EVENT));
export function onOpenSettingsDialog(cb) {
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
}
